import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OrderStatus } from '@prisma/client';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';
import { ListShipmentsQueryDto } from './dto/list-shipments-query.dto';

@Injectable()
export class ShippingAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async createShipment(dto: CreateShipmentDto) {
    const order = await this.prisma.order.findUnique({ where: { id: dto.orderId } });
    if (!order) {
      throw new BadRequestException(`orderId ${dto.orderId} does not reference an existing order`);
    }

    const shipment = await this.prisma.shipment.create({
      data: {
        orderId: dto.orderId,
        carrier: dto.carrier,
        trackingNumber: dto.trackingNumber,
        method: dto.method,
        zone: dto.zone,
        cost: dto.cost,
      },
    });
    return this.serialize(shipment);
  }

  async updateShipmentStatus(id: string, dto: UpdateShipmentStatusDto) {
    const shipment = await this.findShipmentOrThrow(id);

    const updated = await this.prisma.shipment.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.status === OrderStatus.SHIPPED && !shipment.shippedAt
          ? { shippedAt: new Date() }
          : {}),
        ...(dto.status === OrderStatus.DELIVERED && !shipment.deliveredAt
          ? { deliveredAt: new Date() }
          : {}),
      },
    });

    await this.prisma.shipmentTracking.create({
      data: {
        shipmentId: id,
        status: dto.status,
        note: dto.note,
        location: dto.location,
      },
    });

    return this.serialize(updated);
  }

  async listShipments(query: ListShipmentsQueryDto) {
    const shipments = await this.prisma.shipment.findMany({
      where: query.orderId ? { orderId: query.orderId } : {},
      orderBy: { createdAt: 'desc' },
      include: { tracking: { orderBy: { createdAt: 'asc' } } },
    });
    return shipments.map((shipment) => this.serialize(shipment));
  }

  private async findShipmentOrThrow(id: string) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id } });
    if (!shipment) {
      throw new NotFoundException(`Shipment ${id} not found`);
    }
    return shipment;
  }

  // Generic so the spread keeps every field of the passed-in shape — a plain
  // `Record<string, unknown>` parameter loses all named properties on spread.
  private serialize<T extends { cost: unknown }>(shipment: T) {
    return { ...shipment, cost: Number(shipment.cost) };
  }
}
