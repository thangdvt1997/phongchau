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
