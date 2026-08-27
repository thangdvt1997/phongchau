import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { generateCode } from '../../common/utils/code-generator.util';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { STAFF_ROLES } from '../crm/crm.service';
import { Prisma, TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { AddTicketMessageDto } from './dto/add-message.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { AdminListTicketsQueryDto } from './dto/admin-list-tickets-query.dto';

/**
 * Explicit ticket-status state machine, mirroring the RFQ/OEM `ALLOWED_TRANSITIONS`
 * pattern (see `rfq.service.ts`). Every status change — whether the automatic flip in
 * `addMessage` or the admin PATCH endpoint via `updateTicket` — must stay within this
 * map. Keep it as the single source of truth; do not set `ticket.status` anywhere
 * without validating against it first.
 *
 * Notes on the design:
 * - Every non-CLOSED state can reach RESOLVED and CLOSED directly — staff may close a
 *   ticket without a formal resolution (e.g. duplicate/spam).
 * - WAITING_ON_CUSTOMER and IN_PROGRESS are bidirectional (a reply from either side
 *   flips it back to IN_PROGRESS, see `addMessage`).
 * - RESOLVED and CLOSED can both be reopened to IN_PROGRESS — support tickets, unlike
 *   RFQs, routinely get reopened when the customer comes back with the same issue.
 */
export const ALLOWED_TICKET_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.OPEN]: [
    TicketStatus.IN_PROGRESS,
    TicketStatus.WAITING_ON_CUSTOMER,
    TicketStatus.RESOLVED,
    TicketStatus.CLOSED,
  ],
  [TicketStatus.IN_PROGRESS]: [
    TicketStatus.WAITING_ON_CUSTOMER,
    TicketStatus.RESOLVED,
    TicketStatus.CLOSED,
  ],
  [TicketStatus.WAITING_ON_CUSTOMER]: [
    TicketStatus.IN_PROGRESS,
    TicketStatus.RESOLVED,
    TicketStatus.CLOSED,
  ],
  [TicketStatus.RESOLVED]: [TicketStatus.CLOSED, TicketStatus.IN_PROGRESS],
  [TicketStatus.CLOSED]: [TicketStatus.IN_PROGRESS],
};

/**
 * Validates a proposed status change against `ALLOWED_TICKET_TRANSITIONS`. A no-op
 * "transition" to the same status is treated as idempotent and always allowed, so it
 * does not need its own edge in the map.
 */
export function assertValidTicketTransition(current: TicketStatus, next: TicketStatus): void {
  if (current === next) {
    return;
  }
  const allowed = ALLOWED_TICKET_TRANSITIONS[current] ?? [];
  if (!allowed.includes(next)) {
    throw new BadRequestException(`Cannot transition ticket from ${current} to ${next}`);
  }
}

