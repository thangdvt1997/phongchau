import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ALLOWED_TRANSITIONS, assertValidRfqTransition, RfqService } from './rfq.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LeadSource, LeadStatus, QuotationStatus, Role, RfqStatus } from '@prisma/client';

describe('RFQ status transition map', () => {
  it('matches the exact allowed edges of the RFQ state machine', () => {
    expect(ALLOWED_TRANSITIONS).toEqual({
      [RfqStatus.DRAFT]: [RfqStatus.SUBMITTED, RfqStatus.CANCELLED],
      [RfqStatus.SUBMITTED]: [RfqStatus.SALES_REVIEW, RfqStatus.REJECTED, RfqStatus.CANCELLED],
      [RfqStatus.SALES_REVIEW]: [
        RfqStatus.QUOTATION_SENT,
        RfqStatus.REJECTED,
        RfqStatus.CANCELLED,
      ],
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
    });
  });

  it('allows every step along the main happy-path pipeline', () => {
    const pipeline = [
      RfqStatus.DRAFT,
      RfqStatus.SUBMITTED,
      RfqStatus.SALES_REVIEW,
      RfqStatus.QUOTATION_SENT,
      RfqStatus.ACCEPTED,
      RfqStatus.PURCHASE_ORDER,
      RfqStatus.PAYMENT,
      RfqStatus.PRODUCTION,
      RfqStatus.SHIPPING,
      RfqStatus.COMPLETED,
    ];
    for (let i = 0; i < pipeline.length - 1; i++) {
      expect(() => assertValidRfqTransition(pipeline[i], pipeline[i + 1])).not.toThrow();
    }
  });

  it('allows negotiation to loop back and forth with quotation_sent', () => {
    expect(() =>
      assertValidRfqTransition(RfqStatus.QUOTATION_SENT, RfqStatus.NEGOTIATION),
    ).not.toThrow();
    expect(() =>
      assertValidRfqTransition(RfqStatus.NEGOTIATION, RfqStatus.QUOTATION_SENT),
    ).not.toThrow();
  });

  it('allows a no-op transition to the same status', () => {
    expect(() =>
      assertValidRfqTransition(RfqStatus.NEGOTIATION, RfqStatus.NEGOTIATION),
    ).not.toThrow();
  });

  it('allows CANCELLED from every non-terminal state', () => {
    const nonTerminal = Object.values(RfqStatus).filter(
      (status) => status !== RfqStatus.COMPLETED && status !== RfqStatus.REJECTED && status !== RfqStatus.CANCELLED,
    );
    for (const status of nonTerminal) {
      expect(() => assertValidRfqTransition(status, RfqStatus.CANCELLED)).not.toThrow();
    }
  });

  it('rejects skipping ahead in the pipeline (illegal transition)', () => {
    expect(() => assertValidRfqTransition(RfqStatus.DRAFT, RfqStatus.QUOTATION_SENT)).toThrow(
      BadRequestException,
    );
    expect(() => assertValidRfqTransition(RfqStatus.SUBMITTED, RfqStatus.ACCEPTED)).toThrow(
      BadRequestException,
    );
  });

  it('rejects REJECTED from DRAFT and from post-acceptance states', () => {
    expect(() => assertValidRfqTransition(RfqStatus.DRAFT, RfqStatus.REJECTED)).toThrow(
      BadRequestException,
    );
    expect(() => assertValidRfqTransition(RfqStatus.ACCEPTED, RfqStatus.REJECTED)).toThrow(
      BadRequestException,
    );
  });

  it('rejects any transition out of terminal states', () => {
    expect(() => assertValidRfqTransition(RfqStatus.COMPLETED, RfqStatus.SHIPPING)).toThrow(
      BadRequestException,
    );
    expect(() => assertValidRfqTransition(RfqStatus.REJECTED, RfqStatus.SUBMITTED)).toThrow(
      BadRequestException,
    );
    expect(() => assertValidRfqTransition(RfqStatus.CANCELLED, RfqStatus.DRAFT)).toThrow(
      BadRequestException,
    );
  });
});

