import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { STORAGE_SERVICE, StorageService } from '../../common/interfaces/storage.interface';
import { ImageType, Prisma, ProductStatus } from '@prisma/client';
import { MarketingAutomationService } from '../marketing/marketing-automation.service';
import { SearchService } from '../search/search.service';
import { generateUniqueSlug } from './utils/slug.util';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { AdminProductQueryDto } from './dto/admin-product-query.dto';
import { ProductVariantInputDto } from './dto/product-variant-input.dto';
import { UploadProductImageDto } from './dto/upload-product-image.dto';
import { UploadProductDocumentDto } from './dto/upload-product-document.dto';
import { CreateProductBatchDto } from './dto/create-product-batch.dto';

const RELATED_PRODUCTS_LIMIT = 8;

/**
 * Handles Product + ProductVariant + ProductImage + ProductDocument +
 * ProductCertification + ProductBatch. This is the module's exported surface
 * (see CatalogModule) — Cart/Orders modules built elsewhere may inject this
 * for reads, though in practice they'll likely just use PrismaService directly.
 */
@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
    private readonly marketingAutomation: MarketingAutomationService,
    private readonly searchService: SearchService,
  ) {}

  // ---------- Public ----------

  async listPublic(query: ProductQueryDto) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 20, 100);

    // Search-first read path: when there's a free-text query and none of the
    // filters below (brand/packaging/moq/grade/isOrganic/isFeatured/inStock)
    // that SearchService.searchProducts() doesn't understand are in play, try
    // OpenSearch. `searchProducts()` returns `null` — never throws — whenever
    // OpenSearch is disabled, unreachable, or errors for any reason; that `null`
    // is the signal to fall through unchanged to the Postgres `contains` logic
    // below, which remains the permanent fallback (not just a migration path).
    if (query.q && !this.hasSearchUnsupportedFilters(query)) {
      const searchResult = await this.searchService
        .searchProducts({
          query: query.q,
          categorySlug: query.categorySlug,
          originId: query.originId,
          certificationId: query.certificationId,
          minPrice: query.priceMin,
          maxPrice: query.priceMax,
          page,
          pageSize,
        })
        .catch(() => null);

      if (searchResult) {
        return this.listFromSearchResult(searchResult, page, pageSize);
      }
      // else: OpenSearch unavailable — fall through to Postgres search below.
    }

    const where: Prisma.ProductWhereInput = { status: ProductStatus.ACTIVE };

    if (query.categorySlug) {
      where.category = { slug: query.categorySlug };
    }
    if (query.originId) where.originId = query.originId;
    if (query.brandId) where.brandId = query.brandId;
    if (query.certificationId) {
      where.certifications = { some: { certificationId: query.certificationId } };
    }
    if (query.priceMin !== undefined || query.priceMax !== undefined) {
      where.basePrice = {
        ...(query.priceMin !== undefined ? { gte: query.priceMin } : {}),
        ...(query.priceMax !== undefined ? { lte: query.priceMax } : {}),
      };
    }
    if (query.grade) where.grade = { equals: query.grade, mode: 'insensitive' };
    if (query.moq) where.moq = { contains: query.moq, mode: 'insensitive' };
    if (query.isOrganic !== undefined) where.isOrganic = query.isOrganic;
    if (query.isFeatured !== undefined) where.isFeatured = query.isFeatured;
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { sku: { contains: query.q, mode: 'insensitive' } },
        { shortDescription: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const variantConditions: Prisma.ProductVariantWhereInput[] = [];
    if (query.packaging) {
      variantConditions.push({ packagingLabel: { equals: query.packaging, mode: 'insensitive' } });
    }
    if (query.inStock) {
      const inStockVariantIds = await this.getInStockVariantIds();
      variantConditions.push({ id: { in: inStockVariantIds.length ? inStockVariantIds : ['__none__'] } });
    }
    if (variantConditions.length) {
      where.variants = {
        some: variantConditions.length === 1 ? variantConditions[0] : { AND: variantConditions },
      };
    }

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy: this.resolveSort(query.sort),
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: this.listInclude(),
      }),
    ]);

    return {
      items: products.map((p) => this.toListItem(p)),
      total,
      page,
      pageSize,
    };
  }

  async getPublicBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        brand: true,
        origin: true,
        images: { orderBy: { position: 'asc' } },
        documents: true,
        certifications: { include: { certification: true } },
        variants: true,
      },
    });
    if (!product || product.status !== ProductStatus.ACTIVE) {
      throw new NotFoundException('Product not found');
    }

    const variantIds = product.variants.map((v) => v.id);
    const stockByVariant = await this.getAvailableStockMap(variantIds);

    const related = await this.prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        status: ProductStatus.ACTIVE,
        id: { not: product.id },
      },
      take: RELATED_PRODUCTS_LIMIT,
      orderBy: { createdAt: 'desc' },
      include: this.listInclude(),
    });

    return {
      ...product,
      basePrice: Number(product.basePrice),
      certifications: product.certifications.map((pc) => pc.certification),
      variants: product.variants.map((v) => ({
        ...v,
        price: Number(v.price),
        compareAtPrice: v.compareAtPrice !== null ? Number(v.compareAtPrice) : null,
        availableStock: stockByVariant.get(v.id) ?? 0,
      })),
      relatedProducts: related.map((p) => this.toListItem(p)),
    };
  }

  /** Public QR-code traceability lookup — spec section 17/22. */
  async getBatchByNumber(batchNumber: string) {
    const batch = await this.prisma.productBatch.findUnique({
      where: { batchNumber },
      include: {
        product: {
          include: {
            category: { select: { id: true, name: true } },
            brand: { select: { id: true, name: true } },
            certifications: { include: { certification: true } },
          },
        },
        origin: true,
        warehouse: { select: { id: true, name: true, code: true } },
      },
    });
    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    return {
      ...batch,
      product: {
        ...batch.product,
        basePrice: Number(batch.product.basePrice),
        certifications: batch.product.certifications.map((pc) => pc.certification),
      },
    };
  }

  // ---------- Admin: Products ----------

  async adminList(query: AdminProductQueryDto) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 20, 100);

    const where: Prisma.ProductWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { sku: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          category: { select: { name: true } },
          brand: { select: { name: true } },
        },
      }),
    ]);

    return {
      items: items.map((p) => ({ ...p, basePrice: Number(p.basePrice) })),
      total,
      page,
      pageSize,
    };
  }

  async adminFindOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        brand: true,
        origin: true,
        images: { orderBy: { position: 'asc' } },
        documents: true,
        certifications: { include: { certification: true } },
        variants: true,
      },
    });
    if (!product) throw new NotFoundException('Product not found');

    return {
      ...product,
      basePrice: Number(product.basePrice),
      certifications: product.certifications.map((pc) => pc.certification),
      variants: product.variants.map((v) => ({
        ...v,
        price: Number(v.price),
        compareAtPrice: v.compareAtPrice !== null ? Number(v.compareAtPrice) : null,
      })),
    };
  }

  async create(dto: CreateProductDto) {
    const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!category) {
      throw new BadRequestException('categoryId does not reference an existing category');
    }
    const slug = await this.resolveProductSlug(dto.slug ?? dto.name);

    const created = await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          sku: dto.sku,
          name: dto.name,
          slug,
          status: dto.status ?? ProductStatus.DRAFT,
          categoryId: dto.categoryId,
          brandId: dto.brandId,
          originId: dto.originId,
          shortDescription: dto.shortDescription,
          fullDescription: dto.fullDescription,
          scientificName: dto.scientificName,
          variety: dto.variety,
          harvestSeason: dto.harvestSeason,
          farmingMethod: dto.farmingMethod,
          moisture: dto.moisture,
          size: dto.size,
          grade: dto.grade,
          color: dto.color,
          shelfLife: dto.shelfLife,
          storageTemperature: dto.storageTemperature,
          isOrganic: dto.isOrganic ?? false,
          hsCode: dto.hsCode,
          countryOfOrigin: dto.countryOfOrigin,
          moq: dto.moq,
          productionCapacity: dto.productionCapacity,
          supplyAbility: dto.supplyAbility,
          leadTime: dto.leadTime,
          portOfLoading: dto.portOfLoading,
          incoterms: dto.incoterms ?? [],
          netWeight: dto.netWeight,
          grossWeight: dto.grossWeight,
          unitsPerCarton: dto.unitsPerCarton,
          cartonsPerPallet: dto.cartonsPerPallet,
          container20ftCapacity: dto.container20ftCapacity,
          container40ftCapacity: dto.container40ftCapacity,
          container40hqCapacity: dto.container40hqCapacity,
          basePrice: dto.basePrice,
          currency: dto.currency ?? 'VND',
          isFeatured: dto.isFeatured ?? false,
          seoTitle: dto.seoTitle,
          seoDescription: dto.seoDescription,
          canonicalUrl: dto.canonicalUrl,
          ogImage: dto.ogImage,
          noIndex: dto.noIndex ?? false,
        },
      });

      if (dto.variants?.length) {
        await tx.productVariant.createMany({
          data: dto.variants.map((v) => ({
            productId: product.id,
            sku: v.sku,
            weightLabel: v.weightLabel,
            packagingLabel: v.packagingLabel,
            gradeLabel: v.gradeLabel,
            processingLabel: v.processingLabel,
            price: v.price,
            compareAtPrice: v.compareAtPrice,
            isDefault: v.isDefault ?? false,
          })),
        });
      }

      if (dto.certificationIds?.length) {
        await tx.productCertification.createMany({
          data: dto.certificationIds.map((certificationId) => ({
            productId: product.id,
            certificationId,
          })),
          skipDuplicates: true,
        });
      }

      return product;
    });

    const result = await this.adminFindOne(created.id);
    // Fire-and-forget, same idiom as MarketingAutomationService's hooks: an
    // OpenSearch indexing hiccup must never surface as a failure of the product
    // create that triggered it (indexProduct() itself never throws either way).
    this.searchService.indexProduct(created.id).catch(() => undefined);
    return result;
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Product not found');

    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
      if (!category) {
        throw new BadRequestException('categoryId does not reference an existing category');
      }
    }

    const { variants, certificationIds, slug: requestedSlug, ...scalars } = dto;
    const slug = requestedSlug ? await this.resolveProductSlug(requestedSlug, id) : undefined;

    await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: { ...scalars, slug },
      });

      if (variants) {
        await this.syncVariants(tx, id, variants);
      }

      if (certificationIds) {
        await tx.productCertification.deleteMany({
          where: { productId: id, certificationId: { notIn: certificationIds } },
        });
        if (certificationIds.length) {
          await tx.productCertification.createMany({
            data: certificationIds.map((certificationId) => ({ productId: id, certificationId })),
            skipDuplicates: true,
          });
        }
      }
    });

    if (scalars.basePrice !== undefined) {
      // Fire-and-forget: a marketing-notification hiccup must never surface as a
      // failure of the product update that triggered it.
      this.marketingAutomation
        .notifyPriceDropIfNeeded(id, Number(existing.basePrice), Number(scalars.basePrice))
        .catch(() => undefined);
    }

    // Fire-and-forget: re-index (or, if status moved off ACTIVE, de-index) the
    // product — covers status transitions (e.g. DRAFT/PENDING_REVIEW -> ACTIVE
    // "publish", or ACTIVE -> ARCHIVED) as well as ordinary field edits. See
    // SearchService.indexProduct() for the ACTIVE-status guard.
    this.searchService.indexProduct(id).catch(() => undefined);

    return this.adminFindOne(id);
  }

  async remove(id: string) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Product not found');
    try {
      await this.prisma.product.delete({ where: { id } });
    } catch {
      throw new BadRequestException(
        'Cannot delete this product: it is referenced by orders/RFQs/reviews or similar records. Set status=ARCHIVED instead.',
      );
    }
    // Fire-and-forget: remove from the search index too, same never-throws idiom.
    this.searchService.deleteProduct(id).catch(() => undefined);
    return { success: true };
  }

  // ---------- Admin: Images ----------

  async addImage(productId: string, file: Express.Multer.File | undefined, dto: UploadProductImageDto) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');
    if (!file) throw new BadRequestException('file is required');

    const stored = await this.storage.save(file.buffer, file.originalname, file.mimetype);
    return this.prisma.productImage.create({
      data: {
        productId,
        url: stored.url,
        storagePath: stored.path,
        altText: dto.altText,
        type: dto.type ?? ImageType.GALLERY,
        position: dto.position ?? 0,
      },
    });
  }

  async removeImage(productId: string, imageId: string) {
    const image = await this.prisma.productImage.findUnique({ where: { id: imageId } });
    if (!image || image.productId !== productId) throw new NotFoundException('Image not found');
    await this.prisma.productImage.delete({ where: { id: imageId } });
    if (image.storagePath) {
      await this.storage.delete(image.storagePath);
    }
    return { success: true };
  }

  // ---------- Admin: Documents ----------

  async addDocument(
    productId: string,
    file: Express.Multer.File | undefined,
    dto: UploadProductDocumentDto,
  ) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');
    if (!file) throw new BadRequestException('file is required');

    const stored = await this.storage.save(file.buffer, file.originalname, file.mimetype);
    return this.prisma.productDocument.create({
      data: {
        productId,
        title: dto.title,
        type: dto.type,
        fileUrl: stored.url,
        storagePath: stored.path,
      },
    });
  }

  async removeDocument(productId: string, documentId: string) {
    const document = await this.prisma.productDocument.findUnique({ where: { id: documentId } });
    if (!document || document.productId !== productId) {
      throw new NotFoundException('Document not found');
    }
    await this.prisma.productDocument.delete({ where: { id: documentId } });
    if (document.storagePath) {
      await this.storage.delete(document.storagePath);
    }
    return { success: true };
  }

  // ---------- Admin: Certifications ----------

  async attachCertification(productId: string, certificationId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');
    const certification = await this.prisma.certification.findUnique({ where: { id: certificationId } });
    if (!certification) throw new NotFoundException('Certification not found');

    await this.prisma.productCertification.upsert({
      where: { productId_certificationId: { productId, certificationId } },
      create: { productId, certificationId },
      update: {},
    });
    return { success: true };
  }

  async detachCertification(productId: string, certificationId: string) {
    await this.prisma.productCertification.deleteMany({ where: { productId, certificationId } });
    return { success: true };
  }

  // ---------- Admin: Batches ----------

  async createBatch(productId: string, dto: CreateProductBatchDto) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    return this.prisma.productBatch.create({
      data: {
        productId,
        batchNumber: dto.batchNumber,
        originId: dto.originId,
        harvestDate: dto.harvestDate ? new Date(dto.harvestDate) : undefined,
        processingDate: dto.processingDate ? new Date(dto.processingDate) : undefined,
        packagingDate: dto.packagingDate ? new Date(dto.packagingDate) : undefined,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        qcResult: dto.qcResult,
        certificateUrl: dto.certificateUrl,
        warehouseId: dto.warehouseId,
      },
    });
  }

  async listBatches(productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');
    return this.prisma.productBatch.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      include: { origin: true, warehouse: true },
    });
  }

  // ---------- Internals ----------

  /** Filters ProductQueryDto supports that SearchService.searchProducts() does not
   * (its param set is intentionally limited to query/categorySlug/originId/
   * certificationId/minPrice/maxPrice — see search.service.ts). If any of these
   * are set alongside a free-text `q`, we skip the OpenSearch path entirely and
   * go straight to Postgres, which handles every filter correctly — better than
   * silently ignoring a filter the caller asked for. */
  private hasSearchUnsupportedFilters(query: ProductQueryDto): boolean {
    return (
      query.brandId !== undefined ||
      query.packaging !== undefined ||
      query.moq !== undefined ||
      query.grade !== undefined ||
      query.isOrganic !== undefined ||
      query.isFeatured !== undefined ||
      query.inStock !== undefined
    );
  }

  /** Fetches the full Postgres rows for the ids OpenSearch returned, re-sorted to
   * match OpenSearch's relevance order (Postgres `findMany({ where: { id: { in } } })`
   * does not preserve `in`-list order). */
  private async listFromSearchResult(
    searchResult: { ids: string[]; total: number },
    page: number,
    pageSize: number,
  ) {
    const { ids, total } = searchResult;
    if (ids.length === 0) {
      return { items: [], total, page, pageSize };
    }

    const rows = await this.prisma.product.findMany({
      where: { id: { in: ids }, status: ProductStatus.ACTIVE },
      include: this.listInclude(),
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    const ordered = ids.map((id) => byId.get(id)).filter((row): row is (typeof rows)[number] => !!row);

    return { items: ordered.map((p) => this.toListItem(p)), total, page, pageSize };
  }

  private listInclude(): Prisma.ProductInclude {
    return {
      category: { select: { name: true } },
      origin: { select: { name: true } },
      images: { orderBy: { position: 'asc' }, take: 1 },
      certifications: { include: { certification: true } },
    };
  }

  // Loosely typed on purpose: this maps the result of `listInclude()` above,
  // whose exact include shape isn't worth threading through as a generic here.
  private toListItem(p: any) {
    return {
      id: p.id,
      sku: p.sku,
      slug: p.slug,
      name: p.name,
      shortDescription: p.shortDescription,
      basePrice: Number(p.basePrice),
      currency: p.currency,
      image: p.images[0] ?? null,
      category: p.category?.name ?? null,
      origin: p.origin?.name ?? null,
      certifications: p.certifications.map((pc) => pc.certification),
      isOrganic: p.isOrganic,
      isFeatured: p.isFeatured,
    };
  }

  private resolveSort(sort?: ProductQueryDto['sort']): Prisma.ProductOrderByWithRelationInput {
    switch (sort) {
      case 'price_asc':
        return { basePrice: 'asc' };
      case 'price_desc':
        return { basePrice: 'desc' };
      case 'popular':
      case 'rating':
        // TODO(P1): no popularity/rating aggregate exists yet — fall back to newest.
        return { createdAt: 'desc' };
      case 'newest':
      default:
        return { createdAt: 'desc' };
    }
  }

  private async getInStockVariantIds(): Promise<string[]> {
    const rows = await this.prisma.inventory.groupBy({
      by: ['productVariantId'],
      _sum: { quantityOnHand: true, quantityReserved: true },
    });
    return rows
      .filter((r) => (r._sum.quantityOnHand ?? 0) - (r._sum.quantityReserved ?? 0) > 0)
      .map((r) => r.productVariantId);
  }

  private async getAvailableStockMap(variantIds: string[]): Promise<Map<string, number>> {
    if (!variantIds.length) return new Map();
    const rows = await this.prisma.inventory.groupBy({
      by: ['productVariantId'],
      where: { productVariantId: { in: variantIds } },
      _sum: { quantityOnHand: true, quantityReserved: true },
    });
    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(row.productVariantId, (row._sum.quantityOnHand ?? 0) - (row._sum.quantityReserved ?? 0));
    }
    return map;
  }

  private async syncVariants(
    tx: Prisma.TransactionClient,
    productId: string,
    variants: ProductVariantInputDto[],
  ) {
    const existing = await tx.productVariant.findMany({ where: { productId }, select: { id: true } });
    const existingIds = new Set(existing.map((v) => v.id));
    const keepIds = new Set<string>();

    for (const variant of variants) {
      if (variant.id) {
        if (!existingIds.has(variant.id)) {
          throw new BadRequestException(`Variant ${variant.id} does not belong to this product`);
        }
        keepIds.add(variant.id);
        // eslint-disable-next-line no-await-in-loop
        await tx.productVariant.update({
          where: { id: variant.id },
          data: {
            sku: variant.sku,
            weightLabel: variant.weightLabel,
            packagingLabel: variant.packagingLabel,
            gradeLabel: variant.gradeLabel,
            processingLabel: variant.processingLabel,
            price: variant.price,
            compareAtPrice: variant.compareAtPrice,
            isDefault: variant.isDefault ?? false,
          },
        });
      } else {
        // eslint-disable-next-line no-await-in-loop
        const created = await tx.productVariant.create({
          data: {
            productId,
            sku: variant.sku,
            weightLabel: variant.weightLabel,
            packagingLabel: variant.packagingLabel,
            gradeLabel: variant.gradeLabel,
            processingLabel: variant.processingLabel,
            price: variant.price,
            compareAtPrice: variant.compareAtPrice,
            isDefault: variant.isDefault ?? false,
          },
        });
        keepIds.add(created.id);
      }
    }

    const toDelete = [...existingIds].filter((id) => !keepIds.has(id));
    if (toDelete.length) {
      try {
        await tx.productVariant.deleteMany({ where: { id: { in: toDelete } } });
      } catch {
        throw new BadRequestException(
          'Cannot remove one or more variants: they are referenced by existing cart items or orders',
        );
      }
    }
  }

  private async resolveProductSlug(seed: string, excludeId?: string): Promise<string> {
    return generateUniqueSlug(seed, async (candidate) => {
      const existing = await this.prisma.product.findUnique({ where: { slug: candidate } });
      return !!existing && existing.id !== excludeId;
    });
  }
}
