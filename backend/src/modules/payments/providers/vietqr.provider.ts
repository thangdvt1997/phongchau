import { Injectable } from '@nestjs/common';
import { PaymentProviderType } from '@prisma/client';
import {
  PaymentIntentRequest,
  PaymentIntentResult,
  PaymentProvider,
  PaymentWebhookResult,
} from '../../../common/interfaces/payment-provider.interface';

/**
 * VietQR: Vietnamese interbank QR-code bank transfer. Unlike VNPay/Stripe this needs no
 * gateway account or API key — the QR image is generated on the fly by img.vietqr.io from
 * the merchant's bank BIN + account number (already known, no secrets involved), so it is
 * enabled by default. The customer scans the QR (or transfers manually using the account
 * details) and, same as bank transfer, an admin manually confirms the payment via the
 * mark-paid endpoint — no gateway webhook exists for this method either.
 *
 * The actual QR image URL is built client-side (see frontend/src/lib/vietqr.ts) from the
 * order number + grand total, which the frontend already has — nothing gateway-specific
 * needs to flow back through PaymentIntentResult.
 */
@Injectable()
export class VietqrPaymentProvider implements PaymentProvider {
  readonly type = PaymentProviderType.VIETQR;
  readonly enabled = process.env.PAYMENT_VIETQR_ENABLED !== 'false';

  async createIntent(request: PaymentIntentRequest): Promise<PaymentIntentResult> {
    return {
      redirectUrl: null,
      transactionRef: `VIETQR-${request.orderNumber}`,
      paidImmediately: false,
    };
  }

  async verifyWebhook(payload: Record<string, unknown>): Promise<PaymentWebhookResult> {
    // VietQR (bank-account QR) has no real webhook either; formality to satisfy the interface.
    return {
      transactionRef: payload.transactionRef as string,
      success: true,
      rawPayload: payload,
    };
  }
}
