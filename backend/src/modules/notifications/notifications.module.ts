import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { EmailChannel } from './channels/email.channel';
import { SmsChannel } from './channels/sms.channel';
import { ZaloChannel } from './channels/zalo.channel';

@Module({
  // SmsChannel/ZaloChannel are provided (so DI can construct them and prove the
  // NotificationChannelProvider interface is genuinely pluggable) but are not wired
  // into NotificationsService's dispatch yet — only EMAIL is used in P0.
  providers: [NotificationsService, EmailChannel, SmsChannel, ZaloChannel],
  exports: [NotificationsService],
})
export class NotificationsModule {}
