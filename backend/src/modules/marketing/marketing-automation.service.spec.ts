import { MarketingAutomationService } from './marketing-automation.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('MarketingAutomationService', () => {
  let service: MarketingAutomationService;
  let prisma: any;
  let notifications: { notify: jest.Mock };

  beforeEach(() => {
    prisma = {
      cart: { findMany: jest.fn() },
      user: { findMany: jest.fn() },
      rfq: { findMany: jest.fn() },
      order: { findMany: jest.fn() },
      review: { findFirst: jest.fn() },
      wishlist: { findMany: jest.fn() },
      productVariant: { findUnique: jest.fn() },
      notification: { count: jest.fn().mockResolvedValue(0) },
    };
    notifications = { notify: jest.fn().mockResolvedValue(undefined) };
    service = new MarketingAutomationService(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationsService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('handleAbandonedCarts', () => {
    it('skips a cart that already has a recent marketing.abandoned_cart notification', async () => {
      prisma.cart.findMany.mockResolvedValue([
        {
          id: 'cart-already-notified',
          userId: 'u1',
          items: [{ quantity: 2, priceSnapshot: 10 }],
        },
        {
          id: 'cart-fresh',
          userId: 'u2',
          items: [{ quantity: 1, priceSnapshot: 20 }],
        },
      ]);

      // Dedup lookup keys off `payload: { path: ['cartId'], equals: <cart.id> } — return a
      // hit only for the cart that should be considered "already notified".
      prisma.notification.count.mockImplementation(({ where }: any) =>
        Promise.resolve(where.payload?.equals === 'cart-already-notified' ? 1 : 0),
      );

      await service.handleAbandonedCarts();

      expect(notifications.notify).toHaveBeenCalledTimes(1);
      expect(notifications.notify).toHaveBeenCalledWith(
        'marketing.abandoned_cart',
        expect.objectContaining({
          userId: 'u2',
          data: expect.objectContaining({ cartId: 'cart-fresh', itemCount: 1, subtotal: 20 }),
        }),
      );
    });

    it('only queries carts with a userId set and at least one item (guest carts excluded via the where clause)', async () => {
      prisma.cart.findMany.mockResolvedValue([]);
      await service.handleAbandonedCarts();

      expect(prisma.cart.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: { not: null },
            items: { some: {} },
          }),
          take: 100,
        }),
      );
    });
  });

  describe('handleWinBack', () => {
    it('queries users with a DELIVERED order but nothing created in the last 60 days, and dedupes on a recent win_back notification', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-08-25T00:00:00.000Z'));

      prisma.user.findMany.mockResolvedValue([{ id: 'already-notified' }, { id: 'eligible' }]);
      prisma.notification.count.mockImplementation(({ where }: any) =>
        Promise.resolve(where.userId === 'already-notified' ? 1 : 0),
      );

      await service.handleWinBack();

      const inactivityCutoff = new Date('2026-06-26T00:00:00.000Z'); // 60 days before "now"
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            AND: [
              { orders: { some: { status: 'DELIVERED' } } },
              { orders: { none: { createdAt: { gte: inactivityCutoff } } } },
            ],
          }),
          take: 200,
        }),
      );

      // Dedup: the user with a recent marketing.win_back notification is skipped, the other is notified.
      expect(notifications.notify).toHaveBeenCalledTimes(1);
      expect(notifications.notify).toHaveBeenCalledWith(
        'marketing.win_back',
        expect.objectContaining({ userId: 'eligible' }),
      );
    });
  });

  describe('handleRfqFollowups', () => {
    it('only queries RFQs stale for 48+ hours and dedupes on a recent rfq_followup notification', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-08-25T00:00:00.000Z'));

      prisma.rfq.findMany.mockResolvedValue([
        { id: 'rfq-already-notified', rfqNumber: 'RFQ-1', status: 'SUBMITTED' },
        { id: 'rfq-stale', rfqNumber: 'RFQ-2', status: 'SALES_REVIEW' },
      ]);
      prisma.notification.count.mockImplementation(({ where }: any) =>
        Promise.resolve(where.payload?.equals === 'rfq-already-notified' ? 1 : 0),
      );

      await service.handleRfqFollowups();

      const staleCutoff = new Date('2026-08-23T00:00:00.000Z'); // 48h before "now"
      expect(prisma.rfq.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['SUBMITTED', 'SALES_REVIEW'] },
            updatedAt: { lt: staleCutoff },
          }),
          take: 100,
        }),
      );

      expect(notifications.notify).toHaveBeenCalledTimes(1);
      expect(notifications.notify).toHaveBeenCalledWith(
        'marketing.rfq_followup',
        expect.objectContaining({
          to: 'sales@phongchau.example',
          data: expect.objectContaining({ rfqId: 'rfq-stale' }),
        }),
      );
    });
  });
});
