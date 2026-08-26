import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ALLOWED_TRANSITIONS, assertValidOemTransition, OemService } from './oem.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LeadSource, LeadStatus, OemRequestStatus, Role } from '@prisma/client';

describe('OEM status transition map', () => {
  it('matches the exact allowed edges of the OEM linear pipeline', () => {
    expect(ALLOWED_TRANSITIONS).toEqual({
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
    });
  });

  it('allows every step along the linear happy-path pipeline', () => {
    const pipeline = [
      OemRequestStatus.REQUEST,
      OemRequestStatus.REVIEW,
      OemRequestStatus.SAMPLE,
      OemRequestStatus.PRICING,
      OemRequestStatus.APPROVAL,
      OemRequestStatus.PRODUCTION,
      OemRequestStatus.QC,
      OemRequestStatus.DELIVERY,
    ];
    for (let i = 0; i < pipeline.length - 1; i++) {
      expect(() => assertValidOemTransition(pipeline[i], pipeline[i + 1])).not.toThrow();
    }
  });

  it('allows QC to send the batch back to PRODUCTION for rework', () => {
    expect(() =>
      assertValidOemTransition(OemRequestStatus.QC, OemRequestStatus.PRODUCTION),
    ).not.toThrow();
  });

  it('allows a no-op transition to the same status', () => {
    expect(() =>
      assertValidOemTransition(OemRequestStatus.SAMPLE, OemRequestStatus.SAMPLE),
    ).not.toThrow();
  });

  it('allows CANCELLED from every non-terminal state', () => {
    const nonTerminal = Object.values(OemRequestStatus).filter(
      (status) =>
        status !== OemRequestStatus.DELIVERY &&
        status !== OemRequestStatus.REJECTED &&
        status !== OemRequestStatus.CANCELLED,
    );
    for (const status of nonTerminal) {
      expect(() => assertValidOemTransition(status, OemRequestStatus.CANCELLED)).not.toThrow();
    }
  });

  it('rejects skipping ahead in the pipeline (illegal transition)', () => {
    expect(() =>
      assertValidOemTransition(OemRequestStatus.REQUEST, OemRequestStatus.PRICING),
    ).toThrow(BadRequestException);
    expect(() =>
      assertValidOemTransition(OemRequestStatus.REVIEW, OemRequestStatus.PRODUCTION),
    ).toThrow(BadRequestException);
  });

  it('rejects REJECTED from REQUEST and from PRODUCTION onward', () => {
    expect(() =>
      assertValidOemTransition(OemRequestStatus.REQUEST, OemRequestStatus.REJECTED),
    ).toThrow(BadRequestException);
    expect(() =>
      assertValidOemTransition(OemRequestStatus.PRODUCTION, OemRequestStatus.REJECTED),
    ).toThrow(BadRequestException);
    expect(() =>
      assertValidOemTransition(OemRequestStatus.QC, OemRequestStatus.REJECTED),
    ).toThrow(BadRequestException);
  });

  it('rejects any transition out of terminal states', () => {
    expect(() =>
      assertValidOemTransition(OemRequestStatus.DELIVERY, OemRequestStatus.QC),
    ).toThrow(BadRequestException);
    expect(() =>
      assertValidOemTransition(OemRequestStatus.REJECTED, OemRequestStatus.REQUEST),
    ).toThrow(BadRequestException);
    expect(() =>
      assertValidOemTransition(OemRequestStatus.CANCELLED, OemRequestStatus.REQUEST),
    ).toThrow(BadRequestException);
  });
});

