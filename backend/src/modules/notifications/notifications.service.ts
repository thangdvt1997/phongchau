import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationChannel, NotificationStatus, Prisma } from '@prisma/client';
import { EmailChannel } from './channels/email.channel';

export interface NotifyParams {
  userId?: string;
  to?: string;
  data: Record<string, unknown>;
}

/**
 * Central notification dispatcher — the stable contract other modules (RFQ, B2B,
 * Orders, ...) depend on. `notify()` must NEVER throw: a notification failure must
 * never break the order/RFQ/approval flow that triggered it.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailChannel: EmailChannel,
  ) {}

  async notify(event: string, params: NotifyParams): Promise<void> {
    try {
      const to = await this.resolveRecipient(params);

      if (!to) {
        this.logger.warn(`No recipient resolved for event "${event}" — skipping send`);
        await this.prisma.notification.create({
          data: {
            userId: params.userId ?? null,
            channel: NotificationChannel.EMAIL,
            event,
            payload: params.data as Prisma.InputJsonValue,
            status: NotificationStatus.FAILED,
            error: 'No recipient resolved',
          },
        });
        return;
      }

      const notification = await this.prisma.notification.create({
        data: {
          userId: params.userId ?? null,
          channel: NotificationChannel.EMAIL,
          event,
          payload: params.data as Prisma.InputJsonValue,
          status: NotificationStatus.PENDING,
        },
      });

      const subject = this.humanizeEvent(event);
      const result = await this.emailChannel.send({
        to,
        subject,
        event,
        data: params.data,
      });

      await this.prisma.notification.update({
        where: { id: notification.id },
        data: result.success
          ? { status: NotificationStatus.SENT }
          : { status: NotificationStatus.FAILED, error: result.error ?? 'Unknown error' },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`notify() failed for event "${event}": ${message}`);
      // Swallow — never let a notification failure propagate to the caller.
    }
  }

  private async resolveRecipient(params: NotifyParams): Promise<string | null> {
    if (params.to) {
      return params.to;
    }
    if (params.userId) {
      const user = await this.prisma.user.findUnique({ where: { id: params.userId } });
      return user?.email ?? null;
    }
    return null;
  }

  private humanizeEvent(event: string): string {
    return event
      .split(/[._-]/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
