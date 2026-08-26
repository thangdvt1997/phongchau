import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ShippingController } from './shipping.controller';
import { ShippingAdminController } from './shipping-admin.controller';
import { ShippingService } from './shipping.service';
import { ShippingAdminService } from './shipping-admin.service';

@Module({
  controllers: [ShippingController, ShippingAdminController],
  providers: [ShippingService, ShippingAdminService, RolesGuard],
  exports: [ShippingService],
})
export class ShippingModule {}
