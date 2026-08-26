import { PricingService } from './pricing.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CompanyStatus } from '@prisma/client';

describe('PricingService', () => {
  let service: PricingService;
  let prisma: any;

  const baseParams = {
    productId: 'prod-1',
    basePrice: 100,
    currency: 'VND',
    quantity: 5,
  };

  beforeEach(() => {
    prisma = {
      company: {
        findUnique: jest.fn(),
      },
      customerPrice: {
        findFirst: jest.fn(),
      },
      priceTier: {
        findMany: jest.fn(),
      },
    };
    service = new PricingService(prisma as unknown as PrismaService);
  });

  describe('CUSTOMER_PRICE branch', () => {
    it('returns the customer contract price when the company is APPROVED and a valid price exists', async () => {
      prisma.company.findUnique.mockResolvedValue({
        id: 'company-1',
        status: CompanyStatus.APPROVED,
      });
      prisma.customerPrice.findFirst.mockResolvedValue({
        id: 'cp-1',
        companyId: 'company-1',
        productId: 'prod-1',
        price: 80,
        currency: 'USD',
      });

      const result = await service.resolveUnitPrice({ ...baseParams, companyId: 'company-1' });

      expect(result).toEqual({ unitPrice: 80, currency: 'USD', source: 'CUSTOMER_PRICE' });
      expect(prisma.customerPrice.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ companyId: 'company-1', productId: 'prod-1' }),
        }),
      );
      expect(prisma.priceTier.findMany).not.toHaveBeenCalled();
    });

    it('falls through to tier/base pricing when companyId is given but the company is not APPROVED', async () => {
      prisma.company.findUnique.mockResolvedValue({
        id: 'company-1',
        status: CompanyStatus.PENDING,
      });
      prisma.priceTier.findMany.mockResolvedValue([]);

      const result = await service.resolveUnitPrice({ ...baseParams, companyId: 'company-1' });

      expect(prisma.customerPrice.findFirst).not.toHaveBeenCalled();
      expect(result).toEqual({ unitPrice: 100, currency: 'VND', source: 'BASE_PRICE' });
    });

    it('falls through to tier/base pricing when the company cannot be found', async () => {
      prisma.company.findUnique.mockResolvedValue(null);
      prisma.priceTier.findMany.mockResolvedValue([]);

      const result = await service.resolveUnitPrice({ ...baseParams, companyId: 'ghost-co' });

      expect(prisma.customerPrice.findFirst).not.toHaveBeenCalled();
      expect(result.source).toBe('BASE_PRICE');
    });

    it('falls through to tier/base pricing when the company is APPROVED but has no matching customer price', async () => {
      prisma.company.findUnique.mockResolvedValue({
        id: 'company-1',
        status: CompanyStatus.APPROVED,
      });
      prisma.customerPrice.findFirst.mockResolvedValue(null);
      prisma.priceTier.findMany.mockResolvedValue([]);

      const result = await service.resolveUnitPrice({ ...baseParams, companyId: 'company-1' });

      expect(result.source).toBe('BASE_PRICE');
    });
  });

  describe('PRICE_TIER branch', () => {
    it('returns the matching tier price when no companyId is given', async () => {
      prisma.priceTier.findMany.mockResolvedValue([
        { id: 'tier-1', minQty: 1, maxQty: 9, price: 90, currency: 'VND' },
      ]);

      const result = await service.resolveUnitPrice(baseParams);

      expect(result).toEqual({ unitPrice: 90, currency: 'VND', source: 'PRICE_TIER' });
      expect(prisma.company.findUnique).not.toHaveBeenCalled();
    });

    it('defensively picks the tier with the highest minQty when multiple tiers match (overlap)', async () => {
      // Overlap shouldn't happen thanks to admin-side validation, but be defensive anyway.
      prisma.priceTier.findMany.mockResolvedValue([
        { id: 'tier-low', minQty: 1, maxQty: 100, price: 90, currency: 'VND' },
        { id: 'tier-high', minQty: 5, maxQty: 50, price: 70, currency: 'VND' },
      ]);

      const result = await service.resolveUnitPrice(baseParams);

      expect(result).toEqual({ unitPrice: 70, currency: 'VND', source: 'PRICE_TIER' });
    });

    it('treats a null maxQty as unbounded ("and above")', async () => {
      prisma.priceTier.findMany.mockResolvedValue([
        { id: 'tier-bulk', minQty: 5, maxQty: null, price: 60, currency: 'VND' },
      ]);

      const result = await service.resolveUnitPrice({ ...baseParams, quantity: 1000 });

      expect(result).toEqual({ unitPrice: 60, currency: 'VND', source: 'PRICE_TIER' });
    });
  });

  describe('BASE_PRICE branch', () => {
    it('falls back to the product base price when there is no companyId and no matching tier', async () => {
      prisma.priceTier.findMany.mockResolvedValue([]);

      const result = await service.resolveUnitPrice(baseParams);

      expect(result).toEqual({ unitPrice: 100, currency: 'VND', source: 'BASE_PRICE' });
    });
  });
});