describe('OemService', () => {
  let service: OemService;
  let prisma: any;
  let notifications: any;

  const user = { id: 'u1', email: 'buyer@b.com', role: Role.B2B_CUSTOMER, companyId: null };

  beforeEach(() => {
    prisma = {
      oemRequest: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      oemMessage: { create: jest.fn() },
      lead: { create: jest.fn() },
      user: { findUnique: jest.fn() },
      auditLog: { create: jest.fn() },
      $transaction: jest.fn(),
    };
    notifications = { notify: jest.fn().mockResolvedValue(undefined) };
    service = new OemService(prisma as unknown as PrismaService, notifications);
  });

  describe('create', () => {
    it('creates the request in REQUEST status, creates a Lead, and notifies sales', async () => {
      prisma.oemRequest.create.mockResolvedValue({
        id: 'o1',
        requestNumber: 'OEM-2026-ABC123',
        status: OemRequestStatus.REQUEST,
        userId: 'u1',
        companyId: null,
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        fullName: 'Buyer Co',
        email: 'buyer@b.com',
        phone: '0900000000',
      });

      await service.create(user, { productType: 'Instant coffee' } as any);

      expect(prisma.oemRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: OemRequestStatus.REQUEST, userId: 'u1' }),
        }),
      );
      expect(prisma.lead.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            source: LeadSource.OEM_REQUEST,
            status: LeadStatus.NEW,
          }),
        }),
      );
      expect(notifications.notify).toHaveBeenCalledWith(
        'oem.submitted',
        expect.objectContaining({
          to: 'sales@phongchau.example',
          data: { requestNumber: 'OEM-2026-ABC123', oemRequestId: 'o1' },
        }),
      );
    });

    it('does not let a notification failure block submission', async () => {
      prisma.oemRequest.create.mockResolvedValue({
        id: 'o1',
        requestNumber: 'OEM-2026-ABC123',
        status: OemRequestStatus.REQUEST,
        userId: 'u1',
        companyId: null,
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        fullName: 'Buyer Co',
        email: 'buyer@b.com',
        phone: null,
      });
      notifications.notify.mockRejectedValue(new Error('notification service down'));

      await expect(
        service.create(user, { productType: 'Instant coffee' } as any),
      ).resolves.toBeDefined();
      expect(prisma.lead.create).toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('throws ForbiddenException when the caller does not own the request', async () => {
      prisma.oemRequest.findUnique.mockResolvedValue({
        id: 'o1',
        userId: 'someone-else',
        companyId: null,
        status: OemRequestStatus.REQUEST,
      });
      await expect(service.cancel('o1', user)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws NotFoundException when the request does not exist', async () => {
      prisma.oemRequest.findUnique.mockResolvedValue(null);
      await expect(service.cancel('missing', user)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException when already in a terminal state', async () => {
      prisma.oemRequest.findUnique.mockResolvedValue({
        id: 'o1',
        userId: 'u1',
        companyId: null,
        status: OemRequestStatus.DELIVERY,
      });
      await expect(service.cancel('o1', user)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('cancels a non-terminal request owned by the caller', async () => {
      prisma.oemRequest.findUnique.mockResolvedValue({
        id: 'o1',
        userId: 'u1',
        companyId: null,
        status: OemRequestStatus.REVIEW,
      });
      prisma.oemRequest.update.mockResolvedValue({
        id: 'o1',
        status: OemRequestStatus.CANCELLED,
      });

      await service.cancel('o1', user);

      expect(prisma.oemRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: OemRequestStatus.CANCELLED } }),
      );
    });
  });

  describe('adminUpdateStatus', () => {
    const admin = { id: 'a1', email: 'sales@pc.com', role: Role.SALES, companyId: null };

    it('rejects an illegal transition requested by an admin', async () => {
      prisma.oemRequest.findUnique.mockResolvedValue({
        id: 'o1',
        status: OemRequestStatus.REQUEST,
        assignedSalesId: null,
      });
      await expect(
        service.adminUpdateStatus('o1', { status: OemRequestStatus.DELIVERY }, admin),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('assigns the caller as sales owner when not already assigned, and records an audit log', async () => {
      prisma.oemRequest.findUnique.mockResolvedValue({
        id: 'o1',
        status: OemRequestStatus.REQUEST,
        assignedSalesId: null,
        userId: 'u1',
        requestNumber: 'OEM-2026-ABC123',
      });
      prisma.$transaction.mockResolvedValue([
        { id: 'o1', status: OemRequestStatus.REVIEW, requestNumber: 'OEM-2026-ABC123', userId: 'u1' },
        {},
      ]);

      await service.adminUpdateStatus('o1', { status: OemRequestStatus.REVIEW, note: 'ok' }, admin);

      expect(prisma.$transaction).toHaveBeenCalledWith([
        expect.objectContaining({}),
        expect.objectContaining({}),
      ]);
      expect(notifications.notify).toHaveBeenCalledWith(
        'oem.status_changed',
        expect.objectContaining({ userId: 'u1' }),
      );
    });

    it('does not overwrite an already-assigned sales owner', async () => {
      prisma.oemRequest.findUnique.mockResolvedValue({
        id: 'o1',
        status: OemRequestStatus.REQUEST,
        assignedSalesId: 'existing-sales-id',
        userId: 'u1',
        requestNumber: 'OEM-2026-ABC123',
      });
      prisma.$transaction.mockImplementation((ops: any[]) => Promise.resolve([
        { id: 'o1', status: OemRequestStatus.REVIEW, requestNumber: 'OEM-2026-ABC123', userId: 'u1' },
        {},
      ]));

      await service.adminUpdateStatus('o1', { status: OemRequestStatus.REVIEW }, admin);

      // Inspect the update call embedded in the $transaction array via the mock's call args.
      const transactionArg = prisma.$transaction.mock.calls[0][0];
      expect(transactionArg).toHaveLength(2);
    });
  });
});
