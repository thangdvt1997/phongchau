import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ShippingAdminService } from './shipping-admin.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';
import { ListShipmentsQueryDto } from './dto/list-shipments-query.dto';

@ApiTags('shipping-admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.WAREHOUSE_STAFF)
@Controller('admin/shipments')
export class ShippingAdminController {
  constructor(private readonly shippingAdminService: ShippingAdminService) {}

  @Post()
  create(@Body() dto: CreateShipmentDto) {
    return this.shippingAdminService.createShipment(dto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateShipmentStatusDto) {
    return this.shippingAdminService.updateShipmentStatus(id, dto);
  }

  @Get()
  list(@Query() query: ListShipmentsQueryDto) {
    return this.shippingAdminService.listShipments(query);
  }
}
