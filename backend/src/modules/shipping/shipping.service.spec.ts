import { ShippingService } from './shipping.service';
import { ShippingMethodType, ShippingZone } from '@prisma/client';

describe('ShippingService', () => {
  let service: ShippingService;

  beforeEach(() => {
    service = new ShippingService();
  });

  describe('VIETNAM zone', () => {
    it('is free above the free-shipping threshold', () => {
      const result = service.calculateShipping({
        destinationCountry: 'Vietnam',
        weightKg: 3,
        subtotal: 2_000_000,
      });
      expect(result).toEqual({
        zone: ShippingZone.VIETNAM,
        method: ShippingMethodType.FREE,
        cost: 0,
        currency: 'VND',
      });
    });

    it('is flat-rate just below the free-shipping threshold', () => {
      const result = service.calculateShipping({
        destinationCountry: 'Vietnam',
        weightKg: 3,
        subtotal: 1_999_999,
      });
      expect(result).toEqual({
        zone: ShippingZone.VIETNAM,
        method: ShippingMethodType.FLAT_RATE,
        cost: 30_000,
        currency: 'VND',
      });
    });

    it('matches the "VN" ISO code case-insensitively', () => {
      const result = service.calculateShipping({
        destinationCountry: 'vn',
        weightKg: 1,
        subtotal: 0,
      });
      expect(result.zone).toBe(ShippingZone.VIETNAM);
      expect(result.method).toBe(ShippingMethodType.FLAT_RATE);
    });

    it('is unaffected by weight (flat/free regardless of weightKg)', () => {
      const result = service.calculateShipping({
        destinationCountry: 'Vietnam',
        weightKg: 50,
        subtotal: 100_000,
      });
      expect(result.cost).toBe(30_000);
    });
  });

  describe('ASEAN zone', () => {
    it('charges the per-kg ASEAN rate', () => {
      const result = service.calculateShipping({
        destinationCountry: 'Thailand',
        weightKg: 5,
        subtotal: 500_000,
      });
      expect(result).toEqual({
        zone: ShippingZone.ASEAN,
        method: ShippingMethodType.ZONE_BASED,
        cost: 250_000,
        currency: 'VND',
      });
    });

    it('bills a minimum of 1kg for sub-1kg shipments', () => {
      const result = service.calculateShipping({
        destinationCountry: 'Singapore',
        weightKg: 0.2,
        subtotal: 500_000,
      });
      expect(result.cost).toBe(50_000);
    });
  });

  describe('EUROPE zone', () => {
    it('charges the per-kg Europe rate', () => {
      const result = service.calculateShipping({
        destinationCountry: 'Germany',
        weightKg: 2,
        subtotal: 1_000_000,
      });
      expect(result).toEqual({
        zone: ShippingZone.EUROPE,
        method: ShippingMethodType.ZONE_BASED,
        cost: 300_000,
        currency: 'VND',
      });
    });
  });

  describe('NORTH_AMERICA zone', () => {
    it('charges the per-kg North America rate', () => {
      const result = service.calculateShipping({
        destinationCountry: 'Canada',
        weightKg: 4,
        subtotal: 1_000_000,
      });
      expect(result).toEqual({
        zone: ShippingZone.NORTH_AMERICA,
        method: ShippingMethodType.ZONE_BASED,
        cost: 720_000,
        currency: 'VND',
      });
    });
  });

  describe('ASIA zone', () => {
    it('charges the per-kg Asia rate', () => {
      const result = service.calculateShipping({
        destinationCountry: 'Japan',
        weightKg: 3,
        subtotal: 1_000_000,
      });
      expect(result).toEqual({
        zone: ShippingZone.ASIA,
        method: ShippingMethodType.ZONE_BASED,
        cost: 240_000,
        currency: 'VND',
      });
    });
  });

  describe('GLOBAL fallback', () => {
    it('falls back to GLOBAL for an unrecognized country', () => {
      const result = service.calculateShipping({
        destinationCountry: 'Atlantis',
        weightKg: 2,
        subtotal: 1_000_000,
      });
      expect(result).toEqual({
        zone: ShippingZone.GLOBAL,
        method: ShippingMethodType.ZONE_BASED,
        cost: 400_000,
        currency: 'VND',
      });
    });
  });

  describe('currency override', () => {
    it('defaults to VND when currency is omitted', () => {
      const result = service.calculateShipping({
        destinationCountry: 'Vietnam',
        weightKg: 1,
        subtotal: 3_000_000,
      });
      expect(result.currency).toBe('VND');
    });

    it('passes through an explicit currency', () => {
      const result = service.calculateShipping({
        destinationCountry: 'Germany',
        weightKg: 1,
        subtotal: 1_000_000,
        currency: 'USD',
      });
      expect(result.currency).toBe('USD');
    });
  });
});
