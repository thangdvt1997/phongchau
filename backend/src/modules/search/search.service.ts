import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Client } from '@opensearch-project/opensearch';
import { Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OPENSEARCH_CLIENT } from './opensearch-client.provider';

export const PRODUCT_INDEX = 'phongchau_products';

/** Delay before the one-off startup auto-reindex fires, so it never competes with
 * app boot / the first requests for CPU or DB connections. */
const AUTO_REINDEX_DELAY_MS = 5_000;

export interface SearchProductsParams {
  query?: string;
  categorySlug?: string;
  originId?: string;
  certificationId?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  pageSize?: number;
}

export interface SearchProductsResult {
  ids: string[];
  total: number;
}

const PRODUCT_SEARCH_INCLUDE = {
  category: { select: { slug: true } },
  certifications: { select: { certificationId: true } },
} satisfies Prisma.ProductInclude;

type ProductForIndex = Prisma.ProductGetPayload<{ include: typeof PRODUCT_SEARCH_INCLUDE }>;

/**
 * Optional OpenSearch-backed product search. Fully inert (a no-op on every method)
 * when OPENSEARCH_ENABLED is unset/false or the client failed to construct — see
 * OpenSearchClientProvider. Every OpenSearch call is wrapped in try/catch and logs
 * rather than throws, matching the fire-and-forget idiom used by
 * MarketingAutomationService for its hooks off ProductsService/InventoryService.
 *
 * The one property callers MUST be able to rely on: `searchProducts()` returns
 * `null` — never throws — whenever OpenSearch is unavailable for any reason, and
 * the caller (ProductsService.listPublic) always has a Postgres `contains` fallback
 * ready for that case. That fallback path is never removed by this module.
 */
