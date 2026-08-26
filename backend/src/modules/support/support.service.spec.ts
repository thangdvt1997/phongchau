import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ALLOWED_TICKET_TRANSITIONS, assertValidTicketTransition, SupportService } from './support.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Role, TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';

describe('Ticket status transition map', () => {
  it('allows a no-op transition to the same status', () => {
    expect(() => assertValidTicketTransition(TicketStatus.OPEN, TicketStatus.OPEN)).not.toThrow();
  });

  it('rejects an edge not present in the map', () => {
    expect(() => assertValidTicketTransition(TicketStatus.CLOSED, TicketStatus.RESOLVED)).toThrow(
      BadRequestException,
    );
  });

  it('allows OPEN to reach every other status directly', () => {
    for (const next of ALLOWED_TICKET_TRANSITIONS[TicketStatus.OPEN]) {
      expect(() => assertValidTicketTransition(TicketStatus.OPEN, next)).not.toThrow();
    }
  });

  it('allows WAITING_ON_CUSTOMER and IN_PROGRESS to loop back and forth', () => {
    expect(() =>
      assertValidTicketTransition(TicketStatus.IN_PROGRESS, TicketStatus.WAITING_ON_CUSTOMER),
    ).not.toThrow();
    expect(() =>
      assertValidTicketTransition(TicketStatus.WAITING_ON_CUSTOMER, TicketStatus.IN_PROGRESS),
    ).not.toThrow();
  });

  it('allows both RESOLVED and CLOSED to be reopened to IN_PROGRESS', () => {
    expect(() => assertValidTicketTransition(TicketStatus.RESOLVED, TicketStatus.IN_PROGRESS)).not.toThrow();
    expect(() => assertValidTicketTransition(TicketStatus.CLOSED, TicketStatus.IN_PROGRESS)).not.toThrow();
  });
});

