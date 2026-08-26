import { VietqrPaymentProvider } from './vietqr.provider';

describe('VietqrPaymentProvider', () => {
  const ORIGINAL_ENV = process.env.PAYMENT_VIETQR_ENABLED;

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) {
      delete process.env.PAYMENT_VIETQR_ENABLED;
    } else {
      process.env.PAYMENT_VIETQR_ENABLED = ORIGINAL_ENV;
    }
  });

  describe('enabled', () => {
    it('defaults to enabled when PAYMENT_VIETQR_ENABLED is unset', () => {
      delete process.env.PAYMENT_VIETQR_ENABLED;
      expect(new VietqrPaymentProvider().enabled).toBe(true);
    });

    it('is enabled when PAYMENT_VIETQR_ENABLED is any value other than "false"', () => {
      process.env.PAYMENT_VIETQR_ENABLED = 'true';
      expect(new VietqrPaymentProvider().enabled).toBe(true);
    });

    it('is disabled only when PAYMENT_VIETQR_ENABLED is exactly "false"', () => {
      process.env.PAYMENT_VIETQR_ENABLED = 'false';
      expect(new VietqrPaymentProvider().enabled).toBe(false);
    });
  });

  describe('createIntent', () => {
    it('returns a no-redirect intent with a VIETQR-prefixed transaction ref', async () => {
      const provider = new VietqrPaymentProvider();

      const result = await provider.createIntent({
        orderId: 'o1',
        orderNumber: 'ORD-1',
        amount: 100000,
        currency: 'VND',
      });

      expect(result).toEqual({
        redirectUrl: null,
        transactionRef: 'VIETQR-ORD-1',
        paidImmediately: false,
      });
    });
  });

  describe('verifyWebhook', () => {
    it('is a formality that always succeeds and echoes the payload', async () => {
      const provider = new VietqrPaymentProvider();
      const payload = { transactionRef: 'VIETQR-ORD-1' };

      const result = await provider.verifyWebhook(payload);

      expect(result).toEqual({
        transactionRef: 'VIETQR-ORD-1',
        success: true,
        rawPayload: payload,
      });
    });
  });
});
