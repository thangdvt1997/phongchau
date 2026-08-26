import { NotFoundException } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('WishlistService', () => {
  let service: WishlistService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      product: { findUnique: jest.fn() },
      wishlist: {
        findMany: jest.fn(),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
    };
    service = new WishlistService(prisma as unknown as PrismaService);
  });

  describe('findForUser', () => {
    it('maps wishlist rows to a product summary shape', async () => {
      prisma.wishlist.findMany.mockResolvedValue([
        {
          id: 'w1',
          productId: 'p1',
          createdAt: new Date('2026-01-01'),
          product: {
            id: 'p1',
            name: 'Cashew Nuts',
            slug: 'cashew-nuts',
            basePrice: 100,
            currency: 'VND',
            images: [{ url: 'http://img/1.jpg' }],
          },
        },
      ]);

      const result = await service.findForUser('u1');

      expect(prisma.wishlist.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'u1' } }),
      );
      expect(result).toEqual([
        {
          id: 'w1',
          productId: 'p1',
          createdAt: new Date('2026-01-01'),
          product: {
            id: 'p1',
            name: 'Cashew Nuts',
            slug: 'cashew-nuts',
            basePrice: 100,
            currency: 'VND',
            imageUrl: 'http://img/1.jpg',
          },
        },
      ]);
    });

    it('falls back to a null imageUrl when the product has no images', async () => {
      prisma.wishlist.findMany.mockResolvedValue([
        {
          id: 'w1',
          productId: 'p1',
          createdAt: new Date('2026-01-01'),
          product: {
            id: 'p1',
            name: 'Cashew Nuts',
            slug: 'cashew-nuts',
            basePrice: 100,
            currency: 'VND',
            images: [],
          },
        },
      ]);

      const result = await service.findForUser('u1');
      expect(result[0].product.imageUrl).toBeNull();
    });
  });

  describe('add', () => {
    it('throws NotFoundException when the product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(service.add('u1', { productId: 'missing' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('upserts on the [userId, productId] pair so re-adding is idempotent', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'p1' });
      prisma.wishlist.upsert.mockResolvedValue({ id: 'w1', userId: 'u1', productId: 'p1' });

      const result = await service.add('u1', { productId: 'p1' });

      expect(prisma.wishlist.upsert).toHaveBeenCalledWith({
        where: { userId_productId: { userId: 'u1', productId: 'p1' } },
        create: { userId: 'u1', productId: 'p1' },
        update: {},
      });
      expect(result).toEqual({ id: 'w1', userId: 'u1', productId: 'p1' });
    });
  });

  describe('remove', () => {
    it('deletes by [userId, productId] and returns success', async () => {
      prisma.wishlist.deleteMany.mockResolvedValue({ count: 1 });
      const result = await service.remove('u1', 'p1');

      expect(prisma.wishlist.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'u1', productId: 'p1' },
      });
      expect(result).toEqual({ success: true });
    });

    it('is idempotent when there is nothing to remove', async () => {
      prisma.wishlist.deleteMany.mockResolvedValue({ count: 0 });
      const result = await service.remove('u1', 'nonexistent');
      expect(result).toEqual({ success: true });
    });
  });
});
