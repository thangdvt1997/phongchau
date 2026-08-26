import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Payment, PaymentProviderType, PaymentStatus } from '@prisma/client';
import {
  PAYMENT_PROVIDER_REGISTRY,
  PaymentProvider,
} from '../../common/interfaces/payment-provider.interface';
import { RefundPaymentDto } from './dto/refund-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER_REGISTRY)
    private readonly registry: Map<PaymentProviderType, PaymentProvider>,
  ) {}

  /**
   * Checked by Orders.checkout() before it reserves stock or creates the order, so an
   * unsupported/disabled provider fails fast without leaving an orphaned PENDING order,
   * an incremented coupon usage count, or a reserve-then-release stock round trip behind.
   */
  ensureProviderEnabled(provider: PaymentProviderType): void {
    const registered = this.registry.get(provider);
    if (!registered) {
      throw new BadRequestException(`Unsupported payment provider: ${provider}`);
    }
    if (!registered.enabled) {
      throw new BadRequestException(`Payment provider ${provider} is not enabled`);
    }
  }

  /**
   * Stable public contract consumed by the Orders module (built separately) at
   * checkout time. Do not change this method's shape.
   */
  async createPaymentForOrder(params: {
    orderId: string;
    orderNumber: string;
    amount: number;
    currency: string;
    provider: PaymentProviderType;
  }): Promise<{ payment: Payment; redirectUrl: string | null }> {
    this.ensureProviderEnabled(params.provider);
    const provider = this.registry.get(params.provider)!;

    const intent = await provider.createIntent({
      orderId: params.orderId,
      orderNumber: params.orderNumber,
      amount: params.amount,
      currency: params.currency,
    });

    const payment = await this.prisma.payment.create({
      data: {
        orderId: params.orderId,
        provider: params.provider,
        status: PaymentStatus.PENDING,
        amount: params.amount,
        currency: params.currency,
        transactionRef: intent.transactionRef,
      },
    });

    return { payment, redirectUrl: intent.redirectUrl };
  }

  async handleWebhook(providerType: PaymentProviderType, payload: Record<string, unknown>) {
    const provider = this.registry.get(providerType);
    if (!provider) {
      throw new BadRequestException(`Unsupported payment provider: ${providerType}`);
    }

    const result = await provider.verifyWebhook(payload);

    const payment = await this.prisma.payment.findFirst({
      where: { transactionRef: result.transactionRef },
    });
    if (!payment) {
      throw new NotFoundException(`No payment found for transactionRef ${result.transactionRef}`);
    }

    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: result.success ? PaymentStatus.PAID : PaymentStatus.FAILED },
    });

    return this.serialize(updated);
  }

  async markPaid(id: string) {
    await this.findPaymentOrThrow(id);
    const payment = await this.prisma.payment.update({
      where: { id },
      data: { status: PaymentStatus.PAID },
    });
    return this.serialize(payment);
  }

  async refund(id: string, dto: RefundPaymentDto) {
    const existing = await this.findPaymentOrThrow(id);
    const fullAmount = Number(existing.amount);
    const refundAmount = dto.amount ?? fullAmount;
    const status =
      refundAmount < fullAmount ? PaymentStatus.PARTIALLY_REFUNDED : PaymentStatus.REFUNDED;

    const payment = await this.prisma.payment.update({
      where: { id },
      data: { status },
    });
    return this.serialize(payment);
  }

  async attachProof(id: string, proofUrl: string) {
    await this.findPaymentOrThrow(id);
    const payment = await this.prisma.payment.update({
      where: { id },
      data: { proofUrl },
    });
    return this.serialize(payment);
  }

  private async findPaymentOrThrow(id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) {
      throw new NotFoundException(`Payment ${id} not found`);
    }
    return payment;
  }

  private serialize(payment: Payment) {
    return { ...payment, amount: Number(payment.amount) };
  }
}
