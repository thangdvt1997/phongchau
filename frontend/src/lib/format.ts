export function formatMoney(amount: number, currency = 'VND'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'VND' ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

// DISPLAY-only conversion (spec section 25, P1 slice): converts a VND amount to a target
// currency using the admin-managed rate from GET /currency/rates. `rate` follows the
// ExchangeRate convention (see backend schema.prisma): units of target currency per 1 VND.
// Orders/Payments/Cart never call this — they keep settling in VND under the hood.
export function convertDisplay(amountVnd: number, rate: number): number {
  return amountVnd * rate;
}
