import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StockTransferStatus } from '@prisma/client';
import { StockTransferService } from './stock-transfer.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('StockTransferService', () => {
  let service: StockTransferService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      productVariant: {
        findUnique: jest.fn().mockResolvedValue({ id: 'v1' }),
      },
      warehouse: {
        findUnique: jest.fn().mockResolvedValue({ id: 'w1' }),
      },
      inventory: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      inventoryTransaction: {
        create: jest.fn(),
      },
      stockTransfer: {
        create: jest.fn((args: any) => args.data),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn((args: any) => args.data),
      },
      $transaction: jest.fn((cb: any) => cb(prisma)),
    };
    service = new StockTransferService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('rejects when fromWarehouseId equals toWarehouseId', async () => {
      await expect(
        service.create({ productVariantId: 'v1', fromWarehouseId: 'w1', toWarehouseId: 'w1', quantity: 5 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.warehouse.findUnique).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for a productVariantId that does not exist', async () => {
      prisma.productVariant.findUnique.mockResolvedValue(null);
      await expect(
        service.create({ productVariantId: 'missing', fromWarehouseId: 'w1', toWarehouseId: 'w2', quantity: 5 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException for a fromWarehouseId that does not exist', async () => {
      prisma.warehouse.findUnique.mockImplementation(({ where }: any) =>
        where.id === 'w1' ? Promise.resolve(null) : Promise.resolve({ id: where.id }),
      );
      await expect(
        service.create({ productVariantId: 'v1', fromWarehouseId: 'w1', toWarehouseId: 'w2', quantity: 5 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException when available stock in the source warehouse is insufficient', async () => {
      prisma.warehouse.findUnique.mockImplementation(({ where }: any) => Promise.resolve({ id: where.id }));
      prisma.inventory.findFirst.mockResolvedValue({ quantityOnHand: 3, quantityReserved: 0 });

      await expect(
        service.create({ productVariantId: 'v1', fromWarehouseId: 'w1', toWarehouseId: 'w2', quantity: 5 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.stockTransfer.create).not.toHaveBeenCalled();
    });

    it('creates a PENDING transfer with a generated transferNumber when stock is sufficient', async () => {
      prisma.warehouse.findUnique.mockImplementation(({ where }: any) => Promise.resolve({ id: where.id }));
      prisma.inventory.findFirst.mockResolvedValue({ quantityOnHand: 10, quantityReserved: 2 });

      const result = await service.create(
        { productVariantId: 'v1', fromWarehouseId: 'w1', toWarehouseId: 'w2', quantity: 5 },
        'user1',
      );

      expect(result.status).toBe(StockTransferStatus.PENDING);
      expect(result.transferNumber).toMatch(/^TRF-\d{4}-[A-Z0-9]{6}$/);
      expect(result.createdBy).toBe('user1');
    });
  });

  describe('markInTransit / cancel', () => {
    it('rejects marking in-transit a transfer that is not PENDING', async () => {
      prisma.stockTransfer.findUnique.mockResolvedValue({ id: 't1', status: StockTransferStatus.COMPLETED });
      await expect(service.markInTransit('t1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects cancelling a COMPLETED transfer', async () => {
      prisma.stockTransfer.findUnique.mockResolvedValue({ id: 't1', status: StockTransferStatus.COMPLETED });
      await expect(service.cancel('t1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws NotFoundException when the transfer does not exist', async () => {
      prisma.stockTransfer.findUnique.mockResolvedValue(null);
      await expect(service.cancel('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('complete', () => {
    const transfer = {
      id: 't1',
      transferNumber: 'TRF-2026-ABCDEF',
      productVariantId: 'v1',
      fromWarehouseId: 'w1',
      toWarehouseId: 'w2',
      quantity: 5,
      status: StockTransferStatus.PENDING,
    };

    it('rejects completing a CANCELLED transfer', async () => {
      prisma.stockTransfer.findUnique.mockResolvedValue({ ...transfer, status: StockTransferStatus.CANCELLED });
      await expect(service.complete('t1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('re-checks available stock at completion time and rejects if now insufficient', async () => {
      prisma.stockTransfer.findUnique.mockResolvedValue(transfer);
      prisma.inventory.findFirst.mockResolvedValue({ id: 'inv1', quantityOnHand: 2, quantityReserved: 0 });

      await expect(service.complete('t1')).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.inventory.update).not.toHaveBeenCalled();
    });

    it('atomically decrements the from-side, increments (creating if needed) the to-side, logs both txns, and marks COMPLETED', async () => {
      prisma.stockTransfer.findUnique.mockResolvedValue(transfer);
      prisma.inventory.findFirst.mockImplementation(({ where }: any) => {
        if (where.warehouseId === 'w1') {
          return Promise.resolve({ id: 'inv-from', quantityOnHand: 10, quantityReserved: 0 });
        }
        return Promise.resolve(null); // no existing row at the destination warehouse
      });
      prisma.inventory.create.mockResolvedValue({ id: 'inv-to', quantityOnHand: 0, quantityReserved: 0 });

      const result = await service.complete('t1');

      expect(prisma.inventory.update).toHaveBeenCalledWith({
        where: { id: 'inv-from' },
        data: { quantityOnHand: 5 },
      });
      expect(prisma.inventory.create).toHaveBeenCalledWith({
        data: { productVariantId: 'v1', warehouseId: 'w2', quantityOnHand: 0, quantityReserved: 0 },
      });
      expect(prisma.inventory.update).toHaveBeenCalledWith({
        where: { id: 'inv-to' },
        data: { quantityOnHand: 5 },
      });
      expect(prisma.inventoryTransaction.create).toHaveBeenCalledTimes(2);
      expect(result.status).toBe(StockTransferStatus.COMPLETED);
      expect(result.completedAt).toBeInstanceOf(Date);
    });
  });
});
