import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CurrencyService } from './currency.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('CurrencyService', () => {
  let service: CurrencyService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      exchangeRate: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new CurrencyService(prisma as unknown as PrismaService);
  });

  describe('convert', () => {
    it('short-circuits for VND without touching the database', async () => {
      const result = await service.convert(1_000_000, 'VND');
      expect(result).toEqual({ amount: 1_000_000, currency: 'VND', rate: 1 });
      expect(prisma.exchangeRate.findUnique).not.toHaveBeenCalled();
    });

    it('converts using a configured rate', async () => {
      prisma.exchangeRate.findUnique.mockResolvedValue({
        id: 'r1',
        targetCurrency: 'USD',
        rate: 0.00004,
      });

      const result = await service.convert(1_000_000, 'usd');

      expect(prisma.exchangeRate.findUnique).toHaveBeenCalledWith({ where: { targetCurrency: 'USD' } });
      expect(result).toEqual({ amount: 40, currency: 'USD', rate: 0.00004 });
    });

    it('returns null when no rate is configured for the target currency', async () => {
      prisma.exchangeRate.findUnique.mockResolvedValue(null);

      const result = await service.convert(1_000_000, 'EUR');

      expect(result).toBeNull();
    });
  });

  describe('listRates', () => {
    it('returns all configured rates', async () => {
      const rows = [{ id: 'r1', targetCurrency: 'USD', rate: 0.00004, updatedAt: new Date() }];
      prisma.exchangeRate.findMany.mockResolvedValue(rows);

      const result = await service.listRates();

      expect(result).toBe(rows);
      expect(prisma.exchangeRate.findMany).toHaveBeenCalledWith({ orderBy: { targetCurrency: 'asc' } });
    });
  });

  describe('upsertRate', () => {
    it('rejects a rate that is not greater than 0', async () => {
      await expect(service.upsertRate('USD', 0)).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.upsertRate('USD', -1)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.exchangeRate.upsert).not.toHaveBeenCalled();
    });

    it('rejects setting a rate for VND itself', async () => {
      await expect(service.upsertRate('VND', 1)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.exchangeRate.upsert).not.toHaveBeenCalled();
    });

    it('rejects a malformed currency code', async () => {
      await expect(service.upsertRate('US', 1)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.exchangeRate.upsert).not.toHaveBeenCalled();
    });

    it('upserts on targetCurrency for a valid rate', async () => {
      prisma.exchangeRate.upsert.mockResolvedValue({ id: 'r1', targetCurrency: 'USD', rate: 0.00004 });

      const result = await service.upsertRate('usd', 0.00004);

      expect(prisma.exchangeRate.upsert).toHaveBeenCalledWith({
        where: { targetCurrency: 'USD' },
        create: { targetCurrency: 'USD', rate: 0.00004 },
        update: { rate: 0.00004 },
      });
      expect(result.targetCurrency).toBe('USD');
    });
  });

  describe('deleteRate', () => {
    it('throws NotFoundException when the rate does not exist', async () => {
      prisma.exchangeRate.findUnique.mockResolvedValue(null);

      await expect(service.deleteRate('missing')).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.exchangeRate.delete).not.toHaveBeenCalled();
    });

    it('rejects deleting VND itself', async () => {
      prisma.exchangeRate.findUnique.mockResolvedValue({ id: 'v1', targetCurrency: 'VND' });

      await expect(service.deleteRate('v1')).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.exchangeRate.delete).not.toHaveBeenCalled();
    });

    it('deletes an existing non-VND rate', async () => {
      prisma.exchangeRate.findUnique.mockResolvedValue({ id: 'r1', targetCurrency: 'USD' });

      await service.deleteRate('r1');

      expect(prisma.exchangeRate.delete).toHaveBeenCalledWith({ where: { id: 'r1' } });
    });
  });
});
