import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrderStatus, Role, RfqStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const DAY_MS = 24 * 60 * 60 * 1000;

// Abandoned cart
const ABANDONED_CART_STALE_HOURS = 24;
const ABANDONED_CART_DEDUPE_DAYS = 3;
const ABANDONED_CART_BATCH = 100;

// Back-in-stock
const BACK_IN_STOCK_DEDUPE_DAYS = 7;
const BACK_IN_STOCK_BATCH = 200;

// Price drop
const PRICE_DROP_DEDUPE_DAYS = 7;
const PRICE_DROP_BATCH = 200;

// Review request
const REVIEW_REQUEST_DELIVERED_DAYS = 3;
const REVIEW_REQUEST_DEDUPE_DAYS = 30;
const REVIEW_REQUEST_ORDER_BATCH = 100;
const REVIEW_REQUEST_MAX_PRODUCTS_PER_ORDER = 5;

// Customer win-back
const WIN_BACK_INACTIVITY_DAYS = 60;
const WIN_BACK_DEDUPE_DAYS = 30;
const WIN_BACK_BATCH = 200;

// RFQ follow-up
const RFQ_FOLLOWUP_STALE_HOURS = 48;
const RFQ_FOLLOWUP_DEDUPE_HOURS = 24;
const RFQ_FOLLOWUP_BATCH = 100;
const SALES_INBOX_EMAIL = 'sales@phongchau.example';

/**
 * Spec section 35 — Marketing Automation. Cron-driven batch triggers plus two
 * event-driven hooks (back-in-stock, price-drop) called directly from
 * InventoryService/ProductsService right after the stock/price change commits.
 *
 * Every path here follows the codebase-wide convention that a notification
 * failure must never break the business operation that triggered it:
 * `notify()` itself never throws (see NotificationsService), and every
 * caller here additionally wraps in try/catch as defensive redundancy, the
 * same pattern RfqService uses around its own notify() calls.
 *
 * Dedup strategy: rather than adding new "already notified" schema/columns,
 * every trigger checks the existing `Notification` log for a prior row with
 * the same `event` (+ a matching id inside `payload`, via Prisma's JSON path
 * filter, where relevant) within a trigger-specific lookback window before
 * sending again.
 */
@Injectable()
export class MarketingAutomationService {
  private readonly logger = new Logger(MarketingAutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ---------- 2. Abandoned cart ----------

  @Cron(CronExpression.EVERY_4_HOURS)
  async handleAbandonedCarts(): Promise<void> {
    try {
      const staleCutoff = new Date(Date.now() - ABANDONED_CART_STALE_HOURS * 60 * 60 * 1000);
      const dedupeSince = new Date(Date.now() - ABANDONED_CART_DEDUPE_DAYS * DAY_MS);

      const carts = await this.prisma.cart.findMany({
        where: {
          userId: { not: null },
          updatedAt: { lt: staleCutoff },
          items: { some: {} },
        },
        include: { items: true },
        orderBy: { updatedAt: 'asc' },
        take: ABANDONED_CART_BATCH,
      });

      for (const cart of carts) {
        if (!cart.userId) continue;
        const userId = cart.userId;

        // eslint-disable-next-line no-await-in-loop
        const alreadyNotified = await this.hasRecentNotification({
          event: 'marketing.abandoned_cart',
          since: dedupeSince,
          payloadPath: ['cartId'],
          payloadValue: cart.id,
        });
        if (alreadyNotified) continue;

        const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
        const subtotal = cart.items.reduce(
          (sum, item) => sum + Number(item.priceSnapshot) * item.quantity,
          0,
        );

        // eslint-disable-next-line no-await-in-loop
        await this.safeNotify('marketing.abandoned_cart', {
          userId,
          data: { cartId: cart.id, itemCount, subtotal },
        });
      }
    } catch (error) {
      this.logger.error(`handleAbandonedCarts failed: ${this.errorMessage(error)}`);
    }
  }

  // ---------- 3. Back-in-stock (event-driven — called from InventoryService.adjust()) ----------

  /**
   * Called right after an IN/ADJUST stock increase commits. `previousAvailable`
   * and `newAvailable` are the total-across-warehouses available quantity
   * (onHand - reserved) for the variant before/after that single adjustment —
   * the caller computes these since it already has the numbers from the
   * transaction it just ran; this method only decides whether the crossing
   * (<=0 -> >0) happened and, if so, notifies wishlisters.
   */
  async notifyBackInStockIfNeeded(
    productVariantId: string,
    previousAvailable: number,
    newAvailable: number,
  ): Promise<void> {
    if (previousAvailable > 0 || newAvailable <= 0) return;

    try {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: productVariantId },
        select: { productId: true },
      });
      if (!variant) return;

