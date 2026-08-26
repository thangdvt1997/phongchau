import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LeadSource, LeadStatus } from '@prisma/client';
import { CreateContactLeadDto } from './dto/create-contact-lead.dto';

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

  async updateStatus(id: string, status: LeadStatus, assigneeId?: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');
    return this.prisma.lead.update({ where: { id }, data: { status, assigneeId } });
  }
}
