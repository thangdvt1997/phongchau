import { AdminService } from './admin.service';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      order: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { grandTotal: 500000 }, _count: 5 }),
        count: jest.fn().mockResolvedValue(5),
        findMany: jest.fn().mockResolvedValue([]),
      },
      user: {
        count: jest.fn().mockResolvedValue(10),
        findMany: jest.fn().mockResolvedValue([]),
      },
      product: { count: jest.fn().mockResolvedValue(20) },
      rfq: { count: jest.fn().mockResolvedValue(3) },
      company: { count: jest.fn().mockResolvedValue(2) },
      productBatch: { count: jest.fn().mockResolvedValue(0) },
      orderItem: { groupBy: jest.fn().mockResolvedValue([]) },
      productVariant: { findMany: jest.fn().mockResolvedValue([]) },
      auditLog: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
      // Three distinct raw queries hit $queryRaw: the low-stock inventory check, the
      // "eligible carts" count, and the "abandoned carts" (NOT EXISTS) count — distinguish
      // them by matching on the SQL text rather than call order, so this stays correct
      // even if getDashboardOverview's Promise.all is reordered later.
      $queryRaw: jest.fn().mockImplementation((strings: TemplateStringsArray) => {
        const sql = strings.join('');
        if (sql.includes('inventory')) return Promise.resolve([{ count: BigInt(3) }]);
        if (sql.includes('NOT EXISTS')) return Promise.resolve([{ count: BigInt(4) }]);
        return Promise.resolve([{ count: BigInt(10) }]);
      }),
    };
    service = new AdminService(prisma);
  });

  it('computes average order value from paid revenue and order count', async () => {
    const result = await service.getDashboardOverview(30);
    expect(result.revenue).toBe(500000);
    expect(result.averageOrderValue).toBe(100000);
    expect(result.inventory.lowStockCount).toBe(3);
  });

  it('computes cart and checkout abandonment rates from carts with no later matching order', async () => {
    const result = await service.getDashboardOverview(30);
    // 4 abandoned out of 10 eligible carts (mocked above) = 0.4.
    expect(result.cartAbandonmentRate).toBeCloseTo(0.4);
    // checkoutAbandonmentRate currently reuses the same proxy — no "checkout started"
    // event is persisted server-side to compute a more precise number from.
    expect(result.checkoutAbandonmentRate).toBeCloseTo(0.4);
  });

  it('returns a 0 abandonment rate rather than dividing by zero when there are no eligible carts', async () => {
    prisma.$queryRaw = jest.fn().mockResolvedValue([{ count: BigInt(0) }]);
    const result = await service.getDashboardOverview(30);
    expect(result.cartAbandonmentRate).toBe(0);
    expect(result.checkoutAbandonmentRate).toBe(0);
  });

  it('filters customers by role and search term', async () => {
    await service.listCustomers('B2B_CUSTOMER' as any, 'acme', 1, 20);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ role: 'B2B_CUSTOMER' }),
      }),
    );
  });
});
