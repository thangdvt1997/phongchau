import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CompanyStatus } from '@prisma/client';

export type PriceSource = 'CUSTOMER_PRICE' | 'PRICE_TIER' | 'BASE_PRICE';

export interface ResolveUnitPriceParams {
  productId: string;
  basePrice: number;
  currency: string;
  quantity: number;
  companyId?: string | null;
}

export interface ResolveUnitPriceResult {
  unitPrice: number;
  currency: string;
  source: PriceSource;
}

/**
 * Resolves the price a given customer pays for a product/quantity, in priority order:
 *   1. CustomerPrice (per-company contract price) — only for APPROVED companies.
 *   2. PriceTier (volume pricing) — applies to all customers.
 *   3. Product.basePrice — fallback.
 *
 * This service is consumed by other modules (Cart, Orders) — the method signature below
 * is a stable public contract and must not change shape.
 */
@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveUnitPrice(params: {
    productId: string;
    basePrice: number;
    currency: string;
    quantity: number;
    companyId?: string | null;
  }): Promise<{ unitPrice: number; currency: string; source: PriceSource }> {
    const { productId, basePrice, currency, quantity, companyId } = params;
    const now = new Date();

    if (companyId) {
      const company = await this.prisma.company.findUnique({ where: { id: companyId } });
      if (company && company.status === CompanyStatus.APPROVED) {
        const customerPrice = await this.prisma.customerPrice.findFirst({
          where: {
            companyId,
            productId,
            AND: [
              { OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
              { OR: [{ validTo: null }, { validTo: { gte: now } }] },
            ],
          },
        });
        if (customerPrice) {
          return {
            unitPrice: Number(customerPrice.price),
            currency: customerPrice.currency,
            source: 'CUSTOMER_PRICE',
          };
        }
      }
    }

    const matchingTiers = await this.prisma.priceTier.findMany({
      where: {
        productId,
        minQty: { lte: quantity },
        OR: [{ maxQty: null }, { maxQty: { gte: quantity } }],
      },
      orderBy: { minQty: 'desc' },
    });

    if (matchingTiers.length > 0) {
      // Defensive: admin-side validation should prevent overlapping tiers for a product,
      // but if it ever happens, the most specific (highest minQty) tier wins.
      const best = matchingTiers.reduce((acc, tier) => (tier.minQty > acc.minQty ? tier : acc));
      return {
        unitPrice: Number(best.price),
        currency: best.currency,
        source: 'PRICE_TIER',
      };
    }

    return { unitPrice: basePrice, currency, source: 'BASE_PRICE' };
  }
}
