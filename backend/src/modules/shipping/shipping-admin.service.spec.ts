import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ShippingAdminService } from './shipping-admin.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OrderStatus, ShippingMethodType } from '@prisma/client';

describe('ShippingAdminService', () => {
  let service: ShippingAdminService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      order: {
        findUnique: jest.fn().mockResolvedValue({ id: 'o1' }),
        update: jest.fn().mockResolvedValue({}),
      },
      shipment: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
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

    // Regression: this used to only touch Shipment/ShipmentTracking, leaving Order.status
    // stuck at whatever it was — an order could show "Processing" forever while its own
    // shipment tracking said "Delivered".
    it('mirrors the shipment status onto Order.status for a single-shipment order', async () => {
      prisma.shipment.findUnique.mockResolvedValue({ id: 's1', orderId: 'o1', shippedAt: null, deliveredAt: null });
      prisma.shipment.update.mockResolvedValue({ id: 's1', orderId: 'o1', cost: 0 });
      prisma.order.findUnique.mockResolvedValue({
        status: OrderStatus.PROCESSING,
        shipments: [{ status: OrderStatus.SHIPPED }],
      });

      await service.updateShipmentStatus('s1', { status: OrderStatus.DELIVERED } as any);

      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'o1' },
          data: expect.objectContaining({ status: OrderStatus.DELIVERED }),
        }),
      );
    });

    it('does not advance a multi-shipment order to DELIVERED until every shipment is delivered', async () => {
      prisma.shipment.findUnique.mockResolvedValue({ id: 's1', orderId: 'o1', shippedAt: null, deliveredAt: null });
      prisma.shipment.update.mockResolvedValue({ id: 's1', orderId: 'o1', cost: 0 });
      prisma.order.findUnique.mockResolvedValue({
        status: OrderStatus.PROCESSING,
        shipments: [{ status: OrderStatus.DELIVERED }, { status: OrderStatus.SHIPPED }],
      });

      await service.updateShipmentStatus('s1', { status: OrderStatus.DELIVERED } as any);

      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('advances a multi-shipment order to DELIVERED once every shipment is delivered', async () => {
      prisma.shipment.findUnique.mockResolvedValue({ id: 's1', orderId: 'o1', shippedAt: null, deliveredAt: null });
      prisma.shipment.update.mockResolvedValue({ id: 's1', orderId: 'o1', cost: 0 });
      prisma.order.findUnique.mockResolvedValue({
        status: OrderStatus.PROCESSING,
        shipments: [{ status: OrderStatus.DELIVERED }, { status: OrderStatus.DELIVERED }],
      });

      await service.updateShipmentStatus('s1', { status: OrderStatus.DELIVERED } as any);

      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: OrderStatus.DELIVERED }) }),
      );
    });

    it('never resurrects a terminal order (e.g. CANCELLED) from a shipment update', async () => {
      prisma.shipment.findUnique.mockResolvedValue({ id: 's1', orderId: 'o1', shippedAt: null, deliveredAt: null });
      prisma.shipment.update.mockResolvedValue({ id: 's1', orderId: 'o1', cost: 0 });
      prisma.order.findUnique.mockResolvedValue({
        status: OrderStatus.CANCELLED,
        shipments: [{ status: OrderStatus.SHIPPED }],
      });

      await service.updateShipmentStatus('s1', { status: OrderStatus.DELIVERED } as any);

      expect(prisma.order.update).not.toHaveBeenCalled();
    });
  });
});
