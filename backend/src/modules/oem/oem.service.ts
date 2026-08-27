import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { generateCode } from '../../common/utils/code-generator.util';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { LeadSource, LeadStatus, OemRequestStatus, Role } from '@prisma/client';
import { CreateOemDto } from './dto/create-oem.dto';
import { OemQueryDto } from './dto/oem-query.dto';
import { AdminOemQueryDto } from './dto/admin-oem-query.dto';
import { PostOemMessageDto } from './dto/post-oem-message.dto';
import { UpdateOemStatusDto } from './dto/update-oem-status.dto';
import { UpdateOemDto } from './dto/update-oem.dto';

/**
 * Explicit OEM/ODM state machine. Unlike RFQ's more branching graph, this is a
 * linear manufacturing pipeline: each stage normally advances to the next one
 * in sequence. Every status change — customer-initiated cancel or the admin
 * PATCH status endpoint — must go through `assertValidOemTransition`. Keep
 * this map as the single source of truth; do not set `oemRequest.status`
 * anywhere without validating against it first.
 *
 * Notes on the design:
 * - REJECTED is reachable from every review/negotiation-style stage (REVIEW
 *   through APPROVAL) — sales/admin declining the request before production
 *   commitments are made. It is NOT reachable from REQUEST (nothing has been
 *   reviewed yet — the customer just cancels) nor from PRODUCTION onward
 *   (production has already started; CANCELLED is the applicable side-branch
 *   there instead).
 * - CANCELLED is reachable from every non-terminal state, since either party
 *   may still cancel before delivery.
 * - QC -> PRODUCTION is the one backward edge: QC can send the batch back for
 *   rework.
 * - DELIVERY, REJECTED, CANCELLED are terminal (no outgoing edges).
 */
export const ALLOWED_TRANSITIONS: Record<OemRequestStatus, OemRequestStatus[]> = {
  [OemRequestStatus.REQUEST]: [OemRequestStatus.REVIEW, OemRequestStatus.CANCELLED],
  [OemRequestStatus.REVIEW]: [
    OemRequestStatus.SAMPLE,
    OemRequestStatus.REJECTED,
    OemRequestStatus.CANCELLED,
  ],
  [OemRequestStatus.SAMPLE]: [
    OemRequestStatus.PRICING,
    OemRequestStatus.REJECTED,
    OemRequestStatus.CANCELLED,
  ],
  [OemRequestStatus.PRICING]: [
    OemRequestStatus.APPROVAL,
    OemRequestStatus.REJECTED,
    OemRequestStatus.CANCELLED,
  ],
  [OemRequestStatus.APPROVAL]: [
    OemRequestStatus.PRODUCTION,
    OemRequestStatus.REJECTED,
    OemRequestStatus.CANCELLED,
  ],
  [OemRequestStatus.PRODUCTION]: [OemRequestStatus.QC, OemRequestStatus.CANCELLED],
  [OemRequestStatus.QC]: [
    OemRequestStatus.DELIVERY,
    OemRequestStatus.PRODUCTION,
    OemRequestStatus.CANCELLED,
  ],
  [OemRequestStatus.DELIVERY]: [],
  [OemRequestStatus.REJECTED]: [],
  [OemRequestStatus.CANCELLED]: [],
};

/**
 * Validates a proposed status change against `ALLOWED_TRANSITIONS`.
 * A no-op "transition" to the same status is treated as idempotent and
 * always allowed, so it does not need its own edge in the map.
 */
export function assertValidOemTransition(
  current: OemRequestStatus,
  next: OemRequestStatus,
): void {
  if (current === next) {
    return;
  }
  const allowed = ALLOWED_TRANSITIONS[current] ?? [];
  if (!allowed.includes(next)) {
    throw new BadRequestException(`Cannot transition OEM request from ${current} to ${next}`);
  }
}

const STAFF_ROLES: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.SALES];

const TERMINAL_STATUSES: OemRequestStatus[] = [
  OemRequestStatus.DELIVERY,
  OemRequestStatus.REJECTED,
  OemRequestStatus.CANCELLED,
];

const OEM_DETAIL_INCLUDE = {
  messages: {
    orderBy: { createdAt: 'asc' as const },
    include: { sender: { select: { id: true, fullName: true, role: true } } },
  },
  user: {
    select: { id: true, fullName: true, email: true, phone: true, companyId: true },
  },
  company: {
    select: { id: true, name: true, country: true, businessType: true, contactPerson: true },
  },
} as const;

@Injectable()
export class OemService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(user: AuthenticatedUser, dto: CreateOemDto) {
    const requestNumber = generateCode('OEM', 6);
    const oemRequest = await this.prisma.oemRequest.create({
      data: {
        requestNumber,
        userId: user.id,
        companyId: user.companyId ?? undefined,
        status: OemRequestStatus.REQUEST,
        productType: dto.productType,
        ingredients: dto.ingredients,
        recipe: dto.recipe,
        targetMarket: dto.targetMarket,
        packageType: dto.packageType,
        packageSize: dto.packageSize,
        brandName: dto.brandName,
        isPrivateLabel: dto.isPrivateLabel ?? false,
        estimatedQuantity: dto.estimatedQuantity,
        certificationRequirement: dto.certificationRequirement,
        targetPrice: dto.targetPrice,
        destinationCountry: dto.destinationCountry,
        attachmentUrl: dto.attachmentUrl,
      },
      include: OEM_DETAIL_INCLUDE,
    });

