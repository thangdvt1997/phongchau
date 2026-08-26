import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ShippingService } from './shipping.service';
import { ShippingQuoteQueryDto } from './dto/shipping-quote-query.dto';

@ApiTags('shipping')
@Controller('shipping')
export class ShippingController {
  constructor(
    private readonly shippingService: ShippingService,
    private readonly prisma: PrismaService,
  ) {}

  /** Used by the frontend checkout preview to show shipping cost before order creation. */
  @Get('quote')
  quote(@Query() query: ShippingQuoteQueryDto) {
    return this.shippingService.calculateShipping(query);
  }

  @Get('track/:trackingNumber')
  async track(@Param('trackingNumber') trackingNumber: string) {
    const shipment = await this.prisma.shipment.findFirst({
      where: { trackingNumber },
      include: {
        tracking: { orderBy: { createdAt: 'asc' } },
        order: { select: { orderNumber: true, status: true } },
      },
    });
    if (!shipment) {
      throw new NotFoundException(`Shipment with tracking number ${trackingNumber} not found`);
    }
    return { ...shipment, cost: Number(shipment.cost) };
  }
}
