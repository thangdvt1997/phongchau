import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel } from '@prisma/client';
import {
  NotificationChannelProvider,
  NotificationPayload,
} from '../../../common/interfaces/notification-channel.interface';

// Stub only — proves NotificationChannelProvider is genuinely pluggable per spec
// section 29. Not wired into NotificationsService's dispatch in P0; a real SMS
// gateway integration (e.g. Twilio/ESMS) can implement this same interface later.
@Injectable()
export class SmsChannel implements NotificationChannelProvider {
  readonly channel = NotificationChannel.SMS;

  private readonly logger = new Logger(SmsChannel.name);

  async send(payload: NotificationPayload): Promise<{ success: boolean; error?: string }> {
    this.logger.log(`[SMS stub] would send event "${payload.event}" to ${payload.to}`);
    return { success: true };
  }
}
