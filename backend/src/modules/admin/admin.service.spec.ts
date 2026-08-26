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
      $queryRaw: jest.fn().mockResolvedValue([{ count: BigInt(3) }]),
    };
    service = new AdminService(prisma);
  });

  it('computes average order value from paid revenue and order count', async () => {
    const result = await service.getDashboardOverview(30);
    expect(result.revenue).toBe(500000);
    expect(result.averageOrderValue).toBe(100000);
    expect(result.inventory.lowStockCount).toBe(3);
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
