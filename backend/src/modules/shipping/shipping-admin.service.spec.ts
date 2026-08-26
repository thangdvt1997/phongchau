import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ShippingAdminService } from './shipping-admin.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ShippingMethodType } from '@prisma/client';

describe('ShippingAdminService', () => {
  let service: ShippingAdminService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      order: {
        findUnique: jest.fn().mockResolvedValue({ id: 'o1' }),
      },
      shipment: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      shipmentTracking: {
        create: jest.fn(),
      },
    };
    service = new ShippingAdminService(prisma as unknown as PrismaService);
  });

  describe('createShipment', () => {
    // Regression: createShipment() used to call shipment.create() straight from a
    // client-supplied orderId with no existence check, so a bogus orderId tripped
    // Prisma's FK constraint and surfaced as a raw 500 instead of a clean 400.
    it('throws BadRequestException for an orderId that does not exist, without creating a shipment', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.createShipment({
          orderId: 'missing-order',
          method: ShippingMethodType.FLAT_RATE,
          cost: 50000,
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.shipment.create).not.toHaveBeenCalled();
    });

    it('creates the shipment once the orderId is confirmed to exist', async () => {
      prisma.shipment.create.mockResolvedValue({
        id: 's1',
        orderId: 'o1',
        cost: 50000,
      });

      const result = await service.createShipment({
        orderId: 'o1',
        method: ShippingMethodType.FLAT_RATE,
        cost: 50000,
      } as any);

      expect(prisma.shipment.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ orderId: 'o1' }) }),
      );
      expect(result.cost).toBe(50000);
    });
  });

  describe('updateShipmentStatus', () => {
    it('throws NotFoundException when the shipment does not exist', async () => {
      prisma.shipment.findUnique.mockResolvedValue(null);
      await expect(
        service.updateShipmentStatus('missing', { status: 'SHIPPED' } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
