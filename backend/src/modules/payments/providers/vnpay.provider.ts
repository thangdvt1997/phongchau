import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PaymentProviderType } from '@prisma/client';
import {
  PaymentIntentRequest,
  PaymentIntentResult,
  PaymentProvider,
  PaymentWebhookResult,
} from '../../../common/interfaces/payment-provider.interface';

const VNPAY_PAY_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';

/**
 * VNPay integration. Disabled by default (no sandbox keys exist in this environment) —
 * `payments.vnpay.enabled` gates it. The signing/verification logic below follows
 * VNPay's documented convention (sort vnp_* params, build a query string, HMAC-SHA512
 * with the merchant hash secret) and is unit-tested in isolation; the redirect URL is
 * never actually called out to without real sandbox credentials.
 */
@Injectable()
export class VnpayPaymentProvider implements PaymentProvider {
  readonly type = PaymentProviderType.VNPAY;

  constructor(private readonly config: ConfigService) {}

  get enabled(): boolean {
    return this.config.get<boolean>('payments.vnpay.enabled') === true;
  }

  async createIntent(request: PaymentIntentRequest): Promise<PaymentIntentResult> {
    if (!this.enabled) {
      throw new ServiceUnavailableException('VNPay is not enabled in this environment');
    }

    const tmnCode = this.config.get<string>('payments.vnpay.tmnCode') ?? '';
    const hashSecret = this.config.get<string>('payments.vnpay.hashSecret') ?? '';

    const params: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Amount: String(Math.round(request.amount * 100)),
      vnp_CurrCode: 'VND',
      vnp_TxnRef: request.orderNumber,
      vnp_OrderInfo: `Payment for order ${request.orderNumber}`,
      vnp_OrderType: 'other',
      vnp_Locale: 'vn',
      vnp_ReturnUrl: request.returnUrl ?? '',
      vnp_CreateDate: this.formatDate(new Date()),
    };

    const signData = this.buildSignData(params);
    const secureHash = this.sign(signData, hashSecret);
    const redirectUrl = `${VNPAY_PAY_URL}?${signData}&vnp_SecureHash=${secureHash}`;

    return {
      redirectUrl,
      transactionRef: request.orderNumber,
      paidImmediately: false,
    };
  }

  async verifyWebhook(payload: Record<string, unknown>): Promise<PaymentWebhookResult> {
    const hashSecret = this.config.get<string>('payments.vnpay.hashSecret') ?? '';
    const { vnp_SecureHash, vnp_SecureHashType, ...rest } = payload as Record<string, unknown>;

    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(rest)) {
      params[key] = String(value);
    }

    const signData = this.buildSignData(params);
    const expectedHash = this.sign(signData, hashSecret);

    const providedHash = typeof vnp_SecureHash === 'string' ? vnp_SecureHash : '';
    const signatureValid =
      providedHash.length > 0 &&
      expectedHash.length === providedHash.length &&
      crypto.timingSafeEqual(Buffer.from(expectedHash), Buffer.from(providedHash));

    const success = signatureValid && params.vnp_ResponseCode === '00';

    return {
      transactionRef: params.vnp_TxnRef ?? '',
      success,
      rawPayload: payload,
    };
  }

  /** VNPay expects params sorted by key, URL-encoded with spaces as '+'. */
  private buildSignData(params: Record<string, string>): string {
    const sortedKeys = Object.keys(params).sort();
    return sortedKeys
      .map((key) => `${key}=${encodeURIComponent(params[key]).replace(/%20/g, '+')}`)
      .join('&');
  }

  private sign(data: string, secret: string): string {
    return crypto.createHmac('sha512', secret).update(Buffer.from(data, 'utf-8')).digest('hex');
  }

  private formatDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
      `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
    );
  }
}
