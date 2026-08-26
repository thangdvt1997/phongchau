import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OrderStatus, PaymentStatus, Role } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardOverview(sinceDays = 30) {
    const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
    const soon = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const [
      revenueAgg,
      ordersCount,
      customersCount,
      productsCount,
      rfqsCount,
      pendingB2bCount,
      lowStockCount,
      expiredBatchCount,
      upcomingExpiryCount,
      topProductsRaw,
      cartAbandonment,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where: { paymentStatus: PaymentStatus.PAID, createdAt: { gte: since } },
        _sum: { grandTotal: true },
        _count: true,
      }),
      this.prisma.order.count({ where: { createdAt: { gte: since } } }),
      this.prisma.user.count({ where: { role: { in: [Role.RETAIL_CUSTOMER, Role.B2B_CUSTOMER] } } }),
      this.prisma.product.count(),
      this.prisma.rfq.count({ where: { createdAt: { gte: since } } }),
      this.prisma.company.count({ where: { status: 'PENDING' } }),
      this.countLowStock(),
      this.prisma.productBatch.count({ where: { expiryDate: { lt: new Date() } } }),
      this.prisma.productBatch.count({ where: { expiryDate: { gte: new Date(), lte: soon } } }),
      this.prisma.orderItem.groupBy({
        by: ['productVariantId'],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
      this.countCartAbandonment(since),
    ]);

    const revenue = Number(revenueAgg._sum.grandTotal ?? 0);
    const orderCountForAov = revenueAgg._count || 1;

    const topVariantIds = topProductsRaw.map((r) => r.productVariantId);
    const topVariants = topVariantIds.length
      ? await this.prisma.productVariant.findMany({
          where: { id: { in: topVariantIds } },
          include: { product: { select: { name: true, slug: true } } },
        })
      : [];
    const topProducts = topProductsRaw.map((r) => {
      const variant = topVariants.find((v) => v.id === r.productVariantId);
      return {
        productVariantId: r.productVariantId,
        productName: variant?.product?.name ?? 'Unknown',
        productSlug: variant?.product?.slug ?? null,
        quantitySold: r._sum.quantity ?? 0,
      };
    });

    const countriesRaw = await this.prisma.order.findMany({
      where: { createdAt: { gte: since } },
      select: { shippingAddress: { select: { country: true } } },
    });
    const countryCounts = new Map<string, number>();
    for (const o of countriesRaw) {
      const country = o.shippingAddress?.country;
      if (!country) continue;
      countryCounts.set(country, (countryCounts.get(country) ?? 0) + 1);
    }

    // Spec section 34 (Analytics) — internal funnel metrics. cartAbandonmentRate is the
    // real thing: fraction of non-empty carts touched in the window with no matching Order
    // (same userId) placed after the cart was last updated. checkoutAbandonmentRate would
    // ideally be scoped to "started checkout" specifically, but that's a frontend-only
    // `begin_checkout` analytics event (see frontend/src/lib/analytics.ts) that is never
    // persisted server-side — there's no DB row that marks "checkout was started" to query
    // against. Rather than fabricate a more precise number than the data supports, this
    // reuses the exact same cart-vs-order comparison as its proxy; see
    // countCartAbandonment() below for the full rationale.
    const cartAbandonmentRate = cartAbandonment.eligible > 0 ? cartAbandonment.abandoned / cartAbandonment.eligible : 0;
    const checkoutAbandonmentRate = cartAbandonmentRate;

    return {
      revenue,
      ordersCount,
      customersCount,
      productsCount,
      averageOrderValue: revenue / orderCountForAov,
      rfqsCount,
      b2bLeadsCount: pendingB2bCount,
      topProducts,
      countries: Array.from(countryCounts.entries()).map(([country, count]) => ({ country, count })),
      inventory: {
        lowStockCount,
        expiredBatchCount,
        upcomingExpiryCount,
      },
      cartAbandonmentRate,
      checkoutAbandonmentRate,
    };
  }

  /**
   * Cart abandonment proxy (spec section 34): there is no explicit "checkout started" or
   * "cart abandoned" flag anywhere in the schema (see model Cart/CartItem in
   * prisma/schema.prisma), so this infers it — a cart counts as abandoned if it has at
   * least one item, was touched within the window, belongs to a signed-in user (guest
   * carts have no userId to join against, only a sessionId, so they're excluded from both
   * the numerator and denominator rather than silently mis-scored), and that user has NO
   * Order created at/after the cart's updatedAt. Prisma's query API can't express that
   * "no later Order exists" anti-join in one relational query, so — same rationale as
   * countLowStock() — this drops to raw SQL with NOT EXISTS. Column/table names are
   * unquoted-case-sensitive, matching Prisma's generated camelCase columns and @@map'd
   * snake_case table names verbatim.
   */
  private async countCartAbandonment(since: Date): Promise<{ eligible: number; abandoned: number }> {
    const [eligibleRows, abandonedRows] = await Promise.all([
      this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint as count FROM carts c
        WHERE c."updatedAt" >= ${since}
          AND c."userId" IS NOT NULL
          AND EXISTS (SELECT 1 FROM cart_items ci WHERE ci."cartId" = c.id)
      `,
      this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint as count FROM carts c
        WHERE c."updatedAt" >= ${since}
          AND c."userId" IS NOT NULL
          AND EXISTS (SELECT 1 FROM cart_items ci WHERE ci."cartId" = c.id)
          AND NOT EXISTS (
            SELECT 1 FROM orders o
            WHERE o."userId" = c."userId" AND o."createdAt" >= c."updatedAt"
          )
      `,
    ]);
    return {
      eligible: Number(eligibleRows[0]?.count ?? 0),
      abandoned: Number(abandonedRows[0]?.count ?? 0),
    };
  }

  private async countLowStock(): Promise<number> {
    // Prisma's query API can't compare two columns to each other, so this one query
    // needs raw SQL. Column names are unquoted-case-sensitive because Prisma always
    // quotes identifiers it creates, matching the camelCase field names verbatim.
    const rows = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint as count FROM inventory
      WHERE ("quantityOnHand" - "quantityReserved") <= "lowStockThreshold"
    `;
    return Number(rows[0]?.count ?? 0);
  }

  async listCustomers(role?: Role, q?: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const where: any = {};
    if (role) where.role = role;
    if (q) {
      where.OR = [
        { email: { contains: q, mode: 'insensitive' } },
        { fullName: { contains: q, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          role: true,
          isActive: true,
          companyId: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async listAuditLogs(entityType?: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const where = entityType ? { entityType } : {};
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }
}