      const dedupeSince = new Date(Date.now() - BACK_IN_STOCK_DEDUPE_DAYS * DAY_MS);
      const wishlisters = await this.prisma.wishlist.findMany({
        where: { productId: variant.productId },
        select: { userId: true },
        take: BACK_IN_STOCK_BATCH,
      });

      for (const { userId } of wishlisters) {
        // eslint-disable-next-line no-await-in-loop
        const alreadyNotified = await this.hasRecentNotification({
          event: 'marketing.back_in_stock',
          since: dedupeSince,
          payloadPath: ['productId'],
          payloadValue: variant.productId,
          userId,
        });
        if (alreadyNotified) continue;

        // eslint-disable-next-line no-await-in-loop
        await this.safeNotify('marketing.back_in_stock', {
          userId,
          data: { productId: variant.productId, productVariantId },
        });
      }
    } catch (error) {
      this.logger.error(`notifyBackInStockIfNeeded failed: ${this.errorMessage(error)}`);
    }
  }

  // ---------- 4. Price drop (event-driven — called from ProductsService.update()) ----------

  async notifyPriceDropIfNeeded(productId: string, oldPrice: number, newPrice: number): Promise<void> {
    if (!(newPrice < oldPrice)) return;

    try {
      const dedupeSince = new Date(Date.now() - PRICE_DROP_DEDUPE_DAYS * DAY_MS);
      const wishlisters = await this.prisma.wishlist.findMany({
        where: { productId },
        select: { userId: true },
        take: PRICE_DROP_BATCH,
      });

      for (const { userId } of wishlisters) {
        // eslint-disable-next-line no-await-in-loop
        const alreadyNotified = await this.hasRecentNotification({
          event: 'marketing.price_drop',
          since: dedupeSince,
          payloadPath: ['productId'],
          payloadValue: productId,
          userId,
        });
        if (alreadyNotified) continue;

        // eslint-disable-next-line no-await-in-loop
        await this.safeNotify('marketing.price_drop', {
          userId,
          data: { productId, oldPrice, newPrice },
        });
      }
    } catch (error) {
      this.logger.error(`notifyPriceDropIfNeeded failed: ${this.errorMessage(error)}`);
    }
  }

  // ---------- 5. Review request ----------

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleReviewRequests(): Promise<void> {
    try {
      const deliveredCutoff = new Date(Date.now() - REVIEW_REQUEST_DELIVERED_DAYS * DAY_MS);
      const dedupeSince = new Date(Date.now() - REVIEW_REQUEST_DEDUPE_DAYS * DAY_MS);

      const orders = await this.prisma.order.findMany({
        where: {
          status: OrderStatus.DELIVERED,
          userId: { not: null },
          // No dedicated "deliveredAt" on Order (Shipment.deliveredAt exists per-shipment,
          // but an order can have multiple shipments) — updatedAt is the documented proxy
          // for "when the order most recently changed status", per spec section 35.
          updatedAt: { lt: deliveredCutoff },
        },
        include: {
          items: { select: { productVariant: { select: { productId: true } } } },
        },
        orderBy: { updatedAt: 'asc' },
        take: REVIEW_REQUEST_ORDER_BATCH,
      });

      for (const order of orders) {
        if (!order.userId) continue;
        const userId = order.userId;

        const distinctProductIds = [
          ...new Set(order.items.map((item) => item.productVariant.productId)),
        ].slice(0, REVIEW_REQUEST_MAX_PRODUCTS_PER_ORDER);

        for (const productId of distinctProductIds) {
          // eslint-disable-next-line no-await-in-loop
          const existingReview = await this.prisma.review.findFirst({
            where: { userId, productId },
            select: { id: true },
          });
          if (existingReview) continue;

          // eslint-disable-next-line no-await-in-loop
          const alreadyNotified = await this.hasRecentNotification({
            event: 'marketing.review_request',
            since: dedupeSince,
            payloadPath: ['productId'],
            payloadValue: productId,
            userId,
          });
          if (alreadyNotified) continue;

          // eslint-disable-next-line no-await-in-loop
          await this.safeNotify('marketing.review_request', {
            userId,
            data: { orderId: order.id, productId },
          });
        }
      }
    } catch (error) {
      this.logger.error(`handleReviewRequests failed: ${this.errorMessage(error)}`);
    }
  }

  // ---------- 6. Customer win-back ----------

  @Cron(CronExpression.EVERY_WEEK)
  async handleWinBack(): Promise<void> {
    try {
      const inactivityCutoff = new Date(Date.now() - WIN_BACK_INACTIVITY_DAYS * DAY_MS);
      const dedupeSince = new Date(Date.now() - WIN_BACK_DEDUPE_DAYS * DAY_MS);

      const candidates = await this.prisma.user.findMany({
        where: {
          role: { in: [Role.RETAIL_CUSTOMER, Role.B2B_CUSTOMER] },
          isActive: true,
          AND: [
            { orders: { some: { status: OrderStatus.DELIVERED } } },
            { orders: { none: { createdAt: { gte: inactivityCutoff } } } },
          ],
        },
        select: { id: true },
        take: WIN_BACK_BATCH,
      });

      for (const { id: userId } of candidates) {
        // eslint-disable-next-line no-await-in-loop
        const alreadyNotified = await this.hasRecentNotification({
          event: 'marketing.win_back',
          since: dedupeSince,
          userId,
        });
        if (alreadyNotified) continue;

        // eslint-disable-next-line no-await-in-loop
        await this.safeNotify('marketing.win_back', { userId, data: { userId } });
      }
    } catch (error) {
      this.logger.error(`handleWinBack failed: ${this.errorMessage(error)}`);
    }
  }

  // ---------- 7. RFQ follow-up ----------

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleRfqFollowups(): Promise<void> {
    try {
      const staleCutoff = new Date(Date.now() - RFQ_FOLLOWUP_STALE_HOURS * 60 * 60 * 1000);
      const dedupeSince = new Date(Date.now() - RFQ_FOLLOWUP_DEDUPE_HOURS * 60 * 60 * 1000);

      const rfqs = await this.prisma.rfq.findMany({
        where: {
          status: { in: [RfqStatus.SUBMITTED, RfqStatus.SALES_REVIEW] },
          updatedAt: { lt: staleCutoff },
        },
        orderBy: { updatedAt: 'asc' },
        take: RFQ_FOLLOWUP_BATCH,
      });

      for (const rfq of rfqs) {
        // eslint-disable-next-line no-await-in-loop
        const alreadyNotified = await this.hasRecentNotification({
          event: 'marketing.rfq_followup',
          since: dedupeSince,
          payloadPath: ['rfqId'],
          payloadValue: rfq.id,
        });
        if (alreadyNotified) continue;

        // eslint-disable-next-line no-await-in-loop
        await this.safeNotify('marketing.rfq_followup', {
          to: SALES_INBOX_EMAIL,
          data: { rfqNumber: rfq.rfqNumber, rfqId: rfq.id, status: rfq.status },
        });
      }
    } catch (error) {
      this.logger.error(`handleRfqFollowups failed: ${this.errorMessage(error)}`);
    }
  }

  // ---------- Internals ----------

  /**
   * Checks the Notification log for a prior send of `event` within the lookback
   * window, optionally narrowed to a specific userId and/or a specific id nested
   * in the JSON payload (e.g. `{ path: ['cartId'], payloadValue: cart.id }`).
   */
  private async hasRecentNotification(params: {
    event: string;
    since: Date;
    userId?: string;
    payloadPath?: string[];
    payloadValue?: string;
  }): Promise<boolean> {
    const { event, since, userId, payloadPath, payloadValue } = params;
    const count = await this.prisma.notification.count({
      where: {
        event,
        createdAt: { gte: since },
        ...(userId ? { userId } : {}),
        ...(payloadPath && payloadValue !== undefined
          ? { payload: { path: payloadPath, equals: payloadValue } }
          : {}),
      },
    });
    return count > 0;
  }

  /** Defensive redundancy around NotificationsService#notify(), which already never throws. */
  private async safeNotify(
    event: string,
    params: { userId?: string; to?: string; data: Record<string, unknown> },
  ): Promise<void> {
    try {
      await this.notifications.notify(event, params);
    } catch (error) {
      this.logger.error(`notify("${event}") failed: ${this.errorMessage(error)}`);
    }
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