describe('RfqService', () => {
  let service: RfqService;
  let prisma: any;
  let notifications: any;

  const user = { id: 'u1', email: 'buyer@b.com', role: Role.B2B_CUSTOMER, companyId: null };

  beforeEach(() => {
    prisma = {
      rfq: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      rfqMessage: { create: jest.fn() },
      quotation: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      lead: { create: jest.fn() },
      user: { findUnique: jest.fn() },
      auditLog: { create: jest.fn() },
      product: { count: jest.fn() },
      $transaction: jest.fn(),
    };
    notifications = { notify: jest.fn().mockResolvedValue(undefined) };
    service = new RfqService(prisma as unknown as PrismaService, notifications);
  });

  describe('submit', () => {
    it('throws BadRequestException when the RFQ is not in DRAFT', async () => {
      prisma.rfq.findUnique.mockResolvedValue({
        id: 'r1',
        userId: 'u1',
        companyId: null,
        status: RfqStatus.SUBMITTED,
      });
      await expect(service.submit('r1', user)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws ForbiddenException when the caller does not own the RFQ', async () => {
      prisma.rfq.findUnique.mockResolvedValue({
        id: 'r1',
        userId: 'someone-else',
        companyId: null,
        status: RfqStatus.DRAFT,
      });
      await expect(service.submit('r1', user)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws NotFoundException when the RFQ does not exist', async () => {
      prisma.rfq.findUnique.mockResolvedValue(null);
      await expect(service.submit('missing', user)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('transitions to SUBMITTED, creates a Lead, and notifies sales on success', async () => {
      prisma.rfq.findUnique.mockResolvedValue({
        id: 'r1',
        userId: 'u1',
        companyId: null,
        status: RfqStatus.DRAFT,
      });
      prisma.rfq.update.mockResolvedValue({
        id: 'r1',
        rfqNumber: 'RFQ-2026-ABC123',
        status: RfqStatus.SUBMITTED,
        items: [],
        quotations: [],
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        fullName: 'Buyer Co',
        email: 'buyer@b.com',
        phone: '0900000000',
      });

      await service.submit('r1', user);

      expect(prisma.rfq.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: RfqStatus.SUBMITTED } }),
      );
      expect(prisma.lead.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            source: LeadSource.RFQ,
            status: LeadStatus.NEW,
            rfqId: 'r1',
          }),
        }),
      );
      expect(notifications.notify).toHaveBeenCalledWith(
        'rfq.submitted',
        expect.objectContaining({ data: { rfqNumber: 'RFQ-2026-ABC123', rfqId: 'r1' } }),
      );
    });

    it('does not let a notification failure block submission', async () => {
      prisma.rfq.findUnique.mockResolvedValue({
        id: 'r1',
        userId: 'u1',
        companyId: null,
        status: RfqStatus.DRAFT,
      });
      prisma.rfq.update.mockResolvedValue({
        id: 'r1',
        rfqNumber: 'RFQ-2026-ABC123',
        status: RfqStatus.SUBMITTED,
        items: [],
        quotations: [],
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        fullName: 'Buyer Co',
        email: 'buyer@b.com',
        phone: null,
      });
      notifications.notify.mockRejectedValue(new Error('notification service down'));

      await expect(service.submit('r1', user)).resolves.toBeDefined();
      expect(prisma.lead.create).toHaveBeenCalled();
    });
  });

  // Regression: create() used to call rfq.create() with the client-supplied item
  // productIds straight through with no existence check, so a bogus productId tripped
  // Prisma's FK constraint and surfaced as a raw 500 instead of a clean 400.
  describe('create', () => {
    it('rejects when an item references a productId that does not exist, without creating the RFQ', async () => {
      prisma.product.count.mockResolvedValue(0);

      await expect(
        service.create(user, {
          items: [{ productId: 'missing-product', quantity: 10, unit: 'kg' }],
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.rfq.create).not.toHaveBeenCalled();
    });

    it('creates the RFQ once every item productId is confirmed to exist', async () => {
      prisma.product.count.mockResolvedValue(1);
      prisma.rfq.create.mockResolvedValue({
        id: 'r1',
        rfqNumber: 'RFQ-2026-XYZ999',
        status: RfqStatus.DRAFT,
        items: [],
        quotations: [],
      });

      await service.create(user, {
        items: [{ productId: 'p1', quantity: 10, unit: 'kg' }],
      } as any);

      expect(prisma.rfq.create).toHaveBeenCalled();
    });
  });

  describe('acceptQuotation', () => {
    it('rejects when the quotation is not in SENT status', async () => {
      prisma.rfq.findUnique.mockResolvedValue({
        id: 'r1',
        userId: 'u1',
        companyId: null,
        status: RfqStatus.QUOTATION_SENT,
      });
      prisma.quotation.findUnique.mockResolvedValue({
        id: 'q1',
        rfqId: 'r1',
        status: QuotationStatus.DRAFT,
      });
      await expect(service.acceptQuotation('r1', 'q1', user)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects when the RFQ is not QUOTATION_SENT or NEGOTIATION', async () => {
      prisma.rfq.findUnique.mockResolvedValue({
        id: 'r1',
        userId: 'u1',
        companyId: null,
        status: RfqStatus.SALES_REVIEW,
      });
      prisma.quotation.findUnique.mockResolvedValue({
        id: 'q1',
        rfqId: 'r1',
        status: QuotationStatus.SENT,
      });
      await expect(service.acceptQuotation('r1', 'q1', user)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('adminCreateQuotation', () => {
    const admin = { id: 'a1', email: 'sales@pc.com', role: Role.SALES, companyId: null };

    it('rejects when a quotation item references a productId that does not exist', async () => {
      prisma.rfq.findUnique.mockResolvedValue({ id: 'r1', status: RfqStatus.SALES_REVIEW });
      prisma.product.count.mockResolvedValue(0);

      await expect(
        service.adminCreateQuotation(
          'r1',
          {
            currency: 'VND',
            items: [{ productId: 'missing-product', quantity: 10, unitPrice: 1000 }],
          } as any,
          admin,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.quotation.create).not.toHaveBeenCalled();
    });
  });

  describe('adminUpdateStatus', () => {
    it('rejects an illegal transition requested by an admin', async () => {
      prisma.rfq.findUnique.mockResolvedValue({
        id: 'r1',
        status: RfqStatus.DRAFT,
        assignedSalesId: null,
      });
      const admin = { id: 'a1', email: 'sales@pc.com', role: Role.SALES, companyId: null };
      await expect(
        service.adminUpdateStatus('r1', { status: RfqStatus.COMPLETED }, admin),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