const TICKET_DETAIL_INCLUDE = {
  messages: {
    orderBy: { createdAt: 'asc' as const },
    include: { sender: { select: { id: true, fullName: true, role: true } } },
  },
  user: { select: { id: true, fullName: true, email: true, phone: true } },
  assignee: { select: { id: true, fullName: true, email: true } },
  order: { select: { id: true, orderNumber: true, status: true } },
} as const;

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Creates a ticket plus its opening `TicketMessage` (the ticket's own `message` body)
   * so the thread always has at least one message. `actor` comes from the controller —
   * `userId` when authenticated, otherwise guest fields lifted from the request body.
   */
  async createTicket(
    dto: CreateTicketDto,
    actor: { userId?: string; guestEmail?: string; guestName?: string },
  ) {
    const userId = actor.userId;
    const guestEmail = userId ? undefined : actor.guestEmail;
    const guestName = userId ? undefined : actor.guestName;

    if (!userId && !guestEmail) {
      throw new BadRequestException('guestEmail is required to submit a ticket without an account');
    }

    if (dto.orderId) {
      const order = await this.prisma.order.findUnique({ where: { id: dto.orderId } });
      if (!order) {
        throw new BadRequestException('orderId does not reference an existing order');
      }
    }

    const ticketNumber = generateCode('TCK', 6);

    const ticket = await this.prisma.supportTicket.create({
      data: {
        ticketNumber,
        userId,
        guestEmail,
        guestName,
        subject: dto.subject,
        category: dto.category ?? TicketCategory.OTHER,
        priority: dto.priority ?? TicketPriority.MEDIUM,
        orderId: dto.orderId,
        messages: {
          create: {
            senderId: userId,
            isFromStaff: false,
            message: dto.message,
          },
        },
      },
      include: TICKET_DETAIL_INCLUDE,
    });

    try {
      await this.notifications.notify('support.ticket_created', {
        // No per-ticket assignee yet at creation time, so route to the shared support
        // inbox rather than leaving `notify()` with no resolvable recipient.
        to: 'support@phongchau.example',
        data: { ticketNumber: ticket.ticketNumber, ticketId: ticket.id },
      });
    } catch {
      // Notification failures must never block ticket creation.
    }

    return ticket;
  }

  /** A customer's own tickets, newest first. */
  async listForUser(userId: string) {
    return this.prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { assignee: { select: { id: true, fullName: true } } },
    });
  }

  /** 404s (not 403) when the ticket doesn't belong to this user — never leak another user's ticket by ID guessing. */
  async getTicketForUser(ticketId: string, userId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: TICKET_DETAIL_INCLUDE,
    });
    if (!ticket || ticket.userId !== userId) {
      throw new NotFoundException('Ticket not found');
    }
    return ticket;
  }

  /**
   * Appends a message to the ticket thread. Auto-flips status back to IN_PROGRESS when
   * whichever side was "waiting" replies: a staff reply moves an OPEN ticket forward,
   * a customer reply moves a WAITING_ON_CUSTOMER ticket forward.
   */
  async addMessage(
    ticketId: string,
    senderId: string | null,
    isFromStaff: boolean,
    dto: AddTicketMessageDto,
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const message = await this.prisma.ticketMessage.create({
      data: {
        ticketId,
        senderId: senderId ?? undefined,
        isFromStaff,
        message: dto.message,
        attachmentUrl: dto.attachmentUrl,
      },
      include: { sender: { select: { id: true, fullName: true, role: true } } },
    });

    let nextStatus: TicketStatus | undefined;
    if (isFromStaff && ticket.status === TicketStatus.OPEN) {
      nextStatus = TicketStatus.IN_PROGRESS;
    } else if (!isFromStaff && ticket.status === TicketStatus.WAITING_ON_CUSTOMER) {
      nextStatus = TicketStatus.IN_PROGRESS;
    }
    if (nextStatus) {
      assertValidTicketTransition(ticket.status, nextStatus);
      await this.prisma.supportTicket.update({ where: { id: ticketId }, data: { status: nextStatus } });
    }

    try {
      if (isFromStaff) {
        // Staff reply notifies the ticket's user (if any) AND the guest email (if set) —
        // a ticket can be guest-opened (userId null, guestEmail set) or account-owned.
        if (ticket.userId) {
          await this.notifications.notify('support.ticket_replied', {
            userId: ticket.userId,
            data: { ticketNumber: ticket.ticketNumber, ticketId: ticket.id },
          });
        }
        if (ticket.guestEmail) {
          await this.notifications.notify('support.ticket_replied', {
            to: ticket.guestEmail,
            data: { ticketNumber: ticket.ticketNumber, ticketId: ticket.id },
          });
        }
      } else if (ticket.assigneeId) {
        await this.notifications.notify('support.ticket_replied', {
          userId: ticket.assigneeId,
          data: { ticketNumber: ticket.ticketNumber, ticketId: ticket.id },
        });
      }
    } catch {
      // Notification failures must never block a reply from posting.
    }

    return message;
  }

  async adminList(query: AdminListTicketsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.SupportTicketWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.assigneeId) where.assigneeId = query.assigneeId;

    const [items, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          assignee: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async adminGetTicket(ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: TICKET_DETAIL_INCLUDE,
    });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
    return ticket;
  }

  async updateTicket(ticketId: string, dto: UpdateTicketDto) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Only look up/validate the assignee when a real id was supplied — `null` means
    // "unassign" and skips validation entirely, `undefined` means "leave untouched".
    if (dto.assigneeId) {
      const assignee = await this.prisma.user.findUnique({ where: { id: dto.assigneeId } });
      if (!assignee) throw new NotFoundException('Assignee not found');
      if (!STAFF_ROLES.includes(assignee.role)) {
        throw new BadRequestException('assigneeId must reference a staff user');
      }
    }

    const data: Prisma.SupportTicketUncheckedUpdateInput = {};

    if (dto.status !== undefined) {
      assertValidTicketTransition(ticket.status, dto.status);
      data.status = dto.status;

      const wasResolvedOrClosed =
        ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED;
      const movingToOpenState =
        dto.status !== TicketStatus.RESOLVED && dto.status !== TicketStatus.CLOSED;

      if (dto.status === TicketStatus.RESOLVED) {
        data.resolvedAt = new Date();
      } else if (wasResolvedOrClosed && movingToOpenState) {
        data.resolvedAt = null;
      }
    }
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.assigneeId !== undefined) data.assigneeId = dto.assigneeId;

    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data,
      include: TICKET_DETAIL_INCLUDE,
    });
  }

  /** Staff users eligible for the ticket assignee dropdown — reuses CRM's staff role set as the single source of truth. */
  async assignableStaff() {
    return this.prisma.user.findMany({
      where: { role: { in: STAFF_ROLES }, isActive: true },
      select: { id: true, fullName: true, email: true, role: true },
      orderBy: { fullName: 'asc' },
    });
  }
}
