import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CrmService, STAFF_ROLES } from './crm.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LeadActivityType, LeadSource, LeadStatus, Role } from '@prisma/client';

describe('CrmService', () => {
  let service: CrmService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      lead: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      leadActivity: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    service = new CrmService(prisma as unknown as PrismaService);
  });

  describe('createContactLead', () => {
    it('creates a NEW lead sourced from the contact form', async () => {
      prisma.lead.create.mockResolvedValue({ id: 'l1' });
      await service.createContactLead({ fullName: 'Jane', message: 'hi' } as any);
      expect(prisma.lead.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ source: LeadSource.CONTACT_FORM, status: LeadStatus.NEW }),
        }),
      );
    });
  });

  describe('board', () => {
    it('groups leads by every LeadStatus with a total count per column', async () => {
      prisma.lead.findMany.mockResolvedValue([{ id: 'l1' }]);
      prisma.lead.count.mockResolvedValue(3);

      const result = await service.board();

      const statuses = Object.values(LeadStatus);
      expect(Object.keys(result).sort()).toEqual([...statuses].sort());
      for (const status of statuses) {
        expect(result[status]).toEqual({ total: 3, leads: [{ id: 'l1' }] });
      }
      expect(prisma.lead.findMany).toHaveBeenCalledTimes(statuses.length);
      expect(prisma.lead.count).toHaveBeenCalledTimes(statuses.length);
    });

    it('caps each column at 50 leads via take, ordered newest first', async () => {
      prisma.lead.findMany.mockResolvedValue([]);
      prisma.lead.count.mockResolvedValue(0);

      await service.board();

      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: LeadStatus.NEW },
          take: 50,
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  describe('assignableStaff', () => {
    it('queries only active users in the staff role set', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'u1', fullName: 'A', email: 'a@b.com', role: Role.SALES }]);

      const result = await service.assignableStaff();

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: { in: STAFF_ROLES }, isActive: true },
        }),
      );
      expect(STAFF_ROLES).toEqual(
        expect.arrayContaining([Role.SUPER_ADMIN, Role.ADMIN, Role.SALES, Role.CUSTOMER_SERVICE, Role.MARKETING_SEO]),
      );
      expect(STAFF_ROLES).not.toContain(Role.WAREHOUSE_STAFF);
      expect(STAFF_ROLES).not.toContain(Role.RETAIL_CUSTOMER);
      expect(result).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the lead does not exist', async () => {
      prisma.lead.findUnique.mockResolvedValue(null);
      await expect(service.update('missing', { status: LeadStatus.CONTACTED })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.lead.update).not.toHaveBeenCalled();
    });

    it('updates status alone without touching assigneeId', async () => {
      prisma.lead.findUnique.mockResolvedValue({ id: 'l1', status: LeadStatus.NEW, assigneeId: null });
      prisma.lead.update.mockResolvedValue({ id: 'l1', status: LeadStatus.CONTACTED });

      await service.update('l1', { status: LeadStatus.CONTACTED });

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(prisma.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'l1' }, data: { status: LeadStatus.CONTACTED } }),
      );
    });

    it('rejects an assigneeId that does not reference an existing user', async () => {
      prisma.lead.findUnique.mockResolvedValue({ id: 'l1', status: LeadStatus.NEW });
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.update('l1', { assigneeId: 'missing-user' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.lead.update).not.toHaveBeenCalled();
    });

    it('rejects assigning a lead to a non-staff (customer) user', async () => {
      prisma.lead.findUnique.mockResolvedValue({ id: 'l1', status: LeadStatus.NEW });
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: Role.RETAIL_CUSTOMER });

      await expect(service.update('l1', { assigneeId: 'u1' })).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.lead.update).not.toHaveBeenCalled();
    });

    it('accepts assigning a lead to a valid staff user alongside a status change', async () => {
      prisma.lead.findUnique.mockResolvedValue({ id: 'l1', status: LeadStatus.NEW });
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: Role.SALES });
      prisma.lead.update.mockResolvedValue({ id: 'l1', status: LeadStatus.CONTACTED, assigneeId: 'u1' });

      await service.update('l1', { status: LeadStatus.CONTACTED, assigneeId: 'u1' });

      expect(prisma.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'l1' },
          data: { status: LeadStatus.CONTACTED, assigneeId: 'u1' },
        }),
      );
    });

    it('unassigns a lead when assigneeId is explicitly null, skipping user validation', async () => {
      prisma.lead.findUnique.mockResolvedValue({ id: 'l1', status: LeadStatus.NEW });
      prisma.lead.update.mockResolvedValue({ id: 'l1', assigneeId: null });

      await service.update('l1', { assigneeId: null });

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(prisma.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'l1' }, data: { assigneeId: null } }),
      );
    });

    it('logs a STATUS_CHANGE activity atomically via $transaction when status actually changes', async () => {
      prisma.lead.findUnique.mockResolvedValue({ id: 'l1', status: LeadStatus.NEW, assigneeId: null });
      prisma.lead.update.mockResolvedValue({ id: 'l1', status: LeadStatus.CONTACTED });

      await service.update('l1', { status: LeadStatus.CONTACTED }, 'author-1');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.leadActivity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            leadId: 'l1',
            authorId: 'author-1',
            type: LeadActivityType.STATUS_CHANGE,
            content: 'Status changed from NEW to CONTACTED',
          }),
        }),
      );
    });

    it('does not log a STATUS_CHANGE activity or use $transaction for a no-op status "change"', async () => {
      prisma.lead.findUnique.mockResolvedValue({ id: 'l1', status: LeadStatus.NEW, assigneeId: null });
      prisma.lead.update.mockResolvedValue({ id: 'l1', status: LeadStatus.NEW });

      await service.update('l1', { status: LeadStatus.NEW });

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.leadActivity.create).not.toHaveBeenCalled();
    });

    it('does not log a STATUS_CHANGE activity when only assigneeId changes', async () => {
      prisma.lead.findUnique.mockResolvedValue({ id: 'l1', status: LeadStatus.NEW });
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: Role.SALES });
      prisma.lead.update.mockResolvedValue({ id: 'l1', assigneeId: 'u1' });

      await service.update('l1', { assigneeId: 'u1' });

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.leadActivity.create).not.toHaveBeenCalled();
    });
  });

  describe('getLeadDetail', () => {
    it('throws NotFoundException when the lead does not exist', async () => {
      prisma.lead.findUnique.mockResolvedValue(null);
      await expect(service.getLeadDetail('missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns the lead with its activity timeline included', async () => {
      const lead = { id: 'l1', activities: [{ id: 'a1' }] };
      prisma.lead.findUnique.mockResolvedValue(lead);

      const result = await service.getLeadDetail('l1');

      expect(result).toBe(lead);
      expect(prisma.lead.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'l1' },
          include: expect.objectContaining({
            activities: expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
          }),
        }),
      );
    });
  });

  describe('addActivity', () => {
    it('throws NotFoundException when the lead does not exist', async () => {
      prisma.lead.findUnique.mockResolvedValue(null);
      await expect(
        service.addActivity('missing', 'author-1', { type: LeadActivityType.NOTE, content: 'hi' } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.leadActivity.create).not.toHaveBeenCalled();
    });

    it('creates a LeadActivity row scoped to the lead and author', async () => {
      prisma.lead.findUnique.mockResolvedValue({ id: 'l1' });
      prisma.leadActivity.create.mockResolvedValue({ id: 'a1' });

      await service.addActivity('l1', 'author-1', { type: LeadActivityType.CALL, content: 'Called customer' } as any);

      expect(prisma.leadActivity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            leadId: 'l1',
            authorId: 'author-1',
            type: LeadActivityType.CALL,
            content: 'Called customer',
          }),
        }),
      );
    });
  });

  describe('completeTask', () => {
    it('throws NotFoundException when the activity does not exist', async () => {
      prisma.leadActivity.findUnique.mockResolvedValue(null);
      await expect(service.completeTask('missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects completing a non-TASK activity', async () => {
      prisma.leadActivity.findUnique.mockResolvedValue({ id: 'a1', type: LeadActivityType.NOTE, completedAt: null });
      await expect(service.completeTask('a1')).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.leadActivity.update).not.toHaveBeenCalled();
    });

    it('sets completedAt on an open TASK activity', async () => {
      prisma.leadActivity.findUnique.mockResolvedValue({ id: 'a1', type: LeadActivityType.TASK, completedAt: null });
      prisma.leadActivity.update.mockResolvedValue({ id: 'a1', completedAt: new Date() });

      await service.completeTask('a1');

      expect(prisma.leadActivity.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'a1' }, data: expect.objectContaining({ completedAt: expect.any(Date) }) }),
      );
    });

    it('is idempotent when the TASK activity is already completed', async () => {
      const already = { id: 'a1', type: LeadActivityType.TASK, completedAt: new Date('2026-01-01') };
      prisma.leadActivity.findUnique.mockResolvedValue(already);

      const result = await service.completeTask('a1');

      expect(result).toBe(already);
      expect(prisma.leadActivity.update).not.toHaveBeenCalled();
    });
  });
});
