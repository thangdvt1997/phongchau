import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaymentProviderType, PaymentStatus } from '@prisma/client';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: any;
  let registry: Map<PaymentProviderType, any>;
  let codProvider: any;

  beforeEach(() => {
    prisma = {
      payment: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    codProvider = {
      type: PaymentProviderType.COD,
      enabled: true,
      createIntent: jest.fn().mockResolvedValue({
        redirectUrl: null,
        transactionRef: 'COD-ORD-1',
        paidImmediately: false,
      }),
      verifyWebhook: jest.fn(),
    };

    registry = new Map([[PaymentProviderType.COD, codProvider]]);
    service = new PaymentsService(prisma as unknown as PrismaService, registry);
  });

  describe('createPaymentForOrder', () => {
    it('throws BadRequestException when the provider is not registered', async () => {
      await expect(
        service.createPaymentForOrder({
          orderId: 'o1',
          orderNumber: 'ORD-1',
          amount: 100,
          currency: 'VND',
          provider: PaymentProviderType.STRIPE,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException when the provider is disabled', async () => {
      codProvider.enabled = false;
      await expect(
        service.createPaymentForOrder({
          orderId: 'o1',
          orderNumber: 'ORD-1',
          amount: 100,
          currency: 'VND',
          provider: PaymentProviderType.COD,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(codProvider.createIntent).not.toHaveBeenCalled();
    });

    it('creates a PENDING payment row and returns the provider redirect result', async () => {
      prisma.payment.create.mockResolvedValue({
        id: 'p1',
        orderId: 'o1',
        provider: PaymentProviderType.COD,
        status: PaymentStatus.PENDING,
        amount: 100,
        currency: 'VND',
        transactionRef: 'COD-ORD-1',
      });

      const result = await service.createPaymentForOrder({
        orderId: 'o1',
        orderNumber: 'ORD-1',
        amount: 100,
        currency: 'VND',
        provider: PaymentProviderType.COD,
      });

      expect(codProvider.createIntent).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: 'o1', orderNumber: 'ORD-1' }),
      );
      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: PaymentStatus.PENDING,
            transactionRef: 'COD-ORD-1',
          }),
        }),
      );
      expect(result.redirectUrl).toBeNull();
      expect(result.payment.id).toBe('p1');
    });
  });

  describe('handleWebhook', () => {
    it('throws BadRequestException for an unregistered provider', async () => {
      await expect(
        service.handleWebhook(PaymentProviderType.STRIPE, {}),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws NotFoundException when no payment matches the transactionRef', async () => {
      codProvider.verifyWebhook.mockResolvedValue({
        transactionRef: 'COD-ORD-1',
        success: true,
        rawPayload: {},
      });
      prisma.payment.findFirst.mockResolvedValue(null);

      await expect(
        service.handleWebhook(PaymentProviderType.COD, { transactionRef: 'COD-ORD-1' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('marks the payment PAID when the webhook reports success', async () => {
      codProvider.verifyWebhook.mockResolvedValue({
        transactionRef: 'COD-ORD-1',
        success: true,
        rawPayload: {},
      });
      prisma.payment.findFirst.mockResolvedValue({ id: 'p1', amount: 100 });
      prisma.payment.update.mockResolvedValue({ id: 'p1', amount: 100, status: PaymentStatus.PAID });

      const result = await service.handleWebhook(PaymentProviderType.COD, {
        transactionRef: 'COD-ORD-1',
      });

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { status: PaymentStatus.PAID },
      });
      expect(result.status).toBe(PaymentStatus.PAID);
    });

    it('marks the payment FAILED when the webhook reports failure', async () => {
      codProvider.verifyWebhook.mockResolvedValue({
        transactionRef: 'COD-ORD-1',
        success: false,
        rawPayload: {},
      });
      prisma.payment.findFirst.mockResolvedValue({ id: 'p1', amount: 100 });
      prisma.payment.update.mockResolvedValue({
        id: 'p1',
        amount: 100,
        status: PaymentStatus.FAILED,
      });

      const result = await service.handleWebhook(PaymentProviderType.COD, {
        transactionRef: 'COD-ORD-1',
      });

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { status: PaymentStatus.FAILED },
      });
      expect(result.status).toBe(PaymentStatus.FAILED);
    });
  });

  describe('markPaid', () => {
    it('throws NotFoundException when the payment does not exist', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);
      await expect(service.markPaid('missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates the payment status to PAID', async () => {
      prisma.payment.findUnique.mockResolvedValue({ id: 'p1', amount: 100 });
      prisma.payment.update.mockResolvedValue({ id: 'p1', amount: 100, status: PaymentStatus.PAID });

      const result = await service.markPaid('p1');
      expect(result.status).toBe(PaymentStatus.PAID);
      expect(result.amount).toBe(100);
    });
  });

  describe('refund', () => {
    it('fully refunds when no partial amount is given', async () => {
      prisma.payment.findUnique.mockResolvedValue({ id: 'p1', amount: 100 });
      prisma.payment.update.mockResolvedValue({
        id: 'p1',
        amount: 100,
        status: PaymentStatus.REFUNDED,
      });

      const result = await service.refund('p1', {});
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { status: PaymentStatus.REFUNDED },
      });
      expect(result.status).toBe(PaymentStatus.REFUNDED);
    });

    it('partially refunds when a smaller amount is given', async () => {
      prisma.payment.findUnique.mockResolvedValue({ id: 'p1', amount: 100 });
      prisma.payment.update.mockResolvedValue({
        id: 'p1',
        amount: 100,
        status: PaymentStatus.PARTIALLY_REFUNDED,
      });

      const result = await service.refund('p1', { amount: 40 });
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { status: PaymentStatus.PARTIALLY_REFUNDED },
      });
      expect(result.status).toBe(PaymentStatus.PARTIALLY_REFUNDED);
    });
  });

  describe('attachProof', () => {
    it('throws NotFoundException when the payment does not exist', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);
      await expect(service.attachProof('missing', 'http://x/proof.png')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('stores the proof URL on the payment', async () => {
      prisma.payment.findUnique.mockResolvedValue({ id: 'p1', amount: 100 });
      prisma.payment.update.mockResolvedValue({
        id: 'p1',
        amount: 100,
        proofUrl: 'http://x/proof.png',
      });

      const result = await service.attachProof('p1', 'http://x/proof.png');
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { proofUrl: 'http://x/proof.png' },
      });
      expect(result.proofUrl).toBe('http://x/proof.png');
    });
  });
});