@Injectable()
export class SearchService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @Inject(OPENSEARCH_CLIENT) private readonly client: Client | null,
    private readonly prisma: PrismaService,
  ) {}

  get enabled(): boolean {
    return this.client !== null;
  }

  onApplicationBootstrap(): void {
    if (!this.client) return;
    // Fire-and-forget, delayed, and fully guarded — a slow/unreachable OpenSearch
    // node must never delay or fail application startup.
    setTimeout(() => {
      this.autoReindexIfEmpty().catch(() => undefined);
    }, AUTO_REINDEX_DELAY_MS);
  }

  // ---------- Write path (called fire-and-forget from ProductsService) ----------

  /**
   * Re-indexes (or, if the product is no longer ACTIVE, removes) a single product
   * by id. Called after create/update commit in ProductsService — takes an id
   * rather than the caller's in-hand object so the indexed document always
   * reflects the actually-committed row/relations, independent of whatever
   * partial shape happens to flow through the calling method.
   */
  async indexProduct(productId: string): Promise<void> {
    if (!this.client) return;
    try {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        include: PRODUCT_SEARCH_INCLUDE,
      });

      if (!product || product.status !== ProductStatus.ACTIVE) {
        await this.deleteProduct(productId);
        return;
      }

      await this.ensureIndex();
      await this.client.index({
        index: PRODUCT_INDEX,
        id: product.id,
        body: this.toDocument(product),
      });
    } catch (error) {
      this.logger.warn(
        `indexProduct(${productId}) failed — search index may be stale until the next reindex: ${this.errorMessage(error)}`,
      );
    }
  }

  async deleteProduct(productId: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.delete({ index: PRODUCT_INDEX, id: productId });
    } catch (error) {
      // 404 just means it was never indexed (or already removed) — not an error.
      if (this.statusCodeOf(error) !== 404) {
        this.logger.warn(`deleteProduct(${productId}) failed: ${this.errorMessage(error)}`);
      }
    }
  }

  // ---------- Read path (called from ProductsService.listPublic) ----------

  /**
   * Returns `{ ids, total }` in relevance order, or `null` if OpenSearch is
   * disabled/unreachable/misconfigured — `null` is the caller's signal to fall
   * back to the existing Postgres `contains` filtering unchanged.
   */
  async searchProducts(params: SearchProductsParams): Promise<SearchProductsResult | null> {
    if (!this.client) return null;
    try {
      const page = params.page ?? 1;
      const pageSize = Math.min(params.pageSize ?? 20, 100);

      const filter: Record<string, unknown>[] = [{ term: { status: ProductStatus.ACTIVE } }];
      if (params.categorySlug) filter.push({ term: { categorySlug: params.categorySlug } });
      if (params.originId) filter.push({ term: { originId: params.originId } });
      if (params.certificationId) filter.push({ term: { certificationIds: params.certificationId } });
      if (params.minPrice !== undefined || params.maxPrice !== undefined) {
        filter.push({
          range: {
            basePrice: {
              ...(params.minPrice !== undefined ? { gte: params.minPrice } : {}),
              ...(params.maxPrice !== undefined ? { lte: params.maxPrice } : {}),
            },
          },
        });
      }

      const must = params.query
        ? [
            {
              multi_match: {
                query: params.query,
                fields: ['name^3', 'sku^2', 'shortDescription', 'fullDescription'],
                fuzziness: 'AUTO',
              },
            },
          ]
        : [{ match_all: {} }];

      const response = await this.client.search({
        index: PRODUCT_INDEX,
        body: {
          query: { bool: { must, filter } },
          from: (page - 1) * pageSize,
          size: pageSize,
          _source: false,
        },
      });

      const hits = (response as any)?.body?.hits ?? {};
      const ids: string[] = (hits.hits ?? []).map((hit: any) => hit._id);
      const totalRaw = hits.total;
      const total = typeof totalRaw === 'object' && totalRaw !== null ? totalRaw.value : (totalRaw ?? ids.length);

      return { ids, total };
    } catch (error) {
      // Index-not-found is expected before the first reindex — treat it the same
      // as any other "search unavailable" outcome, not a hard error.
      this.logger.warn(`searchProducts failed — falling back to Postgres search: ${this.errorMessage(error)}`);
      return null;
    }
  }

  // ---------- Admin: full reindex ----------

  /** Bulk-reindexes every ACTIVE product. Returns the number of documents indexed
   * (0 if disabled, on failure, or if there is nothing to index). Never throws. */
  async reindexAll(): Promise<number> {
    if (!this.client) return 0;
    try {
      await this.ensureIndex();

      const products = await this.prisma.product.findMany({
        where: { status: ProductStatus.ACTIVE },
        include: PRODUCT_SEARCH_INCLUDE,
      });
      if (!products.length) return 0;

      const body = products.flatMap((product) => [
        { index: { _index: PRODUCT_INDEX, _id: product.id } },
        this.toDocument(product),
      ]);

      const response = await this.client.bulk({ body, refresh: true });
      if ((response as any)?.body?.errors) {
        this.logger.warn('reindexAll: OpenSearch reported one or more bulk item failures (see cluster logs)');
      }

      return products.length;
    } catch (error) {
      this.logger.error(`reindexAll failed: ${this.errorMessage(error)}`);
      return 0;
    }
  }

  // ---------- Internals ----------

  /** Runs once, ~5s after startup, only if OpenSearch is enabled. Guarded so a
   * slow/unreachable node can never block or fail application boot. */
  private async autoReindexIfEmpty(): Promise<void> {
    if (!this.client) return;
    try {
      const exists = await this.client.indices.exists({ index: PRODUCT_INDEX });
      if (this.asBoolean(exists)) {
        const countResponse = await this.client.count({ index: PRODUCT_INDEX });
        const count = (countResponse as any)?.body?.count ?? 0;
        if (count > 0) return;
      }
      const indexed = await this.reindexAll();
      this.logger.log(`Startup auto-reindex: indexed ${indexed} product(s) into OpenSearch`);
    } catch (error) {
      this.logger.warn(`Startup auto-reindex skipped (non-fatal): ${this.errorMessage(error)}`);
    }
  }

  private async ensureIndex(): Promise<void> {
    if (!this.client) return;
    try {
      const exists = await this.client.indices.exists({ index: PRODUCT_INDEX });
      if (this.asBoolean(exists)) return;

      await this.client.indices.create({
        index: PRODUCT_INDEX,
        body: {
          // Single shard, zero replicas: this is a single-node cluster on a shared,
          // memory-constrained VPS — replicas could never be assigned anyway and
          // would just leave the cluster permanently "yellow".
          settings: { number_of_shards: 1, number_of_replicas: 0 },
          mappings: {
            properties: {
              name: { type: 'text' },
              sku: { type: 'keyword' },
              shortDescription: { type: 'text' },
              fullDescription: { type: 'text' },
              categorySlug: { type: 'keyword' },
              originId: { type: 'keyword' },
              certificationIds: { type: 'keyword' },
              basePrice: { type: 'double' },
              status: { type: 'keyword' },
              createdAt: { type: 'date' },
            },
          },
        },
      });
    } catch (error) {
      this.logger.warn(`ensureIndex failed: ${this.errorMessage(error)}`);
    }
  }

  private toDocument(product: ProductForIndex) {
    return {
      name: product.name,
      sku: product.sku,
      shortDescription: product.shortDescription,
      fullDescription: product.fullDescription,
      categorySlug: product.category?.slug ?? null,
      originId: product.originId,
      certificationIds: product.certifications.map((c) => c.certificationId),
      basePrice: Number(product.basePrice),
      status: product.status,
      createdAt: product.createdAt,
    };
  }

  /** The opensearch-js client's boolean-response APIs (indices.exists, ...) return
   * either a raw boolean or a `{ body: boolean }` wrapper depending on client
   * version/transport config — handle both defensively rather than assume one. */
  private asBoolean(response: unknown): boolean {
    if (typeof response === 'boolean') return response;
    return (response as any)?.body === true;
  }

  private statusCodeOf(error: unknown): number | undefined {
    return (error as any)?.meta?.statusCode ?? (error as any)?.statusCode;
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
