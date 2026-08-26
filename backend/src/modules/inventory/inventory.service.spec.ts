import { BadRequestException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MarketingAutomationService } from '../marketing/marketing-automation.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: any;
  let marketingAutomation: { notifyBackInStockIfNeeded: jest.Mock };

  beforeEach(() => {
    prisma = {
      inventory: {
        // adjust()'s back-in-stock hook is fire-and-forget and calls
        // getAvailableStock() (-> findMany) after commit; default to an empty
        // result so that async tail doesn't throw in tests that don't care about it.
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      inventoryTransaction: {
        create: jest.fn(),
      },
      productVariant: {
        findUnique: jest.fn().mockResolvedValue({ id: 'v1' }),
      },
      warehouse: {
        findUnique: jest.fn().mockResolvedValue({ id: 'w1' }),
      },
      $transaction: jest.fn((cb: any) => cb(prisma)),
    };
    marketingAutomation = { notifyBackInStockIfNeeded: jest.fn().mockResolvedValue(undefined) };
    service = new InventoryService(
      prisma as unknown as PrismaService,
      marketingAutomation as unknown as MarketingAutomationService,
    );
  });

  describe('getAvailableStock', () => {
    it('sums (onHand - reserved) across all warehouses', async () => {
      prisma.inventory.findMany.mockResolvedValue([
        { quantityOnHand: 10, quantityReserved: 2 },
        { quantityOnHand: 5, quantityReserved: 5 },
      ]);
      const result = await service.getAvailableStock('variant1');
      expect(result).toBe(8);
    });
  });

  describe('reserveStock', () => {
    it('throws BadRequestException when total available stock is insufficient', async () => {
      prisma.inventory.findMany.mockResolvedValue([{ id: 'inv1', quantityOnHand: 3, quantityReserved: 0 }]);
      await expect(service.reserveStock('variant1', 5)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.inventory.update).not.toHaveBeenCalled();
    });

    it('spreads the reservation across warehouses in order and logs RESERVE transactions', async () => {
      prisma.inventory.findMany.mockResolvedValue([
        { id: 'inv1', quantityOnHand: 3, quantityReserved: 0 },
        { id: 'inv2', quantityOnHand: 10, quantityReserved: 2 },
      ]);

      await service.reserveStock('variant1', 5);

      expect(prisma.inventory.update).toHaveBeenCalledWith({
        where: { id: 'inv1' },
        data: { quantityReserved: { increment: 3 } },
      });
      expect(prisma.inventory.update).toHaveBeenCalledWith({
        where: { id: 'inv2' },
        data: { quantityReserved: { increment: 2 } },
      });
      expect(prisma.inventoryTransaction.create).toHaveBeenCalledTimes(2);
    });

    it('rejects a non-positive quantity', async () => {
      await expect(service.reserveStock('variant1', 0)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('releaseStock', () => {
    it('never decrements reserved stock below 0 and caps release per row', async () => {
      prisma.inventory.findMany.mockResolvedValue([{ id: 'inv1', quantityOnHand: 10, quantityReserved: 2 }]);

      await service.releaseStock('variant1', 5);

      expect(prisma.inventory.update).toHaveBeenCalledWith({
        where: { id: 'inv1' },
        data: { quantityReserved: { decrement: 2 } },
      });
      expect(prisma.inventoryTransaction.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('adjust', () => {
    it('creates an Inventory row with 0 stock when none exists, then applies IN', async () => {
      prisma.inventory.findFirst.mockResolvedValue(null);
      prisma.inventory.create.mockResolvedValue({ id: 'inv1', quantityOnHand: 0, quantityReserved: 0 });
      prisma.inventory.update.mockResolvedValue({ id: 'inv1', quantityOnHand: 10 });

      await service.adjust({
        productVariantId: 'v1',
        warehouseId: 'w1',
        quantity: 10,
        type: 'IN',
      });

      expect(prisma.inventory.create).toHaveBeenCalled();
      expect(prisma.inventory.update).toHaveBeenCalledWith({
        where: { id: 'inv1' },
        data: { quantityOnHand: 10 },
      });
    });

    it('throws BadRequestException when an OUT would go negative', async () => {
      prisma.inventory.findFirst.mockResolvedValue({ id: 'inv1', quantityOnHand: 2, quantityReserved: 0 });

      await expect(
        service.adjust({ productVariantId: 'v1', warehouseId: 'w1', quantity: 5, type: 'OUT' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.inventory.update).not.toHaveBeenCalled();
    });

    // Regression: adjust() used to call tx.inventory.create() straight from a client-supplied
    // productVariantId/warehouseId with no existence check, so a bogus id tripped Prisma's FK
    // constraint and surfaced as a raw 500 instead of a clean 400.
    it('throws BadRequestException for a productVariantId that does not exist, without touching inventory', async () => {
      prisma.productVariant.findUnique.mockResolvedValue(null);

      await expect(
        service.adjust({ productVariantId: 'missing-variant', warehouseId: 'w1', quantity: 5, type: 'IN' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.inventory.findFirst).not.toHaveBeenCalled();
      expect(prisma.inventory.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException for a warehouseId that does not exist, without touching inventory', async () => {
      prisma.warehouse.findUnique.mockResolvedValue(null);

      await expect(
        service.adjust({ productVariantId: 'v1', warehouseId: 'missing-warehouse', quantity: 5, type: 'IN' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.inventory.findFirst).not.toHaveBeenCalled();
      expect(prisma.inventory.create).not.toHaveBeenCalled();
    });

    // DAMAGE/EXPIRE write-off support added for cycle count / write-off feature work.
    it('throws BadRequestException for a DAMAGE adjustment with no reference', async () => {
      await expect(
        service.adjust({ productVariantId: 'v1', warehouseId: 'w1', quantity: 5, type: 'DAMAGE' as any }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.inventory.findFirst).not.toHaveBeenCalled();
    });

    it('throws BadRequestException for an EXPIRE adjustment with no reference', async () => {
      await expect(
        service.adjust({ productVariantId: 'v1', warehouseId: 'w1', quantity: 5, type: 'EXPIRE' as any }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.inventory.findFirst).not.toHaveBeenCalled();
    });

    it('decreases quantityOnHand for a DAMAGE adjustment with a reference, same as OUT', async () => {
      prisma.inventory.findFirst.mockResolvedValue({ id: 'inv1', quantityOnHand: 10, quantityReserved: 0 });
      prisma.inventory.update.mockResolvedValue({ id: 'inv1', quantityOnHand: 7 });

      await service.adjust({
        productVariantId: 'v1',
        warehouseId: 'w1',
        quantity: 3,
        type: 'DAMAGE' as any,
        reference: 'Crushed carton in transit',
      });

      expect(prisma.inventory.update).toHaveBeenCalledWith({
        where: { id: 'inv1' },
        data: { quantityOnHand: 7 },
      });
    });

    it('decreases quantityOnHand for an EXPIRE adjustment with a reference, same as OUT', async () => {
      prisma.inventory.findFirst.mockResolvedValue({ id: 'inv1', quantityOnHand: 10, quantityReserved: 0 });
      prisma.inventory.update.mockResolvedValue({ id: 'inv1', quantityOnHand: 8 });

      await service.adjust({
        productVariantId: 'v1',
        warehouseId: 'w1',
        quantity: 2,
        type: 'EXPIRE' as any,
        reference: 'Past shelf life date',
      });

      expect(prisma.inventory.update).toHaveBeenCalledWith({
        where: { id: 'inv1' },
        data: { quantityOnHand: 8 },
      });
    });
  });
});
