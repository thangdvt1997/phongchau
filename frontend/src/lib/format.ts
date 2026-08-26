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

const RELATIVE_TIME_DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: 'seconds' },
  { amount: 60, unit: 'minutes' },
  { amount: 24, unit: 'hours' },
  { amount: 7, unit: 'days' },
  { amount: 4.34524, unit: 'weeks' },
  { amount: 12, unit: 'months' },
  { amount: Number.POSITIVE_INFINITY, unit: 'years' },
];

// Renders an ISO date as "2 days ago" / "in 3 hours". Falls back to a plain locale
// date string if the input is unparseable or Intl.RelativeTimeFormat is unavailable.
export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  try {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    let duration = (date.getTime() - Date.now()) / 1000;
    for (const division of RELATIVE_TIME_DIVISIONS) {
      if (Math.abs(duration) < division.amount) {
        return rtf.format(Math.round(duration), division.unit);
      }
      duration /= division.amount;
    }
    return date.toLocaleDateString();
  } catch {
    return date.toLocaleDateString();
  }
}
