import * as XLSX from 'xlsx';
import { ProductImportService } from './product-import.service';
import { PrismaService } from '../../common/prisma/prisma.service';

/** Builds a real .xlsx buffer from row objects, the same way an admin's spreadsheet
 * export would look — so these tests exercise the actual `xlsx` parse path via
 * ProductImportService.parseFile(), not a mocked-out substitute for it. */
function buildXlsxBuffer(rows: Record<string, string | number>[]): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

const BLANK_ROW = {
  productSku: '',
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
  variantSku: '',
  weightLabel: '',
  packagingLabel: '',
  gradeLabel: '',
  variantPrice: '',
};

/** A minimal in-memory fake of the slice of PrismaService this service touches —
 * realistic enough that a second import() call against the same instance sees the
 * product/variant rows the first call created, which is what the re-import
 * (update, not duplicate) test needs. */
function createPrismaMock() {
  let idCounter = 0;
  const nextId = (prefix: string) => `${prefix}-${++idCounter}`;

  const categories = new Map<string, { id: string; slug: string }>();
  const origins: { id: string; name: string }[] = [];
  const certifications = new Map<string, { id: string; code: string }>();
  const productsBySku = new Map<string, any>();
  const productsById = new Map<string, any>();
  const variantsBySku = new Map<string, any>();
  const productCertifications: { productId: string; certificationId: string }[] = [];

  const prisma = {
    category: {
      findUnique: jest.fn(async ({ where }: any) => categories.get(where.slug) ?? null),
    },
    origin: {
      findFirst: jest.fn(async ({ where }: any) => {
        const name = String(where.name.equals).toLowerCase();
        return origins.find((o) => o.name.toLowerCase() === name) ?? null;
      }),
    },
    certification: {
      findUnique: jest.fn(async ({ where }: any) => certifications.get(where.code) ?? null),
      findMany: jest.fn(async ({ where }: any) => {
        const codes: string[] = where.code?.in ?? [];
        return codes.map((code) => certifications.get(code)).filter(Boolean);
      }),
    },
    product: {
      findUnique: jest.fn(async ({ where }: any) => {
        if (where.sku !== undefined) return productsBySku.get(where.sku) ?? null;
        if (where.slug !== undefined) {
          for (const p of productsBySku.values()) {
            if (p.slug === where.slug) return p;
          }
          return null;
        }
        return null;
      }),
      create: jest.fn(async ({ data }: any) => {
        const id = nextId('prod');
        const { variants: variantsInput, certifications: certsInput, ...scalars } = data;
        const product = { id, ...scalars };
        productsBySku.set(product.sku, product);
        productsById.set(id, product);
        if (variantsInput?.create) {
          for (const v of variantsInput.create) {
            const vid = nextId('var');
            variantsBySku.set(v.sku, { id: vid, productId: id, ...v });
          }
        }
        if (certsInput?.create) {
          for (const c of certsInput.create) {
            productCertifications.push({ productId: id, certificationId: c.certificationId });
          }
        }
        return product;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const product = productsById.get(where.id);
        Object.assign(product, data);
        return product;
      }),
    },
    productVariant: {
      findUnique: jest.fn(async ({ where }: any) => variantsBySku.get(where.sku) ?? null),
      findMany: jest.fn(async ({ where }: any) => {
        const skus: string[] = where.sku?.in ?? [];
        return skus.map((sku) => variantsBySku.get(sku)).filter(Boolean);
      }),
      create: jest.fn(async ({ data }: any) => {
        const id = nextId('var');
        const variant = { id, ...data };
        variantsBySku.set(variant.sku, variant);
        return variant;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const variant = [...variantsBySku.values()].find((v) => v.id === where.id);
        Object.assign(variant, data);
        return variant;
      }),
    },
    productCertification: {
      deleteMany: jest.fn(async ({ where }: any) => {
        const notIn: string[] = where.certificationId?.notIn ?? [];
        for (let i = productCertifications.length - 1; i >= 0; i -= 1) {
          const pc = productCertifications[i];
          if (pc.productId === where.productId && notIn.includes(pc.certificationId) === false) {
            productCertifications.splice(i, 1);
          }
        }
      }),
      createMany: jest.fn(async ({ data }: any) => {
        productCertifications.push(...data);
      }),
    },
  } as any;

  // The update-in-place path wraps its writes in $transaction; this fake just invokes the
  // callback with the same in-memory `prisma` object standing in for the transaction client
  // (matching the `$transaction: jest.fn((cb) => cb(prisma))` idiom used elsewhere in this
  // codebase's tests), since there's no real DB here to actually isolate a transaction against.
  prisma.$transaction = jest.fn(async (cb: any) => cb(prisma));

  return { prisma, categories, origins, certifications, productsBySku, variantsBySku, productCertifications };
}

