import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProductStatus } from '@prisma/client';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: any;
  let storage: any;

  beforeEach(() => {
    prisma = {
      product: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      category: {
        findUnique: jest.fn(),
      },
      certification: {
        findUnique: jest.fn(),
      },
      inventory: {
        groupBy: jest.fn().mockResolvedValue([]),
      },
      productImage: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      productDocument: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      productCertification: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
        upsert: jest.fn(),
      },
      productVariant: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      productBatch: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((cb: any) => cb(prisma)),
    };
    storage = {
      save: jest.fn(),
      delete: jest.fn(),
    };
    service = new ProductsService(prisma as unknown as PrismaService, storage);
  });

  describe('listPublic', () => {
    it('only returns ACTIVE products and applies pagination defaults', async () => {
      prisma.product.count.mockResolvedValue(1);
      prisma.product.findMany.mockResolvedValue([
        {
          id: 'p1',
          sku: 'SKU1',
          slug: 'p1',
          name: 'Product 1',
          shortDescription: null,
          basePrice: { toString: () => '10' } as any,
          currency: 'VND',
          images: [],
          category: { name: 'Cat' },
          origin: { name: 'Origin' },
          certifications: [],
          isOrganic: false,
          isFeatured: false,
        },
      ]);

      const result = await service.listPublic({ page: 1, pageSize: 20, sort: 'newest' } as any);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: ProductStatus.ACTIVE }),
        }),
      );
      expect(result.page).toBe(1);
      expect(result.items).toHaveLength(1);
    });
  });

  describe('getPublicBySlug', () => {
    it('throws NotFoundException when the product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(service.getPublicBySlug('missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException when the product is not ACTIVE', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: 'p1',
        status: ProductStatus.DRAFT,
        variants: [],
        categoryId: 'c1',
      });
      await expect(service.getPublicBySlug('draft-product')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getBatchByNumber', () => {
    it('throws NotFoundException when the batch does not exist', async () => {
      prisma.productBatch.findUnique.mockResolvedValue(null);
      await expect(service.getBatchByNumber('BATCH-404')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    it('rejects an unknown categoryId', async () => {
      prisma.category.findUnique.mockResolvedValue(null);
      await expect(
        service.create({ sku: 'SKU1', name: 'P', categoryId: 'missing', basePrice: 10 } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('addImage', () => {
    it('throws NotFoundException when the product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(
        service.addImage('missing', { buffer: Buffer.from(''), originalname: 'a.png', mimetype: 'image/png' } as any, {} as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('saves via StorageService and persists the returned url + path', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'p1' });
      storage.save.mockResolvedValue({ url: 'http://x/a.png', path: '/tmp/a.png', mimeType: 'image/png', sizeBytes: 1 });
      prisma.productImage.create.mockResolvedValue({ id: 'img1' });

      await service.addImage(
        'p1',
        { buffer: Buffer.from('x'), originalname: 'a.png', mimetype: 'image/png' } as any,
        { altText: 'alt', position: 1 } as any,
      );

      expect(storage.save).toHaveBeenCalled();
      expect(prisma.productImage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ url: 'http://x/a.png', storagePath: '/tmp/a.png' }),
        }),
      );
    });
  });

  describe('removeImage', () => {
    it('throws NotFoundException when the image does not belong to the product', async () => {
      prisma.productImage.findUnique.mockResolvedValue({ id: 'img1', productId: 'other' });
      await expect(service.removeImage('p1', 'img1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deletes the DB row and the underlying file', async () => {
      prisma.productImage.findUnique.mockResolvedValue({ id: 'img1', productId: 'p1', storagePath: '/tmp/a.png' });
      await service.removeImage('p1', 'img1');
      expect(prisma.productImage.delete).toHaveBeenCalledWith({ where: { id: 'img1' } });
      expect(storage.delete).toHaveBeenCalledWith('/tmp/a.png');
    });
  });
});
