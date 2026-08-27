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
import {
  LeadSource,
  LeadStatus,
  QuotationStatus,
  Role,
  RfqStatus,
} from '@prisma/client';
import { CreateRfqDto } from './dto/create-rfq.dto';
import { RfqQueryDto } from './dto/rfq-query.dto';
import { AdminRfqQueryDto } from './dto/admin-rfq-query.dto';
import { PostRfqMessageDto } from './dto/post-message.dto';
import { UpdateRfqStatusDto } from './dto/update-rfq-status.dto';
import { CreateQuotationDto } from './dto/create-quotation.dto';

/**
 * Explicit RFQ state machine. Every status change — whether triggered by the
 * customer (submit / accept / reject a quotation) or by sales/admin (the
 * PATCH status endpoint, sending a quotation) — must go through
 * `assertValidRfqTransition`. Keep this map as the single source of truth;
 * do not set `rfq.status` anywhere without validating against it first.
 *
 * Notes on the design:
 * - REJECTED is reachable from every pre-acceptance state (SUBMITTED through
 *   NEGOTIATION) — that's sales/admin abandoning the RFQ entirely. It is NOT
 *   reachable from DRAFT (nothing has been reviewed yet — the customer just
 *   cancels a draft) nor from ACCEPTED onward (the customer already
 *   committed; CANCELLED is the applicable side-branch there instead).
 * - CANCELLED is reachable from every non-terminal state, including all the
 *   post-acceptance fulfilment states, since either party may still cancel a
 *   confirmed order.
 * - NEGOTIATION <-> QUOTATION_SENT is bidirectional: sales sends a revised
 *   quotation (-> QUOTATION_SENT) and the customer can push back into
 *   negotiation (-> NEGOTIATION) any number of times.
 * - COMPLETED, REJECTED, CANCELLED are terminal (no outgoing edges).
 */
export const ALLOWED_TRANSITIONS: Record<RfqStatus, RfqStatus[]> = {
  [RfqStatus.DRAFT]: [RfqStatus.SUBMITTED, RfqStatus.CANCELLED],
  [RfqStatus.SUBMITTED]: [RfqStatus.SALES_REVIEW, RfqStatus.REJECTED, RfqStatus.CANCELLED],
  [RfqStatus.SALES_REVIEW]: [RfqStatus.QUOTATION_SENT, RfqStatus.REJECTED, RfqStatus.CANCELLED],
  [RfqStatus.QUOTATION_SENT]: [
    RfqStatus.NEGOTIATION,
    RfqStatus.ACCEPTED,
    RfqStatus.REJECTED,
    RfqStatus.CANCELLED,
  ],
  [RfqStatus.NEGOTIATION]: [
    RfqStatus.QUOTATION_SENT,
    RfqStatus.ACCEPTED,
    RfqStatus.REJECTED,
    RfqStatus.CANCELLED,
  ],
  [RfqStatus.ACCEPTED]: [RfqStatus.PURCHASE_ORDER, RfqStatus.CANCELLED],
  [RfqStatus.PURCHASE_ORDER]: [RfqStatus.PAYMENT, RfqStatus.CANCELLED],
  [RfqStatus.PAYMENT]: [RfqStatus.PRODUCTION, RfqStatus.CANCELLED],
  [RfqStatus.PRODUCTION]: [RfqStatus.SHIPPING, RfqStatus.CANCELLED],
  [RfqStatus.SHIPPING]: [RfqStatus.COMPLETED, RfqStatus.CANCELLED],
  [RfqStatus.COMPLETED]: [],
  [RfqStatus.REJECTED]: [],
  [RfqStatus.CANCELLED]: [],
};

/**
 * Validates a proposed status change against `ALLOWED_TRANSITIONS`.
 * A no-op "transition" to the same status is treated as idempotent and
 * always allowed (e.g. sales re-sending a quotation while already in
 * QUOTATION_SENT), so it does not need its own edge in the map.
 */
export function assertValidRfqTransition(current: RfqStatus, next: RfqStatus): void {
  if (current === next) {
    return;
  }
  const allowed = ALLOWED_TRANSITIONS[current] ?? [];
  if (!allowed.includes(next)) {
    throw new BadRequestException(`Cannot transition RFQ from ${current} to ${next}`);
  }
}

const STAFF_ROLES: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.SALES];

