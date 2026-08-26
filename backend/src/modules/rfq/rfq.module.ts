import { Module } from '@nestjs/common';
import { RfqController } from './rfq.controller';
import { RfqAdminController } from './rfq-admin.controller';
import { RfqService } from './rfq.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [RfqController, RfqAdminController],
  providers: [RfqService],
  exports: [RfqService],
})
export class RfqModule {}
