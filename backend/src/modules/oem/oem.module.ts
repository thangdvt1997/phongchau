import { Module } from '@nestjs/common';
import { OemController } from './oem.controller';
import { OemAdminController } from './oem-admin.controller';
import { OemService } from './oem.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [OemController, OemAdminController],
  providers: [OemService],
  exports: [OemService],
})
export class OemModule {}
