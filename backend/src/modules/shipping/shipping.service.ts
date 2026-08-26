import { Injectable } from '@nestjs/common';
import { ShippingMethodType, ShippingZone } from '@prisma/client';

const VIETNAM_NAMES = ['vietnam', 'viet nam', 'vn'];

const ASEAN_NAMES = [
  'thailand',
  'singapore',
  'malaysia',
  'indonesia',
  'philippines',
  'cambodia',
  'laos',
  'myanmar',
  'brunei',
];

const ASIA_NAMES = [
  'china',
  'cn',
  'japan',
  'jp',
  'korea',
  'south korea',
  'kr',
  'india',
  'in',
  'taiwan',
  'hong kong',
];

const EUROPE_NAMES = [
  'united kingdom',
  'uk',
  'gb',
  'france',
  'germany',
  'italy',
  'spain',
  'netherlands',
  'belgium',
  'portugal',
  'sweden',
  'norway',
  'denmark',
  'finland',
  'poland',
  'switzerland',
  'austria',
  'ireland',
  'greece',
];

const NORTH_AMERICA_NAMES = ['united states', 'usa', 'us', 'canada', 'mexico'];

// Placeholder per-kg rate table (VND), P0 only. Real carrier rates (GHN/GHTK/DHL/etc.)
// are explicitly scoped as P1+ carrier-API integration work — see spec sections 12/13.
const ZONE_RATE_PER_KG: Partial<Record<ShippingZone, number>> = {
  [ShippingZone.ASEAN]: 50_000,
  [ShippingZone.ASIA]: 80_000,
  [ShippingZone.EUROPE]: 150_000,
  [ShippingZone.NORTH_AMERICA]: 180_000,
  [ShippingZone.GLOBAL]: 200_000,
};

const VIETNAM_FREE_SHIPPING_THRESHOLD = 2_000_000;
const VIETNAM_FLAT_RATE = 30_000;
const MIN_BILLABLE_WEIGHT_KG = 1;

export interface CalculateShippingParams {
  destinationCountry: string;
  weightKg: number;
  subtotal: number;
  currency?: string;
}

export interface CalculateShippingResult {
  zone: ShippingZone;
  method: ShippingMethodType;
  cost: number;
  currency: string;
}

/**
 * Deterministic P0 shipping calculator: flat/free rate domestically, weight-based
 * per-zone rates internationally. No external calls — consumed by Cart (checkout
 * preview) and Orders (shipment creation) modules, built separately.
 */
@Injectable()
export class ShippingService {
  calculateShipping(params: {
    destinationCountry: string;
    weightKg: number;
    subtotal: number;
    currency?: string;
  }): { zone: ShippingZone; method: ShippingMethodType; cost: number; currency: string } {
    const zone = this.resolveZone(params.destinationCountry);
    const currency = params.currency ?? 'VND';

    if (zone === ShippingZone.VIETNAM) {
      if (params.subtotal >= VIETNAM_FREE_SHIPPING_THRESHOLD) {
        return { zone, method: ShippingMethodType.FREE, cost: 0, currency };
      }
      return { zone, method: ShippingMethodType.FLAT_RATE, cost: VIETNAM_FLAT_RATE, currency };
    }

    const billableWeight = Math.max(params.weightKg, MIN_BILLABLE_WEIGHT_KG);
    const rate = ZONE_RATE_PER_KG[zone] ?? (ZONE_RATE_PER_KG[ShippingZone.GLOBAL] as number);
    return {
      zone,
      method: ShippingMethodType.ZONE_BASED,
      cost: rate * billableWeight,
      currency,
    };
  }

  private resolveZone(destinationCountry: string): ShippingZone {
    const normalized = destinationCountry.trim().toLowerCase();
    if (VIETNAM_NAMES.includes(normalized)) return ShippingZone.VIETNAM;
    if (ASEAN_NAMES.includes(normalized)) return ShippingZone.ASEAN;
    if (ASIA_NAMES.includes(normalized)) return ShippingZone.ASIA;
    if (EUROPE_NAMES.includes(normalized)) return ShippingZone.EUROPE;
    if (NORTH_AMERICA_NAMES.includes(normalized)) return ShippingZone.NORTH_AMERICA;
    return ShippingZone.GLOBAL;
  }
}
