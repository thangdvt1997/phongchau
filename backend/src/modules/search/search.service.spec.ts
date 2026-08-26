import { ProductStatus } from '@prisma/client';
import { SearchService } from './search.service';

describe('SearchService', () => {
  describe('when disabled (client is null)', () => {
    it('searchProducts() resolves to null without throwing', async () => {
      const service = new SearchService(null, {} as any);

      await expect(service.searchProducts({ query: 'coffee' })).resolves.toBeNull();
    });

    it('reports enabled=false', () => {
      const service = new SearchService(null, {} as any);
      expect(service.enabled).toBe(false);
    });

    it('indexProduct()/deleteProduct()/reindexAll() are no-ops that never throw', async () => {
      const prisma = { product: { findUnique: jest.fn(), findMany: jest.fn() } };
      const service = new SearchService(null, prisma as any);

      await expect(service.indexProduct('p1')).resolves.toBeUndefined();
      await expect(service.deleteProduct('p1')).resolves.toBeUndefined();
      await expect(service.reindexAll()).resolves.toBe(0);
      expect(prisma.product.findUnique).not.toHaveBeenCalled();
      expect(prisma.product.findMany).not.toHaveBeenCalled();
    });
  });

  describe('when the client throws (e.g. OpenSearch is unreachable)', () => {
    it('searchProducts() resolves to null rather than rejecting', async () => {
      const client = {
        search: jest.fn().mockRejectedValue(new Error('connect ECONNREFUSED')),
      };
      const service = new SearchService(client as any, {} as any);

      await expect(service.searchProducts({ query: 'rice' })).resolves.toBeNull();
    });
  });

  describe('when enabled and the client succeeds', () => {
    it('maps the OpenSearch response into { ids, total }', async () => {
      const client = {
        search: jest.fn().mockResolvedValue({
          body: {
            hits: {
              total: { value: 2 },
              hits: [{ _id: 'product-1' }, { _id: 'product-2' }],
            },
          },
        }),
      };
      const service = new SearchService(client as any, {} as any);

      const result = await service.searchProducts({
        query: 'organic rice',
        categorySlug: 'rice',
        minPrice: 10,
        maxPrice: 100,
        page: 2,
        pageSize: 10,
      });

      expect(result).toEqual({ ids: ['product-1', 'product-2'], total: 2 });

      const call = client.search.mock.calls[0][0];
      expect(call.index).toBe('phongchau_products');
      expect(call.body.from).toBe(10); // (page 2 - 1) * pageSize 10
      expect(call.body.size).toBe(10);
      expect(call.body.query.bool.must[0].multi_match.query).toBe('organic rice');
      expect(call.body.query.bool.filter).toEqual(
        expect.arrayContaining([
          { term: { status: ProductStatus.ACTIVE } },
          { term: { categorySlug: 'rice' } },
          { range: { basePrice: { gte: 10, lte: 100 } } },
        ]),
      );
    });

    it('tolerates a plain numeric hits.total (older-style response shape)', async () => {
      const client = {
        search: jest.fn().mockResolvedValue({
          body: { hits: { total: 1, hits: [{ _id: 'product-9' }] } },
        }),
      };
      const service = new SearchService(client as any, {} as any);

      const result = await service.searchProducts({ query: 'tea' });

      expect(result).toEqual({ ids: ['product-9'], total: 1 });
    });
  });

  describe('deleteProduct', () => {
    it('swallows a 404 (nothing to delete) without logging it as a failure', async () => {
      const notFoundError: any = new Error('Not Found');
      notFoundError.meta = { statusCode: 404 };
      const client = { delete: jest.fn().mockRejectedValue(notFoundError) };
      const service = new SearchService(client as any, {} as any);

      await expect(service.deleteProduct('missing-id')).resolves.toBeUndefined();
      expect(client.delete).toHaveBeenCalledWith({ index: 'phongchau_products', id: 'missing-id' });
    });

    it('swallows any other error too (never throws into the caller)', async () => {
      const client = { delete: jest.fn().mockRejectedValue(new Error('cluster unavailable')) };
      const service = new SearchService(client as any, {} as any);

      await expect(service.deleteProduct('p1')).resolves.toBeUndefined();
    });
  });

  describe('indexProduct', () => {
    it('de-indexes instead of indexing when the product is not ACTIVE', async () => {
      const prisma = {
        product: {
          findUnique: jest.fn().mockResolvedValue({ id: 'p1', status: ProductStatus.DRAFT }),
        },
      };
      const client = {
        delete: jest.fn().mockResolvedValue({}),
        index: jest.fn(),
        indices: { exists: jest.fn() },
      };
      const service = new SearchService(client as any, prisma as any);

      await service.indexProduct('p1');

      expect(client.delete).toHaveBeenCalledWith({ index: 'phongchau_products', id: 'p1' });
      expect(client.index).not.toHaveBeenCalled();
    });

    it('indexes an ACTIVE product, creating the index first if missing', async () => {
      const prisma = {
        product: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'p1',
            name: 'Jasmine Rice',
            sku: 'RICE-01',
            shortDescription: 'Fragrant long-grain rice',
            fullDescription: null,
            originId: 'origin-1',
            basePrice: 12.5,
            status: ProductStatus.ACTIVE,
            createdAt: new Date('2026-01-01'),
            category: { slug: 'rice' },
            certifications: [{ certificationId: 'cert-1' }],
          }),
        },
      };
      const client = {
        indices: { exists: jest.fn().mockResolvedValue(false), create: jest.fn().mockResolvedValue({}) },
        index: jest.fn().mockResolvedValue({}),
      };
      const service = new SearchService(client as any, prisma as any);

      await service.indexProduct('p1');

      expect(client.indices.create).toHaveBeenCalled();
      expect(client.index).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'phongchau_products',
          id: 'p1',
          body: expect.objectContaining({
            name: 'Jasmine Rice',
            categorySlug: 'rice',
            certificationIds: ['cert-1'],
            basePrice: 12.5,
          }),
        }),
      );
    });
  });

  describe('reindexAll', () => {
    it('returns 0 and never throws when there are no ACTIVE products', async () => {
      const prisma = { product: { findMany: jest.fn().mockResolvedValue([]) } };
      const client = { indices: { exists: jest.fn().mockResolvedValue(true) }, bulk: jest.fn() };
      const service = new SearchService(client as any, prisma as any);

      await expect(service.reindexAll()).resolves.toBe(0);
      expect(client.bulk).not.toHaveBeenCalled();
    });

    it('returns 0 rather than throwing when the bulk call fails', async () => {
      const prisma = {
        product: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'p1',
              name: 'A',
              sku: 'A',
              shortDescription: null,
              fullDescription: null,
              originId: null,
              basePrice: 1,
              status: ProductStatus.ACTIVE,
              createdAt: new Date(),
              category: { slug: 'cat' },
              certifications: [],
            },
          ]),
        },
      };
      const client = {
        indices: { exists: jest.fn().mockResolvedValue(true) },
        bulk: jest.fn().mockRejectedValue(new Error('bulk failed')),
      };
      const service = new SearchService(client as any, prisma as any);

      await expect(service.reindexAll()).resolves.toBe(0);
    });
  });
});
