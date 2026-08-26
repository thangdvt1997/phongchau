import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ExchangeRate } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface ConvertResult {
  amount: number;
  currency: string;
  rate: number;
}

// VND is the implicit base currency (see schema.prisma comment above ExchangeRate) — it
// is always available at rate 1 and never gets a row of its own in the exchange_rates table.
const BASE_CURRENCY = 'VND';
const CURRENCY_CODE_PATTERN = /^[A-Za-z]{3}$/;

/** Plain-object shape used by both the public and admin controllers so the raw Prisma
 * Decimal never leaks into a JSON response. */
export function serializeExchangeRate(rate: ExchangeRate) {
  return {
    id: rate.id,
    targetCurrency: rate.targetCurrency,
    rate: Number(rate.rate),
    updatedAt: rate.updatedAt,
  };
}

/** Synthetic entry for VND — not a real ExchangeRate row, offered for frontend convenience
 * so callers of GET /currency/rates don't need to special-case VND. */
export const VND_DISPLAY_RATE = { targetCurrency: BASE_CURRENCY, rate: 1 };

/**
 * Pure-ish DISPLAY-only currency conversion, analogous to ShippingService.calculateShipping:
 * a small stateless calculation on top of admin-managed ExchangeRate rows. Orders/Payments/
 * Cart never call this — they keep settling in VND, exactly as today (see ROADMAP.md).
 */
@Injectable()
export class CurrencyService {
  constructor(private readonly prisma: PrismaService) {}

  async convert(amountVnd: number, targetCurrency: string): Promise<ConvertResult | null> {
    const code = targetCurrency?.toUpperCase();
    if (code === BASE_CURRENCY) {
      return { amount: amountVnd, currency: BASE_CURRENCY, rate: 1 };
    }

    const rateRow = await this.prisma.exchangeRate.findUnique({ where: { targetCurrency: code } });
    if (!rateRow) {
      return null;
    }

    const rate = Number(rateRow.rate);
    return { amount: amountVnd * rate, currency: code, rate };
  }

  async listRates(): Promise<ExchangeRate[]> {
    return this.prisma.exchangeRate.findMany({ orderBy: { targetCurrency: 'asc' } });
  }

  async upsertRate(targetCurrency: string, rate: number): Promise<ExchangeRate> {
    const code = targetCurrency?.toUpperCase();
    if (!code || !CURRENCY_CODE_PATTERN.test(code)) {
      throw new BadRequestException('targetCurrency must be a 3-letter currency code');
    }
    if (code === BASE_CURRENCY) {
      throw new BadRequestException(
        'VND is the implicit base currency at rate 1 and does not need an exchange rate row',
      );
    }
    if (!(rate > 0)) {
      throw new BadRequestException('rate must be greater than 0');
    }

    return this.prisma.exchangeRate.upsert({
      where: { targetCurrency: code },
      create: { targetCurrency: code, rate },
      update: { rate },
    });
  }

  async deleteRate(id: string): Promise<void> {
    const existing = await this.prisma.exchangeRate.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`ExchangeRate ${id} not found`);
    }
    if (existing.targetCurrency === BASE_CURRENCY) {
      throw new BadRequestException('VND is the implicit base currency and cannot be deleted');
    }

    await this.prisma.exchangeRate.delete({ where: { id } });
  }
}
