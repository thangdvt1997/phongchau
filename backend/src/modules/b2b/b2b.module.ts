import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { NotificationsModule } from '../notifications/notifications.module';
import { B2bAdminController } from './b2b-admin.controller';
import { B2bAdminService } from './b2b-admin.service';
import { B2bController } from './b2b.controller';
import { B2bService } from './b2b.service';
import { PricingService } from './pricing.service';

@Module({
  imports: [NotificationsModule],
  controllers: [B2bAdminController, B2bController],
  providers: [B2bAdminService, B2bService, PricingService, RolesGuard],
  exports: [PricingService],
})
export class B2bModule {}
