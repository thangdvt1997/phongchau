import { Module } from '@nestjs/common';
import { SupportController } from './support.controller';
import { SupportAdminController } from './support-admin.controller';
import { SupportService } from './support.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  imports: [NotificationsModule],
  controllers: [SupportController, SupportAdminController],
  providers: [SupportService, RolesGuard],
  exports: [SupportService],
})
export class SupportModule {}
