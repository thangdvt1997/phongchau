import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PaymentProviderType } from '@prisma/client';
import {
  PaymentIntentRequest,
  PaymentIntentResult,
  PaymentProvider,
  PaymentWebhookResult,
} from '../../../common/interfaces/payment-provider.interface';

/**
 * Stripe integration. Disabled by default (no real Stripe account/keys exist in this
 * environment) — `payments.stripe.enabled` gates it. Wiring up the real `stripe` npm
 * package is explicitly out of scope for P0 without real keys; this stub keeps the
 * PaymentProvider contract structurally satisfied so the registry lookup and Payment
 * row creation can be exercised end-to-end in tests.
 */
@Injectable()
export class StripePaymentProvider implements PaymentProvider {
  readonly type = PaymentProviderType.STRIPE;

  constructor(private readonly config: ConfigService) {}

  get enabled(): boolean {
    return this.config.get<boolean>('payments.stripe.enabled') === true;
  }

  async createIntent(request: PaymentIntentRequest): Promise<PaymentIntentResult> {
    if (!this.enabled) {
      throw new ServiceUnavailableException('Stripe is not enabled in this environment');
    }

    // A real implementation would use the `stripe` npm package here, e.g.:
    //   const stripe = new Stripe(this.config.get('payments.stripe.secretKey'), { apiVersion: '2024-06-20' });
    //   const session = await stripe.checkout.sessions.create({
    //     mode: 'payment',
    //     line_items: [{ price_data: { currency: request.currency, unit_amount: ..., product_data: { name: request.orderNumber } }, quantity: 1 }],
    //     success_url: request.returnUrl, cancel_url: request.returnUrl,
    //   });
    //   return { redirectUrl: session.url, transactionRef: session.id, paidImmediately: false };
    const stubSessionId = `cs_stub_${randomUUID()}`;
    return {
      redirectUrl: `https://checkout.stripe.com/pay/${stubSessionId}`,
      transactionRef: stubSessionId,
      paidImmediately: false,
    };
  }

  async verifyWebhook(payload: Record<string, unknown>): Promise<PaymentWebhookResult> {
    // A real implementation would verify the `Stripe-Signature` header via
    // stripe.webhooks.constructEvent(rawBody, signature, webhookSecret) and branch on
    // event.type (e.g. 'checkout.session.completed'). Stubbed for the same reason as
    // createIntent above — no real keys/webhook secret exist in this environment.
    const success = payload['type'] === 'checkout.session.completed';
    return {
      transactionRef: (payload['transactionRef'] as string) ?? '',
      success,
      rawPayload: payload,
    };
  }
}