    const leadUser = await this.prisma.user.findUnique({ where: { id: user.id } });
    await this.prisma.lead.create({
      data: {
        source: LeadSource.OEM_REQUEST,
        status: LeadStatus.NEW,
        fullName: leadUser?.fullName ?? user.email,
        email: leadUser?.email ?? user.email,
        phone: leadUser?.phone,
      },
    });

    try {
      await this.notifications.notify('oem.submitted', {
        // No per-request sales-rep assignment yet at submission time, so route to the
        // shared sales inbox rather than leaving `notify()` with no resolvable recipient.
        to: 'sales@phongchau.example',
        data: { requestNumber: oemRequest.requestNumber, oemRequestId: oemRequest.id },
      });
    } catch {
      // Notification failures must never block OEM request submission.
    }

    return oemRequest;
  }

  async findMine(user: AuthenticatedUser, query: OemQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = user.companyId
      ? { OR: [{ userId: user.id }, { companyId: user.companyId }] }
      : { userId: user.id };

    const [items, total] = await Promise.all([
      this.prisma.oemRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' as const },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.oemRequest.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const oemRequest = await this.prisma.oemRequest.findUnique({
      where: { id },
      include: OEM_DETAIL_INCLUDE,
    });
    if (!oemRequest) {
      throw new NotFoundException('OEM request not found');
    }
    if (!this.isStaff(user) && !this.isOwner(oemRequest, user)) {
      throw new ForbiddenException('You do not have access to this OEM request');
    }
    return oemRequest;
  }

  async addMessage(id: string, user: AuthenticatedUser, dto: PostOemMessageDto) {
    const oemRequest = await this.prisma.oemRequest.findUnique({ where: { id } });
    if (!oemRequest) {
      throw new NotFoundException('OEM request not found');
    }
    if (!this.isStaff(user) && !this.isOwner(oemRequest, user)) {
      throw new ForbiddenException('You do not have access to this OEM request');
    }

    return this.prisma.oemMessage.create({
      data: {
        oemRequestId: id,
        senderId: user.id,
        message: dto.message,
        attachmentUrl: dto.attachmentUrl,
      },
      include: { sender: { select: { id: true, fullName: true, role: true } } },
    });
  }

  async cancel(id: string, user: AuthenticatedUser) {
    const oemRequest = await this.prisma.oemRequest.findUnique({ where: { id } });
    if (!oemRequest) {
      throw new NotFoundException('OEM request not found');
    }
    if (!this.isOwner(oemRequest, user)) {
      throw new ForbiddenException('Only the OEM request owner may cancel it');
    }
    if (TERMINAL_STATUSES.includes(oemRequest.status)) {
      throw new BadRequestException(`Cannot cancel an OEM request that is already ${oemRequest.status}`);
    }
    assertValidOemTransition(oemRequest.status, OemRequestStatus.CANCELLED);

    return this.prisma.oemRequest.update({
      where: { id },
      data: { status: OemRequestStatus.CANCELLED },
      include: OEM_DETAIL_INCLUDE,
    });
  }

  async adminList(query: AdminOemQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = query.status ? { status: query.status } : {};

    const [items, total] = await Promise.all([
      this.prisma.oemRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' as const },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { id: true, fullName: true, email: true, phone: true } },
          company: { select: { id: true, name: true, country: true, businessType: true } },
        },
      }),
      this.prisma.oemRequest.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async adminGetOne(id: string) {
    const oemRequest = await this.prisma.oemRequest.findUnique({
      where: { id },
      include: OEM_DETAIL_INCLUDE,
    });
    if (!oemRequest) {
      throw new NotFoundException('OEM request not found');
    }
    return oemRequest;
  }

  async adminUpdateStatus(id: string, dto: UpdateOemStatusDto, admin: AuthenticatedUser) {
    const oemRequest = await this.prisma.oemRequest.findUnique({ where: { id } });
    if (!oemRequest) {
      throw new NotFoundException('OEM request not found');
    }
    assertValidOemTransition(oemRequest.status, dto.status);

    const data: { status: OemRequestStatus; assignedSalesId?: string } = { status: dto.status };
    if (!oemRequest.assignedSalesId) {
      data.assignedSalesId = admin.id;
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.oemRequest.update({ where: { id }, data, include: OEM_DETAIL_INCLUDE }),
      this.prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: 'OEM_STATUS_CHANGE',
          entityType: 'OemRequest',
          entityId: id,
          changes: { from: oemRequest.status, to: dto.status, note: dto.note ?? null },
        },
      }),
    ]);

    if (oemRequest.userId) {
      try {
        await this.notifications.notify('oem.status_changed', {
          userId: oemRequest.userId,
          data: { requestNumber: updated.requestNumber, status: dto.status },
        });
      } catch {
        // Notification failures must never block the status update.
      }
    }

    return updated;
  }

  async adminUpdate(id: string, dto: UpdateOemDto) {
    const oemRequest = await this.prisma.oemRequest.findUnique({ where: { id } });
    if (!oemRequest) {
      throw new NotFoundException('OEM request not found');
    }

    return this.prisma.oemRequest.update({
      where: { id },
      data: { internalNote: dto.internalNote },
      include: OEM_DETAIL_INCLUDE,
    });
  }

  private isOwner(
    oemRequest: { userId: string | null; companyId: string | null },
    user: AuthenticatedUser,
  ): boolean {
    if (oemRequest.userId && oemRequest.userId === user.id) {
      return true;
    }
    if (oemRequest.companyId && user.companyId && oemRequest.companyId === user.companyId) {
      return true;
    }
    return false;
  }

  private isStaff(user: AuthenticatedUser): boolean {
    return STAFF_ROLES.includes(user.role);
  }
}
