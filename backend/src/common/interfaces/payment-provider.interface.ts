import { PaymentProviderType } from '@prisma/client';

export interface PaymentIntentRequest {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  returnUrl?: string;
}

export interface PaymentIntentResult {
  /** Where to send the customer to complete payment; null when nothing further is needed (e.g. COD). */
  redirectUrl: string | null;
  transactionRef: string;
  /** True when the provider considers the order paid immediately (COD is settled on delivery, not here). */
  paidImmediately: boolean;
}

export interface PaymentWebhookResult {
  transactionRef: string;
  success: boolean;
  rawPayload: Record<string, unknown>;
}

/**
 * Every payment method (COD, bank transfer, VNPay, Stripe, ...) implements this so
 * the checkout/order flow never branches on provider-specific logic.
 */
export interface PaymentProvider {
  readonly type: PaymentProviderType;
  readonly enabled: boolean;
  createIntent(request: PaymentIntentRequest): Promise<PaymentIntentResult>;
  verifyWebhook(payload: Record<string, unknown>): Promise<PaymentWebhookResult>;
}

export const PAYMENT_PROVIDER_REGISTRY = 'PAYMENT_PROVIDER_REGISTRY';
