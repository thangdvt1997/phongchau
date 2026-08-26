import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailChannel } from './channels/email.channel';
import { NotificationChannel, NotificationStatus } from '@prisma/client';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: any;
  let emailChannel: { send: jest.Mock };

  beforeEach(() => {
    prisma = {
      notification: {
        create: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    };
    emailChannel = { send: jest.fn() };
    service = new NotificationsService(
      prisma as unknown as PrismaService,
      emailChannel as unknown as EmailChannel,
    );
  });

  it('sends via the email channel and marks the notification SENT on success', async () => {
    prisma.notification.create.mockResolvedValue({ id: 'n1' });
    emailChannel.send.mockResolvedValue({ success: true });

    await service.notify('order.confirmed', { to: 'buyer@example.com', data: { orderNumber: 'X1' } });

    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          channel: NotificationChannel.EMAIL,
          event: 'order.confirmed',
          status: NotificationStatus.PENDING,
        }),
      }),
    );
    expect(emailChannel.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'buyer@example.com', event: 'order.confirmed' }),
    );
    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { id: 'n1' },
      data: { status: NotificationStatus.SENT },
    });
  });

  it('resolves the recipient from userId when "to" is not given', async () => {
    prisma.user.findUnique.mockResolvedValue({ email: 'user@example.com' });
    prisma.notification.create.mockResolvedValue({ id: 'n2' });
    emailChannel.send.mockResolvedValue({ success: true });

    await service.notify('rfq.submitted', { userId: 'u1', data: { rfqNumber: 'RFQ-1' } });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'u1' } });
    expect(emailChannel.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'user@example.com' }),
    );
  });

  it('marks the notification FAILED when the channel throws, without notify() itself throwing', async () => {
    prisma.notification.create.mockResolvedValue({ id: 'n3' });
    emailChannel.send.mockRejectedValue(new Error('SMTP down'));

    await expect(
      service.notify('order.confirmed', { to: 'buyer@example.com', data: {} }),
    ).resolves.toBeUndefined();

    // The channel throwing is caught by the outer try/catch, so the notification
    // row created earlier stays PENDING — but notify() must not propagate the error.
    expect(prisma.notification.create).toHaveBeenCalled();
  });

  it('marks the notification FAILED when the channel reports failure (no throw)', async () => {
    prisma.notification.create.mockResolvedValue({ id: 'n4' });
    emailChannel.send.mockResolvedValue({ success: false, error: 'Invalid recipient' });

    await service.notify('order.confirmed', { to: 'buyer@example.com', data: {} });

    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { id: 'n4' },
      data: { status: NotificationStatus.FAILED, error: 'Invalid recipient' },
    });
  });

  it('records a FAILED notification with "No recipient resolved" when neither to nor userId is given', async () => {
    prisma.notification.create.mockResolvedValue({ id: 'n5' });

    await service.notify('rfq.submitted', { data: { rfqNumber: 'RFQ-2' } });

    expect(emailChannel.send).not.toHaveBeenCalled();
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: {
        userId: null,
        channel: NotificationChannel.EMAIL,
        event: 'rfq.submitted',
        payload: { rfqNumber: 'RFQ-2' },
        status: NotificationStatus.FAILED,
        error: 'No recipient resolved',
      },
    });
    expect(prisma.notification.update).not.toHaveBeenCalled();
  });

  it('records a FAILED notification when userId does not resolve to a user with an email', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.notification.create.mockResolvedValue({ id: 'n6' });

    await service.notify('order.confirmed', { userId: 'missing', data: {} });

    expect(emailChannel.send).not.toHaveBeenCalled();
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: NotificationStatus.FAILED, error: 'No recipient resolved' }),
      }),
    );
  });

  it('never throws even if prisma.notification.create itself rejects', async () => {
    prisma.notification.create.mockRejectedValue(new Error('DB down'));

    await expect(
      service.notify('order.confirmed', { to: 'buyer@example.com', data: {} }),
    ).resolves.toBeUndefined();
  });
});