describe('SupportService', () => {
  let service: SupportService;
  let prisma: any;
  let notifications: any;

  beforeEach(() => {
    prisma = {
      order: { findUnique: jest.fn() },
      supportTicket: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      ticketMessage: { create: jest.fn() },
      user: { findUnique: jest.fn(), findMany: jest.fn() },
    };
    notifications = { notify: jest.fn().mockResolvedValue(undefined) };
    service = new SupportService(prisma as unknown as PrismaService, notifications as unknown as NotificationsService);
  });

  describe('createTicket', () => {
    it('generates a ticketNumber and creates an initial message from the body', async () => {
      prisma.supportTicket.create.mockResolvedValue({ id: 't1', ticketNumber: 'TCK-2026-ABC123' });

      await service.createTicket(
        { subject: 'Broken jar', message: 'The jar arrived cracked', category: TicketCategory.PRODUCT } as any,
        { userId: 'u1' },
      );

      expect(prisma.supportTicket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ticketNumber: expect.stringMatching(/^TCK-\d{4}-[A-Z0-9]{6}$/),
            userId: 'u1',
            subject: 'Broken jar',
            category: TicketCategory.PRODUCT,
            messages: { create: { senderId: 'u1', isFromStaff: false, message: 'The jar arrived cracked' } },
          }),
        }),
      );
      expect(notifications.notify).toHaveBeenCalledWith('support.ticket_created', expect.any(Object));
    });

    it('allows a guest to open a ticket with guestEmail and no userId', async () => {
      prisma.supportTicket.create.mockResolvedValue({ id: 't1', ticketNumber: 'TCK-2026-ABC123' });

      await service.createTicket(
        { subject: 'Where is my order', message: 'Help', guestEmail: 'guest@example.com', guestName: 'Guest' } as any,
        { guestEmail: 'guest@example.com', guestName: 'Guest' },
      );

      expect(prisma.supportTicket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: undefined,
            guestEmail: 'guest@example.com',
            guestName: 'Guest',
          }),
        }),
      );
    });

    it('rejects a guest ticket with no guestEmail and no account', async () => {
      await expect(
        service.createTicket({ subject: 'x', message: 'y' } as any, {}),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.supportTicket.create).not.toHaveBeenCalled();
    });

    it('rejects an orderId that does not reference an existing order', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(
        service.createTicket({ subject: 'x', message: 'y', orderId: 'bad-order' } as any, { userId: 'u1' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.supportTicket.create).not.toHaveBeenCalled();
    });
  });

  describe('getTicketForUser — cross-user access denial', () => {
    it('404s (NotFoundException) when the ticket belongs to a different user', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue({ id: 't1', userId: 'owner-1' });

      await expect(service.getTicketForUser('t1', 'someone-else')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('404s when the ticket does not exist at all — same error as a mismatched owner, so existence is never leaked', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue(null);

      await expect(service.getTicketForUser('missing', 'u1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns the ticket when it does belong to the caller', async () => {
      const ticket = { id: 't1', userId: 'u1' };
      prisma.supportTicket.findUnique.mockResolvedValue(ticket);

      const result = await service.getTicketForUser('t1', 'u1');

      expect(result).toBe(ticket);
    });
  });

  describe('addMessage — status auto-flip', () => {
    it('flips OPEN to IN_PROGRESS when staff replies', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue({
        id: 't1',
        status: TicketStatus.OPEN,
        userId: 'u1',
        guestEmail: null,
        assigneeId: null,
        ticketNumber: 'TCK-1',
      });
      prisma.ticketMessage.create.mockResolvedValue({ id: 'm1' });

      await service.addMessage('t1', 'staff-1', true, { message: 'We are looking into it' } as any);

      expect(prisma.supportTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 't1' }, data: { status: TicketStatus.IN_PROGRESS } }),
      );
    });

    it('flips WAITING_ON_CUSTOMER to IN_PROGRESS when the customer replies', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue({
        id: 't1',
        status: TicketStatus.WAITING_ON_CUSTOMER,
        userId: 'u1',
        guestEmail: null,
        assigneeId: 'staff-1',
        ticketNumber: 'TCK-1',
      });
      prisma.ticketMessage.create.mockResolvedValue({ id: 'm1' });

      await service.addMessage('t1', 'u1', false, { message: 'Still broken' } as any);

      expect(prisma.supportTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 't1' }, data: { status: TicketStatus.IN_PROGRESS } }),
      );
      expect(notifications.notify).toHaveBeenCalledWith(
        'support.ticket_replied',
        expect.objectContaining({ userId: 'staff-1' }),
      );
    });

    it('does not touch status when a staff reply lands on an already IN_PROGRESS ticket', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue({
        id: 't1',
        status: TicketStatus.IN_PROGRESS,
        userId: 'u1',
        guestEmail: null,
        assigneeId: null,
        ticketNumber: 'TCK-1',
      });
      prisma.ticketMessage.create.mockResolvedValue({ id: 'm1' });

      await service.addMessage('t1', 'staff-1', true, { message: 'Update' } as any);

      expect(prisma.supportTicket.update).not.toHaveBeenCalled();
    });

    it('notifies both the account user and the guest email on a staff reply when both are set', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue({
        id: 't1',
        status: TicketStatus.IN_PROGRESS,
        userId: 'u1',
        guestEmail: 'guest@example.com',
        assigneeId: null,
        ticketNumber: 'TCK-1',
      });
      prisma.ticketMessage.create.mockResolvedValue({ id: 'm1' });

      await service.addMessage('t1', 'staff-1', true, { message: 'Update' } as any);

      expect(notifications.notify).toHaveBeenCalledWith(
        'support.ticket_replied',
        expect.objectContaining({ userId: 'u1' }),
      );
      expect(notifications.notify).toHaveBeenCalledWith(
        'support.ticket_replied',
        expect.objectContaining({ to: 'guest@example.com' }),
      );
    });

    it('throws NotFoundException when the ticket does not exist', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue(null);
      await expect(service.addMessage('missing', 'u1', false, { message: 'hi' } as any)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('updateTicket', () => {
    it('sets resolvedAt when status moves to RESOLVED', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue({ id: 't1', status: TicketStatus.IN_PROGRESS });
      prisma.supportTicket.update.mockResolvedValue({ id: 't1', status: TicketStatus.RESOLVED });

      await service.updateTicket('t1', { status: TicketStatus.RESOLVED });

      expect(prisma.supportTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: TicketStatus.RESOLVED, resolvedAt: expect.any(Date) }),
        }),
      );
    });

    it('clears resolvedAt when moving from RESOLVED back to an open state', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue({ id: 't1', status: TicketStatus.RESOLVED });
      prisma.supportTicket.update.mockResolvedValue({ id: 't1', status: TicketStatus.IN_PROGRESS });

      await service.updateTicket('t1', { status: TicketStatus.IN_PROGRESS });

      expect(prisma.supportTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: TicketStatus.IN_PROGRESS, resolvedAt: null }),
        }),
      );
    });

    it('leaves resolvedAt untouched when moving from RESOLVED to CLOSED', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue({ id: 't1', status: TicketStatus.RESOLVED });
      prisma.supportTicket.update.mockResolvedValue({ id: 't1', status: TicketStatus.CLOSED });

      await service.updateTicket('t1', { status: TicketStatus.CLOSED });

      const call = prisma.supportTicket.update.mock.calls[0][0];
      expect(call.data.status).toBe(TicketStatus.CLOSED);
      expect(call.data.resolvedAt).toBeUndefined();
    });

    it('rejects an invalid status transition', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue({ id: 't1', status: TicketStatus.CLOSED });
      await expect(service.updateTicket('t1', { status: TicketStatus.RESOLVED })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.supportTicket.update).not.toHaveBeenCalled();
    });

    it('rejects assigning a ticket to a non-staff user', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue({ id: 't1', status: TicketStatus.OPEN });
      prisma.user.findUnique.mockResolvedValue({ id: 'c1', role: Role.RETAIL_CUSTOMER });

      await expect(service.updateTicket('t1', { assigneeId: 'c1' })).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.supportTicket.update).not.toHaveBeenCalled();
    });

    it('accepts assigning a ticket to a valid staff user', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue({ id: 't1', status: TicketStatus.OPEN });
      prisma.user.findUnique.mockResolvedValue({ id: 's1', role: Role.CUSTOMER_SERVICE });
      prisma.supportTicket.update.mockResolvedValue({ id: 't1', assigneeId: 's1' });

      await service.updateTicket('t1', { assigneeId: 's1' });

      expect(prisma.supportTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ assigneeId: 's1' }) }),
      );
    });

    it('throws NotFoundException when the ticket does not exist', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue(null);
      await expect(service.updateTicket('missing', { priority: TicketPriority.HIGH })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