const RFQ_DETAIL_INCLUDE = {
  items: { include: { product: true } },
  messages: {
    orderBy: { createdAt: 'asc' as const },
    include: { sender: { select: { id: true, fullName: true, role: true } } },
  },
  quotations: {
    orderBy: { version: 'asc' as const },
    include: { items: { include: { product: true } } },
  },
  user: {
    select: { id: true, fullName: true, email: true, phone: true, companyId: true },
  },
  company: {
    select: { id: true, name: true, country: true, businessType: true, contactPerson: true },
  },
} as const;

@Injectable()
export class RfqService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(user: AuthenticatedUser, dto: CreateRfqDto) {
    await this.assertProductsExist(dto.items.map((item) => item.productId));

    const rfqNumber = generateCode('RFQ', 6);
    const rfq = await this.prisma.rfq.create({
      data: {
        rfqNumber,
        userId: user.id,
        companyId: user.companyId ?? undefined,
        destinationCountry: dto.destinationCountry,
        destinationPort: dto.destinationPort,
        incoterm: dto.incoterm,
        expectedDeliveryDate: dto.expectedDeliveryDate
          ? new Date(dto.expectedDeliveryDate)
          : undefined,
        paymentTerm: dto.paymentTerm,
        specialRequirement: dto.specialRequirement,
        attachmentUrl: dto.attachmentUrl,
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            specification: item.specification,
            quantity: item.quantity,
            unit: item.unit,
            packaging: item.packaging,
          })),
        },
      },
      include: RFQ_DETAIL_INCLUDE,
    });
    return this.serializeRfq(rfq);
  }

  async findMine(user: AuthenticatedUser, query: RfqQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = user.companyId
      ? { OR: [{ userId: user.id }, { companyId: user.companyId }] }
      : { userId: user.id };

    const [items, total] = await Promise.all([
      this.prisma.rfq.findMany({
        where,
        orderBy: { createdAt: 'desc' as const },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.rfq.count({ where }),
    ]);

    return { items: items.map((rfq) => this.serializeRfq(rfq)), total, page, pageSize };
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const rfq = await this.prisma.rfq.findUnique({ where: { id }, include: RFQ_DETAIL_INCLUDE });
    if (!rfq) {
      throw new NotFoundException('RFQ not found');
    }
    if (!this.isStaff(user) && !this.isOwner(rfq, user)) {
      throw new ForbiddenException('You do not have access to this RFQ');
    }
    return this.serializeRfq(rfq);
  }

  async submit(id: string, user: AuthenticatedUser) {
    const rfq = await this.prisma.rfq.findUnique({ where: { id } });
    if (!rfq) {
      throw new NotFoundException('RFQ not found');
    }
    if (!this.isOwner(rfq, user)) {
      throw new ForbiddenException('You do not have access to this RFQ');
    }
    // Deliberately NOT `assertValidRfqTransition` here: that helper treats a same-state
    // "transition" as an idempotent no-op (useful for the generic admin status-setter),
    // but submitting only ever makes sense from DRAFT — re-submitting an already-SUBMITTED
    // (or later) RFQ must be rejected, not silently accepted.
    if (rfq.status !== RfqStatus.DRAFT) {
      throw new BadRequestException(`Cannot submit an RFQ that is already ${rfq.status}`);
    }

    const updated = await this.prisma.rfq.update({
      where: { id },
      data: { status: RfqStatus.SUBMITTED },
      include: RFQ_DETAIL_INCLUDE,
    });

    const leadUserId = rfq.userId ?? user.id;
    const leadUser = await this.prisma.user.findUnique({ where: { id: leadUserId } });
    await this.prisma.lead.create({
      data: {
        source: LeadSource.RFQ,
        status: LeadStatus.NEW,
        fullName: leadUser?.fullName ?? user.email,
        email: leadUser?.email ?? user.email,
        phone: leadUser?.phone,
        rfqId: id,
      },
    });

    try {
      await this.notifications.notify('rfq.submitted', {
        // No per-RFQ sales-rep assignment yet at submission time, so route to the shared
        // sales inbox rather than leaving `notify()` with no resolvable recipient.
        to: 'sales@phongchau.example',
        data: { rfqNumber: updated.rfqNumber, rfqId: updated.id },
      });
    } catch {
      // Notification failures must never block RFQ submission.
    }

    return this.serializeRfq(updated);
  }

  async addMessage(id: string, user: AuthenticatedUser, dto: PostRfqMessageDto) {
    const rfq = await this.prisma.rfq.findUnique({ where: { id } });
    if (!rfq) {
      throw new NotFoundException('RFQ not found');
    }
    if (!this.isStaff(user) && !this.isOwner(rfq, user)) {
      throw new ForbiddenException('You do not have access to this RFQ');
    }

    return this.prisma.rfqMessage.create({
      data: {
        rfqId: id,
        senderId: user.id,
        message: dto.message,
        attachmentUrl: dto.attachmentUrl,
      },
      include: { sender: { select: { id: true, fullName: true, role: true } } },
    });
  }

  async acceptQuotation(id: string, quotationId: string, user: AuthenticatedUser) {
    const rfq = await this.prisma.rfq.findUnique({ where: { id } });
    if (!rfq) {
      throw new NotFoundException('RFQ not found');
    }
    if (!this.isOwner(rfq, user)) {
      throw new ForbiddenException('Only the RFQ owner may accept a quotation');
    }
    const quotation = await this.prisma.quotation.findUnique({ where: { id: quotationId } });
    if (!quotation || quotation.rfqId !== id) {
      throw new NotFoundException('Quotation not found');
    }
    if (quotation.status !== QuotationStatus.SENT) {
      throw new BadRequestException('Only a quotation in SENT status can be accepted');
    }
    if (rfq.status !== RfqStatus.QUOTATION_SENT && rfq.status !== RfqStatus.NEGOTIATION) {
      throw new BadRequestException(
        'RFQ must be in QUOTATION_SENT or NEGOTIATION status to accept a quotation',
      );
    }
    assertValidRfqTransition(rfq.status, RfqStatus.ACCEPTED);

    await this.prisma.quotation.update({
      where: { id: quotationId },
      data: { status: QuotationStatus.ACCEPTED },
    });
    const updated = await this.prisma.rfq.update({
      where: { id },
      data: { status: RfqStatus.ACCEPTED },
      include: RFQ_DETAIL_INCLUDE,
    });
    return this.serializeRfq(updated);
  }

  async rejectQuotation(id: string, quotationId: string, user: AuthenticatedUser) {
    const rfq = await this.prisma.rfq.findUnique({ where: { id } });
    if (!rfq) {
      throw new NotFoundException('RFQ not found');
    }
    if (!this.isOwner(rfq, user)) {
      throw new ForbiddenException('Only the RFQ owner may reject a quotation');
    }
    const quotation = await this.prisma.quotation.findUnique({ where: { id: quotationId } });
    if (!quotation || quotation.rfqId !== id) {
      throw new NotFoundException('Quotation not found');
    }
    if (quotation.status !== QuotationStatus.SENT) {
      throw new BadRequestException('Only a quotation in SENT status can be rejected');
    }
    if (rfq.status !== RfqStatus.QUOTATION_SENT && rfq.status !== RfqStatus.NEGOTIATION) {
      throw new BadRequestException(
        'RFQ must be in QUOTATION_SENT or NEGOTIATION status to reject a quotation',
      );
    }
    // Rejecting a quotation keeps the customer engaged — the RFQ goes back to
    // NEGOTIATION, not the terminal REJECTED state (that's reserved for
    // sales/admin abandoning the RFQ entirely, see rejectAdmin via PATCH status).
    assertValidRfqTransition(rfq.status, RfqStatus.NEGOTIATION);

    await this.prisma.quotation.update({
      where: { id: quotationId },
      data: { status: QuotationStatus.REJECTED },
    });
    const updated = await this.prisma.rfq.update({
      where: { id },
      data: { status: RfqStatus.NEGOTIATION },
      include: RFQ_DETAIL_INCLUDE,
    });
    return this.serializeRfq(updated);
  }

  async adminList(query: AdminRfqQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = query.status ? { status: query.status } : {};

    const [items, total] = await Promise.all([
      this.prisma.rfq.findMany({
        where,
        orderBy: { createdAt: 'desc' as const },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { id: true, fullName: true, email: true, phone: true } },
          company: { select: { id: true, name: true, country: true, businessType: true } },
        },
      }),
      this.prisma.rfq.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async adminGetOne(id: string) {
    const rfq = await this.prisma.rfq.findUnique({ where: { id }, include: RFQ_DETAIL_INCLUDE });
    if (!rfq) {
      throw new NotFoundException('RFQ not found');
    }
    return this.serializeRfq(rfq);
  }

  async adminUpdateStatus(id: string, dto: UpdateRfqStatusDto, admin: AuthenticatedUser) {
    const rfq = await this.prisma.rfq.findUnique({ where: { id } });
    if (!rfq) {
      throw new NotFoundException('RFQ not found');
    }
    assertValidRfqTransition(rfq.status, dto.status);

    const data: { status: RfqStatus; assignedSalesId?: string } = { status: dto.status };
    if (dto.status === RfqStatus.SALES_REVIEW && !rfq.assignedSalesId) {
      data.assignedSalesId = admin.id;
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.rfq.update({ where: { id }, data, include: RFQ_DETAIL_INCLUDE }),
      this.prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: 'RFQ_STATUS_CHANGE',
          entityType: 'Rfq',
          entityId: id,
          changes: { from: rfq.status, to: dto.status, note: dto.note ?? null },
        },
      }),
    ]);

    return this.serializeRfq(updated);
  }

  async adminCreateQuotation(id: string, dto: CreateQuotationDto, admin: AuthenticatedUser) {
    const rfq = await this.prisma.rfq.findUnique({ where: { id } });
    if (!rfq) {
      throw new NotFoundException('RFQ not found');
    }
    assertValidRfqTransition(rfq.status, RfqStatus.QUOTATION_SENT);
    await this.assertProductsExist(dto.items.map((item) => item.productId));

    const existingCount = await this.prisma.quotation.count({ where: { rfqId: id } });
    const totalAmount = dto.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    // Supersede any still-SENT prior quotation on this RFQ. Without this, acceptQuotation/
    // rejectQuotation only ever check the target quotation's own status (not whether it's
    // the RFQ's latest version), so a customer — or a stale browser tab holding an old
    // quotation id — could still accept an outdated price after a revision was sent.
    await this.prisma.quotation.updateMany({
      where: { rfqId: id, status: QuotationStatus.SENT },
      data: { status: QuotationStatus.EXPIRED },
    });

    const quotation = await this.prisma.quotation.create({
      data: {
        rfqId: id,
        version: existingCount + 1,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        currency: dto.currency,
        totalAmount,
        status: QuotationStatus.SENT,
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            leadTime: item.leadTime,
          })),
        },
      },
      include: { items: { include: { product: true } } },
    });

    await this.prisma.rfq.update({ where: { id }, data: { status: RfqStatus.QUOTATION_SENT } });

    try {
      await this.notifications.notify('rfq.quoted', {
        userId: rfq.userId ?? undefined,
        data: { rfqNumber: rfq.rfqNumber, quotationId: quotation.id },
      });
    } catch {
      // Notification failures must never block quotation creation.
    }

    return this.serializeQuotation(quotation);
  }

  /** Validates every referenced productId exists before an RFQ/quotation create hits Prisma's FK constraint (which would otherwise surface as a raw 500). */
  private async assertProductsExist(productIds: string[]): Promise<void> {
    const uniqueIds = [...new Set(productIds)];
    const count = await this.prisma.product.count({ where: { id: { in: uniqueIds } } });
    if (count !== uniqueIds.length) {
      throw new BadRequestException('One or more items reference a productId that does not exist');
    }
  }

  private isOwner(
    rfq: { userId: string | null; companyId: string | null },
    user: AuthenticatedUser,
  ): boolean {
    if (rfq.userId && rfq.userId === user.id) {
      return true;
    }
    if (rfq.companyId && user.companyId && rfq.companyId === user.companyId) {
      return true;
    }
    return false;
  }

  private isStaff(user: AuthenticatedUser): boolean {
    return STAFF_ROLES.includes(user.role);
  }

  private serializeRfq(rfq: any) {
    return {
      ...rfq,
      items: rfq.items?.map((item: any) => this.serializeItem(item)),
      quotations: rfq.quotations?.map((quotation: any) => this.serializeQuotation(quotation)),
    };
  }

  private serializeQuotation(quotation: any) {
    return {
      ...quotation,
      totalAmount: Number(quotation.totalAmount),
      items: quotation.items?.map((item: any) => this.serializeItem(item)),
    };
  }

  private serializeItem(item: any) {
    const result: any = { ...item };
    if (result.quantity !== undefined) {
      result.quantity = Number(result.quantity);
    }
    if (result.unitPrice !== undefined) {
      result.unitPrice = Number(result.unitPrice);
    }
    if (result.product) {
      result.product = { ...result.product, basePrice: Number(result.product.basePrice) };
    }
    return result;
  }
}
