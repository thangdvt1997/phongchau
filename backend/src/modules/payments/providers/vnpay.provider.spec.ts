import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { VnpayPaymentProvider } from './vnpay.provider';

const HASH_SECRET = 'test-hash-secret';
const TMN_CODE = 'TESTTMN';

/** Reimplements VNPay's sign convention independently of the provider, for test isolation. */
function sign(params: Record<string, string>, secret: string): string {
  const sortedKeys = Object.keys(params).sort();
  const signData = sortedKeys
    .map((key) => `${key}=${encodeURIComponent(params[key]).replace(/%20/g, '+')}`)
    .join('&');
  return crypto.createHmac('sha512', secret).update(Buffer.from(signData, 'utf-8')).digest('hex');
}

function makeConfig(overrides: Partial<Record<string, unknown>> = {}): ConfigService {
  const values: Record<string, unknown> = {
    'payments.vnpay.enabled': true,
    'payments.vnpay.tmnCode': TMN_CODE,
    'payments.vnpay.hashSecret': HASH_SECRET,
    ...overrides,
  };
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

describe('VnpayPaymentProvider', () => {
  describe('when disabled', () => {
    it('throws ServiceUnavailableException from createIntent', async () => {
      const provider = new VnpayPaymentProvider(makeConfig({ 'payments.vnpay.enabled': false }));
      await expect(
        provider.createIntent({
          orderId: 'o1',
          orderNumber: 'ORD-1',
          amount: 100000,
          currency: 'VND',
        }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('reports enabled=false', () => {
      const provider = new VnpayPaymentProvider(makeConfig({ 'payments.vnpay.enabled': false }));
      expect(provider.enabled).toBe(false);
    });
  });

  describe('when enabled', () => {
    it('reports enabled=true', () => {
      const provider = new VnpayPaymentProvider(makeConfig());
      expect(provider.enabled).toBe(true);
    });

    it('builds a redirect URL signed with the configured hash secret', async () => {
      const provider = new VnpayPaymentProvider(makeConfig());

      const result = await provider.createIntent({
        orderId: 'o1',
        orderNumber: 'ORD-1',
        amount: 100000,
        currency: 'VND',
        returnUrl: 'https://phongchau.example/return',
      });

      expect(result.transactionRef).toBe('ORD-1');
      expect(result.paidImmediately).toBe(false);
      expect(result.redirectUrl).toContain('vnp_TxnRef=ORD-1');
      expect(result.redirectUrl).toContain(`vnp_TmnCode=${TMN_CODE}`);
      expect(result.redirectUrl).toContain('vnp_SecureHash=');

      // Re-derive the signed params from the URL and confirm the hash matches an
      // independent computation of the same HMAC-SHA512 signing convention.
      const url = new URL(result.redirectUrl as string);
      const secureHash = url.searchParams.get('vnp_SecureHash')!;
      url.searchParams.delete('vnp_SecureHash');
      const params: Record<string, string> = {};
      url.searchParams.forEach((value, key) => {
        params[key] = value;
      });
      expect(sign(params, HASH_SECRET)).toBe(secureHash);
    });
  });

  describe('verifyWebhook', () => {
    it('succeeds when the signature is valid and vnp_ResponseCode is 00', async () => {
      const provider = new VnpayPaymentProvider(makeConfig());
      const params: Record<string, string> = {
        vnp_TxnRef: 'ORD-1',
        vnp_ResponseCode: '00',
        vnp_Amount: '10000000',
      };
      const vnp_SecureHash = sign(params, HASH_SECRET);

      const result = await provider.verifyWebhook({ ...params, vnp_SecureHash });

      expect(result.success).toBe(true);
      expect(result.transactionRef).toBe('ORD-1');
    });

    it('fails when vnp_ResponseCode is not 00, even with a valid signature', async () => {
      const provider = new VnpayPaymentProvider(makeConfig());
      const params: Record<string, string> = {
        vnp_TxnRef: 'ORD-1',
        vnp_ResponseCode: '24',
      };
      const vnp_SecureHash = sign(params, HASH_SECRET);

      const result = await provider.verifyWebhook({ ...params, vnp_SecureHash });

      expect(result.success).toBe(false);
    });

    it('fails when the signature has been tampered with', async () => {
      const provider = new VnpayPaymentProvider(makeConfig());
      const params: Record<string, string> = {
        vnp_TxnRef: 'ORD-1',
        vnp_ResponseCode: '00',
      };
      const validHash = sign(params, HASH_SECRET);
      const tamperedHash = `${validHash.slice(0, -1)}${validHash.endsWith('a') ? 'b' : 'a'}`;

      const result = await provider.verifyWebhook({ ...params, vnp_SecureHash: tamperedHash });

      expect(result.success).toBe(false);
    });

    it('fails when signed with the wrong secret', async () => {
      const provider = new VnpayPaymentProvider(makeConfig());
      const params: Record<string, string> = {
        vnp_TxnRef: 'ORD-1',
        vnp_ResponseCode: '00',
      };
      const wrongHash = sign(params, 'a-different-secret');

      const result = await provider.verifyWebhook({ ...params, vnp_SecureHash: wrongHash });

      expect(result.success).toBe(false);
    });
  });
});
