import { NotificationChannel } from '@prisma/client';

export interface NotificationPayload {
  to: string;
  subject?: string;
  event: string;
  data: Record<string, unknown>;
}

/**
 * Email/SMS/Zalo/WhatsApp all implement this so notification call sites
 * (order confirmed, RFQ quoted, B2B approved, ...) stay channel-agnostic.
 */
export interface NotificationChannelProvider {
  readonly channel: NotificationChannel;
  send(payload: NotificationPayload): Promise<{ success: boolean; error?: string }>;
}
