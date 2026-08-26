import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WarehousesService } from './warehouses.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('WarehousesService', () => {
  let service: WarehousesService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      warehouse: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      inventory: {
        count: jest.fn(),
      },
    };
    service = new WarehousesService(prisma as unknown as PrismaService);
  });

  describe('findOne', () => {
    it('throws NotFoundException when missing', async () => {
      prisma.warehouse.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('throws BadRequestException when the warehouse still holds inventory', async () => {
      prisma.warehouse.findUnique.mockResolvedValue({ id: 'w1' });
      prisma.inventory.count.mockResolvedValue(2);
      await expect(service.remove('w1')).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.warehouse.delete).not.toHaveBeenCalled();
    });

    it('deletes when empty', async () => {
      prisma.warehouse.findUnique.mockResolvedValue({ id: 'w1' });
      prisma.inventory.count.mockResolvedValue(0);
      const result = await service.remove('w1');
      expect(prisma.warehouse.delete).toHaveBeenCalledWith({ where: { id: 'w1' } });
      expect(result).toEqual({ success: true });
    });
  });
});
