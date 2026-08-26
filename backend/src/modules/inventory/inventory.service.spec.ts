import { BadRequestException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      inventory: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      inventoryTransaction: {
        create: jest.fn(),
      },
      $transaction: jest.fn((cb: any) => cb(prisma)),
    };
    service = new InventoryService(prisma as unknown as PrismaService);
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
  });
});
