import { Injectable } from '@nestjs/common';
import { PaymentProviderType } from '@prisma/client';
import {
  PaymentIntentRequest,
  PaymentIntentResult,
  PaymentProvider,
  PaymentWebhookResult,
} from '../../../common/interfaces/payment-provider.interface';

/**
 * Manual bank transfer: the customer wires funds and uploads a proof of transfer
 * (see PaymentsController's proof-upload endpoint), then an admin manually confirms
 * the payment via the mark-paid endpoint. No gateway webhook exists for this method.
 */
@Injectable()
export class BankTransferPaymentProvider implements PaymentProvider {
  readonly type = PaymentProviderType.BANK_TRANSFER;
  readonly enabled = true;

  async createIntent(request: PaymentIntentRequest): Promise<PaymentIntentResult> {
    return {
      redirectUrl: null,
      transactionRef: `BT-${request.orderNumber}`,
      paidImmediately: false,
    };
  }

  async verifyWebhook(payload: Record<string, unknown>): Promise<PaymentWebhookResult> {
    // Bank transfer has no gateway webhook either; formality to satisfy the interface.
    return {
      transactionRef: payload.transactionRef as string,
      success: true,
      rawPayload: payload,
    };
  }
}
