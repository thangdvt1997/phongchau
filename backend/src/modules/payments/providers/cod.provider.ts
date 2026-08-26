import { Injectable } from '@nestjs/common';
import { PaymentProviderType } from '@prisma/client';
import {
  PaymentIntentRequest,
  PaymentIntentResult,
  PaymentProvider,
  PaymentWebhookResult,
} from '../../../common/interfaces/payment-provider.interface';

/**
 * Cash-on-delivery: no payment gateway involved. The order is marked PAID later by an
 * admin/warehouse action once the courier collects cash on delivery — that flow lives
 * in the Orders module, out of scope here.
 */
@Injectable()
export class CodPaymentProvider implements PaymentProvider {
  readonly type = PaymentProviderType.COD;
  readonly enabled = true;

  async createIntent(request: PaymentIntentRequest): Promise<PaymentIntentResult> {
    return {
      redirectUrl: null,
      transactionRef: `COD-${request.orderNumber}`,
      paidImmediately: false,
    };
  }

  async verifyWebhook(payload: Record<string, unknown>): Promise<PaymentWebhookResult> {
    // COD has no real payment gateway webhook; this only exists to satisfy the
    // PaymentProvider interface uniformly across providers.
    return {
      transactionRef: payload.transactionRef as string,
      success: true,
      rawPayload: payload,
    };
  }
}