describe('ProductImportService', () => {
  let mock: ReturnType<typeof createPrismaMock>;
  let service: ProductImportService;

  beforeEach(() => {
    mock = createPrismaMock();
    mock.categories.set('nuts', { id: 'cat-nuts', slug: 'nuts' });
    service = new ProductImportService(mock.prisma as unknown as PrismaService);
  });

  it('creates 1 product with 2 variants from a 2-row file sharing one productSku', async () => {
    const buffer = buildXlsxBuffer([
      { ...BLANK_ROW, productSku: 'DEMO-1', productName: 'Demo Cashew', categorySlug: 'nuts', basePrice: 100000, variantSku: 'DEMO-1-500G', variantPrice: 50000 },
      { ...BLANK_ROW, productSku: 'DEMO-1', variantSku: 'DEMO-1-1KG', variantPrice: 90000 },
    ]);

    const result = await service.import(buffer);

    expect(result.errors).toEqual([]);
    expect(result.productsCreated).toBe(1);
    expect(result.productsUpdated).toBe(0);
    expect(result.variantsCreated).toBe(2);
    expect(result.variantsUpdated).toBe(0);
    expect(mock.productsBySku.size).toBe(1);
    expect(mock.variantsBySku.size).toBe(2);
  });

  it('re-importing the same file updates the existing product/variants instead of duplicating them', async () => {
    const buffer = buildXlsxBuffer([
      { ...BLANK_ROW, productSku: 'DEMO-1', productName: 'Demo Cashew', categorySlug: 'nuts', basePrice: 100000, variantSku: 'DEMO-1-500G', variantPrice: 50000 },
      { ...BLANK_ROW, productSku: 'DEMO-1', variantSku: 'DEMO-1-1KG', variantPrice: 90000 },
    ]);

    const first = await service.import(buffer);
    expect(first.productsCreated).toBe(1);
    expect(first.variantsCreated).toBe(2);

    const second = await service.import(buffer);
    expect(second.errors).toEqual([]);
    expect(second.productsCreated).toBe(0);
    expect(second.productsUpdated).toBe(1);
    expect(second.variantsCreated).toBe(0);
    expect(second.variantsUpdated).toBe(2);

    // Still exactly one product / two variants in "the database" — no duplicates.
    expect(mock.productsBySku.size).toBe(1);
    expect(mock.variantsBySku.size).toBe(2);
  });

  it('records an error and skips the row for an unknown categorySlug, while other products still import', async () => {
    const buffer = buildXlsxBuffer([
      { ...BLANK_ROW, productSku: 'BAD-1', productName: 'Bad Product', categorySlug: 'does-not-exist', basePrice: 100000, variantSku: 'BAD-1-V1', variantPrice: 50000 },
      { ...BLANK_ROW, productSku: 'GOOD-1', productName: 'Good Product', categorySlug: 'nuts', basePrice: 100000, variantSku: 'GOOD-1-V1', variantPrice: 50000 },
    ]);

    const result = await service.import(buffer);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toMatch(/categorySlug/);
    expect(result.errors[0].row).toBe(2); // first data row (header is row 1)
    expect(result.productsCreated).toBe(1);
    expect(mock.productsBySku.has('BAD-1')).toBe(false);
    expect(mock.productsBySku.has('GOOD-1')).toBe(true);
  });

  it('records a warning (not an error) for an unknown certification code and still imports the row', async () => {
    const buffer = buildXlsxBuffer([
      { ...BLANK_ROW, productSku: 'DEMO-2', productName: 'Demo', categorySlug: 'nuts', certCodes: 'NOT-A-REAL-CODE', basePrice: 100000, variantSku: 'DEMO-2-V1', variantPrice: 50000 },
    ]);

    const result = await service.import(buffer);

    expect(result.errors).toEqual([]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].message).toMatch(/NOT-A-REAL-CODE/);
    expect(result.productsCreated).toBe(1);
    expect(result.variantsCreated).toBe(1);
  });

  it('treats a non-numeric variantPrice as a per-row error without failing the rest of the import', async () => {
    const buffer = buildXlsxBuffer([
      { ...BLANK_ROW, productSku: 'DEMO-3', productName: 'Demo', categorySlug: 'nuts', basePrice: 100000, variantSku: 'DEMO-3-BAD', variantPrice: 'not-a-number' },
      { ...BLANK_ROW, productSku: 'DEMO-3', variantSku: 'DEMO-3-GOOD', variantPrice: 60000 },
    ]);

    const result = await service.import(buffer);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toMatch(/variantPrice/);
    expect(result.productsCreated).toBe(1);
    expect(result.variantsCreated).toBe(1);
    expect(mock.variantsBySku.has('DEMO-3-BAD')).toBe(false);
    expect(mock.variantsBySku.has('DEMO-3-GOOD')).toBe(true);
  });

  it('never throws on a malformed row — a bad product-level price is an error, not a crash', async () => {
    const buffer = buildXlsxBuffer([
      { ...BLANK_ROW, productSku: 'DEMO-4', productName: 'Demo', categorySlug: 'nuts', basePrice: 'garbage', variantSku: 'DEMO-4-V1', variantPrice: 50000 },
      { ...BLANK_ROW, productSku: 'DEMO-5', productName: 'Demo 5', categorySlug: 'nuts', basePrice: 100000, variantSku: 'DEMO-5-V1', variantPrice: 50000 },
    ]);

    const result = await service.import(buffer);

    expect(result.errors.some((e) => e.message.match(/basePrice/))).toBe(true);
    expect(mock.productsBySku.has('DEMO-4')).toBe(false);
    expect(result.productsCreated).toBe(1);
    expect(mock.productsBySku.has('DEMO-5')).toBe(true);
  });
});
