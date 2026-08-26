import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LeadSource, LeadStatus, Role } from '@prisma/client';
import { CreateContactLeadDto } from './dto/create-contact-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

// Roles eligible to be a Lead's assignee. Deliberately narrower than AdminShell's
// full admin-nav role list (which also lets WAREHOUSE_STAFF into the admin panel) —
// lead follow-up is a sales/marketing/CS concern, not a warehouse one.
export const STAFF_ROLES: Role[] = [
  Role.SUPER_ADMIN,
  Role.ADMIN,
  Role.SALES,
  Role.CUSTOMER_SERVICE,
  Role.MARKETING_SEO,
];

// Per-column cap for the Kanban board — this is a simple P2 pass, not a paginated
// board, so each column just shows its N most recent leads plus a total count.
const BOARD_COLUMN_LIMIT = 50;

const LEAD_BOARD_CARD_SELECT = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  companyName: true,
  source: true,
  createdAt: true,
  assignee: { select: { id: true, fullName: true } },
} as const;

@Injectable()
export class CrmService {
  constructor(private readonly prisma: PrismaService) {}

  async createContactLead(dto: CreateContactLeadDto) {
    return this.prisma.lead.create({
      data: {
        source: LeadSource.CONTACT_FORM,
        status: LeadStatus.NEW,
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        companyName: dto.companyName,
        message: dto.message,
      },
    });
  }

  async list(status?: LeadStatus, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const where = status ? { status } : {};
    const [items, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { assignee: { select: { id: true, fullName: true } }, rfq: { select: { rfqNumber: true } } },
      }),
      this.prisma.lead.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  /** Leads grouped by LeadStatus for the Kanban board, e.g. `{ NEW: { total, leads }, ... }`. */
  async board() {
    const statuses = Object.values(LeadStatus);

    const [leadsByStatus, totalsByStatus] = await Promise.all([
      Promise.all(
        statuses.map((status) =>
          this.prisma.lead.findMany({
            where: { status },
            orderBy: { createdAt: 'desc' },
            take: BOARD_COLUMN_LIMIT,
            select: LEAD_BOARD_CARD_SELECT,
          }),
        ),
      ),
      Promise.all(statuses.map((status) => this.prisma.lead.count({ where: { status } }))),
    ]);

    const board: Record<string, { total: number; leads: unknown[] }> = {};
    statuses.forEach((status, i) => {
      board[status] = { total: totalsByStatus[i], leads: leadsByStatus[i] };
    });
    return board;
  }

  /** Staff users eligible for the assignee dropdown (sales/CS/marketing/admin, active only). */
  async assignableStaff() {
    return this.prisma.user.findMany({
      where: { role: { in: STAFF_ROLES }, isActive: true },
      select: { id: true, fullName: true, email: true, role: true },
      orderBy: { fullName: 'asc' },
    });
  }

  async update(id: string, dto: UpdateLeadDto) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');

    // Only look up/validate the assignee when a real id was supplied — `null` means
    // "unassign" and skips validation entirely, `undefined` means "leave untouched".
    if (dto.assigneeId) {
      const assignee = await this.prisma.user.findUnique({ where: { id: dto.assigneeId } });
      if (!assignee) throw new NotFoundException('Assignee not found');
      if (!STAFF_ROLES.includes(assignee.role)) {
        throw new BadRequestException('assigneeId must reference a staff user');
      }
    }

    const data: { status?: LeadStatus; assigneeId?: string | null } = {};
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.assigneeId !== undefined) data.assigneeId = dto.assigneeId;

    return this.prisma.lead.update({
      where: { id },
      data,
      include: { assignee: { select: { id: true, fullName: true } }, rfq: { select: { rfqNumber: true } } },
    });
  }
}
