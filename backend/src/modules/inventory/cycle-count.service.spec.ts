import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CycleCountStatus, InventoryTxnType } from '@prisma/client';
import { CycleCountService } from './cycle-count.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('CycleCountService', () => {
  let service: CycleCountService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      warehouse: {
        findUnique: jest.fn().mockResolvedValue({ id: 'w1' }),
      },
      productVariant: {
        findUnique: jest.fn().mockResolvedValue({ id: 'v1' }),
      },
      inventory: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      inventoryTransaction: {
        create: jest.fn(),
      },
      cycleCount: {
        create: jest.fn((args: any) => args.data),
        findUnique: jest.fn(),
        update: jest.fn((args: any) => args.data),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn((cb: any) => cb(prisma)),
    };
    service = new CycleCountService(prisma as unknown as PrismaService);
  });

  describe('start', () => {
    it('throws NotFoundException for a warehouseId that does not exist', async () => {
      prisma.warehouse.findUnique.mockResolvedValue(null);
      await expect(service.start({ warehouseId: 'missing', productVariantId: 'v1' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws NotFoundException for a productVariantId that does not exist', async () => {
      prisma.productVariant.findUnique.mockResolvedValue(null);
      await expect(service.start({ warehouseId: 'w1', productVariantId: 'missing' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('sets expectedQuantity to 0 when no Inventory row exists yet', async () => {
      prisma.inventory.findFirst.mockResolvedValue(null);
      const result = await service.start({ warehouseId: 'w1', productVariantId: 'v1' });
      expect(result.expectedQuantity).toBe(0);
      expect(result.status).toBe(CycleCountStatus.OPEN);
    });

    it('snapshots expectedQuantity from the current Inventory.quantityOnHand', async () => {
      prisma.inventory.findFirst.mockResolvedValue({ quantityOnHand: 42, quantityReserved: 5 });
      const result = await service.start({ warehouseId: 'w1', productVariantId: 'v1' });
      expect(result.expectedQuantity).toBe(42);
    });
  });

  describe('complete', () => {
    it('throws NotFoundException when the cycle count does not exist', async () => {
      prisma.cycleCount.findUnique.mockResolvedValue(null);
      await expect(service.complete('missing', { actualQuantity: 10 })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects completing a count that is already COMPLETED', async () => {
      prisma.cycleCount.findUnique.mockResolvedValue({ id: 'c1', status: CycleCountStatus.COMPLETED });
      await expect(service.complete('c1', { actualQuantity: 10 })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('when actualQuantity matches expectedQuantity, skips Inventory writes but still completes', async () => {
      prisma.cycleCount.findUnique.mockResolvedValue({
        id: 'c1',
        status: CycleCountStatus.OPEN,
        expectedQuantity: 20,
        warehouseId: 'w1',
        productVariantId: 'v1',
      });

      const result = await service.complete('c1', { actualQuantity: 20 }, 'user1');

      expect(prisma.inventory.update).not.toHaveBeenCalled();
      expect(prisma.inventoryTransaction.create).not.toHaveBeenCalled();
      expect(result.discrepancy).toBe(0);
      expect(result.status).toBe(CycleCountStatus.COMPLETED);
      expect(result.countedBy).toBe('user1');
    });

    it('when actualQuantity differs, reconciles Inventory.quantityOnHand and logs a CYCLE_COUNT txn with the discrepancy', async () => {
      prisma.cycleCount.findUnique.mockResolvedValue({
        id: 'c1',
        status: CycleCountStatus.OPEN,
        expectedQuantity: 20,
        warehouseId: 'w1',
        productVariantId: 'v1',
      });
      prisma.inventory.findFirst.mockResolvedValue({ id: 'inv1', quantityOnHand: 20, quantityReserved: 0 });

      const result = await service.complete('c1', { actualQuantity: 17 }, 'user1');

      expect(prisma.inventory.update).toHaveBeenCalledWith({
        where: { id: 'inv1' },
        data: { quantityOnHand: 17 },
      });
      expect(prisma.inventoryTransaction.create).toHaveBeenCalledWith({
        data: { inventoryId: 'inv1', type: InventoryTxnType.CYCLE_COUNT, quantity: -3, reference: 'c1' },
      });
      expect(result.discrepancy).toBe(-3);
      expect(result.actualQuantity).toBe(17);
    });

    it('creates the Inventory row when none exists yet and the count found a discrepancy from 0', async () => {
      prisma.cycleCount.findUnique.mockResolvedValue({
        id: 'c1',
        status: CycleCountStatus.OPEN,
        expectedQuantity: 0,
        warehouseId: 'w1',
        productVariantId: 'v1',
      });
      prisma.inventory.findFirst.mockResolvedValue(null);
      prisma.inventory.create.mockResolvedValue({ id: 'inv-new', quantityOnHand: 0, quantityReserved: 0 });

      await service.complete('c1', { actualQuantity: 8 });

      expect(prisma.inventory.create).toHaveBeenCalledWith({
        data: { productVariantId: 'v1', warehouseId: 'w1', quantityOnHand: 0, quantityReserved: 0 },
      });
      expect(prisma.inventory.update).toHaveBeenCalledWith({
        where: { id: 'inv-new' },
        data: { quantityOnHand: 8 },
      });
    });
  });
});
