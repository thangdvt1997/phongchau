import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { NotificationChannel } from '@prisma/client';
import {
  NotificationChannelProvider,
  NotificationPayload,
} from '../../../common/interfaces/notification-channel.interface';

@Injectable()
export class EmailChannel implements NotificationChannelProvider {
  readonly channel = NotificationChannel.EMAIL;

  private readonly logger = new Logger(EmailChannel.name);

  constructor(private readonly config: ConfigService) {}

  async send(payload: NotificationPayload): Promise<{ success: boolean; error?: string }> {
    const enabled = this.config.get<boolean>('email.enabled');

    if (!enabled) {
      this.logger.log(
        `[EMAIL disabled] would send "${payload.subject ?? payload.event}" to ${payload.to}`,
      );
      return { success: true };
    }

    try {
      const transport = nodemailer.createTransport({
        host: this.config.get<string>('email.host'),
        port: this.config.get<number>('email.port'),
        secure: this.config.get<number>('email.port') === 465,
        auth: {
          user: this.config.get<string>('email.user'),
          pass: this.config.get<string>('email.pass'),
        },
      });

      const subject = payload.subject ?? this.humanizeEvent(payload.event);
      const html = `<pre>${JSON.stringify(payload.data, null, 2)}</pre>`;

      await transport.sendMail({
        from: this.config.get<string>('email.from'),
        to: payload.to,
        subject,
        html,
      });

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send email for event ${payload.event}: ${message}`);
      return { success: false, error: message };
    }
  }

  private humanizeEvent(event: string): string {
    return event
      .split(/[._-]/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
