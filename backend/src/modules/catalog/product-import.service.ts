import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { ProductStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { generateUniqueSlug } from './utils/slug.util';

/** One row of the import spreadsheet, keyed by the header row exactly as documented
 * in the admin-facing template (see generateTemplate() below). Cell values come back
 * from `xlsx` as string or number depending on how the source cell was typed — every
 * field here is read defensively via the str()/parseNumber()/parseBoolean() helpers. */
export interface ParsedRow {
  productSku?: unknown;
  productName?: unknown;
  categorySlug?: unknown;
  originName?: unknown;
  certCodes?: unknown;
  basePrice?: unknown;
  moq?: unknown;
  hsCode?: unknown;
  shortDescription?: unknown;
  fullDescription?: unknown;
  isOrganic?: unknown;
  isFeatured?: unknown;
  status?: unknown;
  variantSku?: unknown;
  weightLabel?: unknown;
  packagingLabel?: unknown;
  gradeLabel?: unknown;
  variantPrice?: unknown;
}

export interface ImportIssue {
  row: number;
  message: string;
}

export interface ImportResult {
  productsCreated: number;
  productsUpdated: number;
  variantsCreated: number;
  variantsUpdated: number;
  errors: ImportIssue[];
  warnings: ImportIssue[];
}

const TEMPLATE_HEADERS = [
  'productSku',
  'productName',
  'categorySlug',
  'originName',
  'certCodes',
  'basePrice',
  'moq',
  'hsCode',
  'shortDescription',
  'fullDescription',
  'isOrganic',
  'isFeatured',
  'status',
  'variantSku',
  'weightLabel',
  'packagingLabel',
  'gradeLabel',
  'variantPrice',
] as const;

interface ValidVariantRow {
  rowNum: number;
  sku: string;
  price: number;
  weightLabel?: string;
  packagingLabel?: string;
  gradeLabel?: string;
}

interface GroupOutcome {
  created: boolean;
  variantsCreated: number;
  variantsUpdated: number;
}

/**
 * Self-service CSV/Excel bulk product import for the admin panel. Mirrors the
 * flattening convention Shopify's product CSV export uses: one row per variant,
 * grouped by `productSku`. See ROADMAP.md / catalog-admin.controller.ts for how
 * this plugs into `POST admin/catalog/products/import`.
 *
 * Product-level columns (everything except variantSku/weightLabel/packagingLabel/
 * gradeLabel/variantPrice) are read once, from the FIRST row seen for a given
 * productSku — later rows may repeat or blank them out, both are fine, later
 * values are always ignored. On update-in-place (re-importing a corrected file),
 * every product-level scalar is set from that first row's parsed value (blank
 * text -> null, blank checkbox -> false) — i.e. the file's data replaces the
 * product's field values outright, the simplest mental model for an admin
 * re-uploading a file. The one deliberate exception is `slug`, which is only
 * generated on create and never touched on update, so existing product URLs /
 * SEO never change just because a name was tweaked in a re-import.
 */
@Injectable()
export class ProductImportService {
  constructor(private readonly prisma: PrismaService) {}

  parseFile(buffer: Buffer): ParsedRow[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) return [];
    const sheet = workbook.Sheets[firstSheetName];
    return XLSX.utils.sheet_to_json<ParsedRow>(sheet, { defval: '' });
  }

  generateTemplate(): Buffer {
    const rows: Record<string, string | number | boolean>[] = [
      {
        productSku: 'DEMO-CASHEW-001',
        productName: 'Demo Roasted Cashew Nut',
        categorySlug: 'cashew',
        originName: 'Binh Phuoc Cashew Region',
        certCodes: 'HACCP;ISO22000',
        basePrice: 120000,
        moq: '1 ton',
        hsCode: '080131',
        shortDescription: 'Premium roasted cashew nut, export grade.',
        fullDescription: 'Full product description goes here.',
        isOrganic: 'false',
        isFeatured: 'true',
        status: 'ACTIVE',
        variantSku: 'DEMO-CASHEW-001-500G',
        weightLabel: '500g',
        packagingLabel: 'Vacuum Bag',
        gradeLabel: 'W320',
        variantPrice: 120000,
      },
      {
        // Second variant of the SAME product: productSku repeats, but productName/
        // categorySlug/basePrice are left blank since they're only read from the
        // first row of the group (a common spreadsheet habit, per design).
        productSku: 'DEMO-CASHEW-001',
        productName: '',
        categorySlug: '',
        originName: '',
        certCodes: '',
        basePrice: '',
        moq: '',
        hsCode: '',
        shortDescription: '',
        fullDescription: '',
        isOrganic: '',
        isFeatured: '',
        status: '',
        variantSku: 'DEMO-CASHEW-001-1KG',
        weightLabel: '1kg',
        packagingLabel: 'Vacuum Bag',
        gradeLabel: 'W320',
        variantPrice: 220000,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(rows, { header: [...TEMPLATE_HEADERS] });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  async import(buffer: Buffer): Promise<ImportResult> {
    const rows = this.parseFile(buffer);
    const errors: ImportIssue[] = [];
    const warnings: ImportIssue[] = [];

    // Group rows by productSku, preserving first-seen order (Map iteration order
    // follows insertion order in JS). A row with no productSku can't join any
    // group and is skipped as an error against its own row number.
    const groups = new Map<string, { rowNum: number; data: ParsedRow }[]>();
    rows.forEach((data, idx) => {
      const rowNum = idx + 2; // header occupies spreadsheet row 1
      const sku = this.str(data.productSku);
      if (!sku) {
        errors.push({ row: rowNum, message: 'productSku is required' });
        return;
      }
      const bucket = groups.get(sku);
      if (bucket) {
        bucket.push({ rowNum, data });
      } else {
        groups.set(sku, [{ rowNum, data }]);
      }
    });

    let productsCreated = 0;
    let productsUpdated = 0;
    let variantsCreated = 0;
    let variantsUpdated = 0;

    for (const [productSku, groupRows] of groups) {
      try {
        const outcome = await this.importProductGroup(productSku, groupRows, errors, warnings);
        if (!outcome) continue; // product-level validation failed; error already recorded
        if (outcome.created) productsCreated += 1;
        else productsUpdated += 1;
        variantsCreated += outcome.variantsCreated;
        variantsUpdated += outcome.variantsUpdated;
      } catch (err) {
        // A single bad group (e.g. an unexpected DB constraint failure) must never
        // 500 the whole import — record it and keep processing the rest of the file.
        errors.push({
          row: groupRows[0].rowNum,
          message: `Unexpected error importing product "${productSku}": ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    return { productsCreated, productsUpdated, variantsCreated, variantsUpdated, errors, warnings };
  }

  // ---------- Internals ----------

  private async importProductGroup(
    sku: string,
    groupRows: { rowNum: number; data: ParsedRow }[],
    errors: ImportIssue[],
    warnings: ImportIssue[],
  ): Promise<GroupOutcome | null> {
    const first = groupRows[0];
    const d = first.data;

    const name = this.str(d.productName);
    if (!name) {
      errors.push({ row: first.rowNum, message: 'productName is required (on the first row for this productSku)' });
      return null;
    }

    const categorySlug = this.str(d.categorySlug);
    if (!categorySlug) {
      errors.push({ row: first.rowNum, message: 'categorySlug is required (on the first row for this productSku)' });
      return null;
    }
    const category = await this.prisma.category.findUnique({ where: { slug: categorySlug } });
    if (!category) {
      errors.push({ row: first.rowNum, message: `Unknown categorySlug "${categorySlug}"` });
      return null;
    }

    const basePrice = this.parseNumber(d.basePrice);
    if (basePrice === null) {
      errors.push({ row: first.rowNum, message: `basePrice "${this.str(d.basePrice)}" is required and must be numeric` });
      return null;
    }

    // Origin: optional, resolved case-insensitively. Never auto-created — an
    // admin-facing import shouldn't silently grow the taxonomy from a typo.
    let originId: string | null = null;
    const originName = this.str(d.originName);
    if (originName) {
      const origin = await this.prisma.origin.findFirst({
        where: { name: { equals: originName, mode: 'insensitive' } },
      });
      if (origin) {
        originId = origin.id;
      } else {
        warnings.push({
          row: first.rowNum,
          message: `Origin "${originName}" not found; product saved without an origin`,
        });
      }
    }

    // Certifications: semicolon-separated codes; unknown codes warn and are skipped.
    const certificationIds: string[] = [];
    const certCodesRaw = this.str(d.certCodes);
    if (certCodesRaw) {
      const codes = certCodesRaw
        .split(';')
        .map((c) => c.trim())
        .filter(Boolean);
      for (const code of codes) {
        // eslint-disable-next-line no-await-in-loop
        const cert = await this.prisma.certification.findUnique({ where: { code } });
        if (cert) {
          certificationIds.push(cert.id);
        } else {
          warnings.push({ row: first.rowNum, message: `Unknown certification code "${code}"; skipped` });
        }
      }
    }

    const status = this.parseStatus(d.status, first.rowNum, warnings);
    const isOrganic = this.parseBoolean(d.isOrganic);
    const isFeatured = this.parseBoolean(d.isFeatured);
    const shortDescription = this.str(d.shortDescription) || null;
    const fullDescription = this.str(d.fullDescription) || null;
    const moq = this.str(d.moq) || null;
    const hsCode = this.str(d.hsCode) || null;

    // Variant rows: validated across the WHOLE group (every row sharing this
    // productSku), not just the first row.
    const validVariants: ValidVariantRow[] = [];
    for (const { rowNum, data } of groupRows) {
      const variantSku = this.str(data.variantSku);
      if (!variantSku) {
        errors.push({ row: rowNum, message: 'variantSku is required' });
        continue;
      }
      const variantPrice = this.parseNumber(data.variantPrice);
      if (variantPrice === null) {
        errors.push({ row: rowNum, message: `variantPrice "${this.str(data.variantPrice)}" is required and must be numeric` });
        continue;
      }
      validVariants.push({
        rowNum,
        sku: variantSku,
        price: variantPrice,
        weightLabel: this.str(data.weightLabel) || undefined,
        packagingLabel: this.str(data.packagingLabel) || undefined,
        gradeLabel: this.str(data.gradeLabel) || undefined,
      });
    }

    if (!validVariants.length) {
      errors.push({ row: first.rowNum, message: `Product "${sku}" has no valid variant rows; nothing was imported for it` });
      return null;
    }

    const existing = await this.prisma.product.findUnique({ where: { sku } });

    if (!existing) {
      const slug = await generateUniqueSlug(name, async (candidate) => {
        const clash = await this.prisma.product.findUnique({ where: { slug: candidate } });
        return !!clash;
      });

      await this.prisma.product.create({
        data: {
          sku,
          name,
          slug,
          status,
          categoryId: category.id,
          originId,
          shortDescription,
          fullDescription,
          moq,
          hsCode,
          isOrganic,
          isFeatured,
          basePrice,
          variants: {
            create: validVariants.map((v) => ({
              sku: v.sku,
              weightLabel: v.weightLabel,
              packagingLabel: v.packagingLabel,
              gradeLabel: v.gradeLabel,
              price: v.price,
            })),
          },
          certifications: certificationIds.length
            ? { create: certificationIds.map((certificationId) => ({ certificationId })) }
            : undefined,
        },
      });

      return { created: true, variantsCreated: validVariants.length, variantsUpdated: 0 };
    }

    // Existing product: update-in-place, then upsert each variant individually by
    // sku (mirrors ProductsService.update()'s intent, but keyed by sku rather than
    // id since an import file never carries internal variant ids).
    await this.prisma.product.update({
      where: { id: existing.id },
      data: {
        name,
        status,
        categoryId: category.id,
        originId,
        shortDescription,
        fullDescription,
        moq,
        hsCode,
        isOrganic,
        isFeatured,
        basePrice,
      },
    });

    if (certCodesRaw) {
      await this.prisma.productCertification.deleteMany({
        where: { productId: existing.id, certificationId: { notIn: certificationIds } },
      });
      if (certificationIds.length) {
        await this.prisma.productCertification.createMany({
          data: certificationIds.map((certificationId) => ({ productId: existing.id, certificationId })),
          skipDuplicates: true,
        });
      }
    }

    let groupVariantsCreated = 0;
    let groupVariantsUpdated = 0;
    for (const v of validVariants) {
      // eslint-disable-next-line no-await-in-loop
      const existingVariant = await this.prisma.productVariant.findUnique({ where: { sku: v.sku } });
      if (existingVariant) {
        if (existingVariant.productId !== existing.id) {
          errors.push({
            row: v.rowNum,
            message: `variantSku "${v.sku}" already belongs to a different product; skipped`,
          });
          continue;
        }
        // eslint-disable-next-line no-await-in-loop
        await this.prisma.productVariant.update({
          where: { id: existingVariant.id },
          data: {
            price: v.price,
            weightLabel: v.weightLabel,
            packagingLabel: v.packagingLabel,
            gradeLabel: v.gradeLabel,
          },
        });
        groupVariantsUpdated += 1;
      } else {
        // eslint-disable-next-line no-await-in-loop
        await this.prisma.productVariant.create({
          data: {
            productId: existing.id,
            sku: v.sku,
            price: v.price,
            weightLabel: v.weightLabel,
            packagingLabel: v.packagingLabel,
            gradeLabel: v.gradeLabel,
          },
        });
        groupVariantsCreated += 1;
      }
    }

    return { created: false, variantsCreated: groupVariantsCreated, variantsUpdated: groupVariantsUpdated };
  }

  private str(value: unknown): string {
    if (value === undefined || value === null) return '';
    return String(value).trim();
  }

  private parseNumber(value: unknown): number | null {
    const s = this.str(value);
    if (!s) return null;
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    return n;
  }

  private parseBoolean(value: unknown): boolean {
    return this.str(value).toLowerCase() === 'true';
  }

  private parseStatus(value: unknown, rowNum: number, warnings: ImportIssue[]): ProductStatus {
    const s = this.str(value).toUpperCase();
    if (!s) return ProductStatus.ACTIVE;
    if (s === ProductStatus.ACTIVE || s === ProductStatus.DRAFT) {
      return s as ProductStatus;
    }
    warnings.push({ row: rowNum, message: `Unknown status "${this.str(value)}"; defaulting to ACTIVE` });
    return ProductStatus.ACTIVE;
  }
}
