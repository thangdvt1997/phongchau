import { NotFoundException } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OrderStatus, ReviewStatus } from '@prisma/client';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      product: { findUnique: jest.fn() },
      review: {
        findMany: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      orderItem: { findFirst: jest.fn() },
    };
    service = new ReviewsService(prisma as unknown as PrismaService);
  });

  describe('findApprovedForProduct', () => {
    it('only queries APPROVED reviews and returns the averageRating envelope', async () => {
      prisma.review.findMany.mockResolvedValue([{ id: 'r1' }]);
      prisma.review.count.mockResolvedValue(1);
      prisma.review.aggregate.mockResolvedValue({ _avg: { rating: 4.5 } });

      const result = await service.findApprovedForProduct('p1', { page: 1, pageSize: 20 });

      expect(prisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { productId: 'p1', status: ReviewStatus.APPROVED },
        }),
      );
      expect(result).toEqual({
        items: [{ id: 'r1' }],
        total: 1,
        page: 1,
        pageSize: 20,
        averageRating: 4.5,
      });
    });

    it('defaults averageRating to 0 when there are no reviews', async () => {
      prisma.review.findMany.mockResolvedValue([]);
      prisma.review.count.mockResolvedValue(0);
      prisma.review.aggregate.mockResolvedValue({ _avg: { rating: null } });

      const result = await service.findApprovedForProduct('p1', {});
      expect(result.averageRating).toBe(0);
    });
  });

  describe('create', () => {
    it('throws NotFoundException when the product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(
        service.create('missing-product', 'u1', { rating: 5 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('sets isVerifiedPurchase=true when a DELIVERED order item exists for this user/product', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'p1' });
      prisma.orderItem.findFirst.mockResolvedValue({ id: 'oi1' });
      prisma.review.create.mockResolvedValue({ id: 'r1', isVerifiedPurchase: true });

      await service.create('p1', 'u1', { rating: 5, title: 'Great' });

      expect(prisma.orderItem.findFirst).toHaveBeenCalledWith({
        where: {
          productVariant: { productId: 'p1' },
          order: { userId: 'u1', status: OrderStatus.DELIVERED },
        },
      });
      expect(prisma.review.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            productId: 'p1',
            userId: 'u1',
            isVerifiedPurchase: true,
            status: ReviewStatus.PENDING,
          }),
        }),
      );
    });

    it('sets isVerifiedPurchase=false when no matching delivered order item exists', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'p1' });
      prisma.orderItem.findFirst.mockResolvedValue(null);
      prisma.review.create.mockResolvedValue({ id: 'r1' });

      await service.create('p1', 'u1', { rating: 3 });

      expect(prisma.review.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isVerifiedPurchase: false }),
        }),
      );
    });
  });

  describe('admin actions', () => {
    it('approve() throws NotFoundException for an unknown review', async () => {
      prisma.review.findUnique.mockResolvedValue(null);
      await expect(service.approve('missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('approve() sets status to APPROVED', async () => {
      prisma.review.findUnique.mockResolvedValue({ id: 'r1' });
      prisma.review.update.mockResolvedValue({ id: 'r1', status: ReviewStatus.APPROVED });

      await service.approve('r1');

      expect(prisma.review.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: { status: ReviewStatus.APPROVED },
      });
    });

    it('reject() sets status to REJECTED', async () => {
      prisma.review.findUnique.mockResolvedValue({ id: 'r1' });
      prisma.review.update.mockResolvedValue({ id: 'r1', status: ReviewStatus.REJECTED });

      await service.reject('r1');

      expect(prisma.review.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: { status: ReviewStatus.REJECTED },
      });
    });
  });
});
