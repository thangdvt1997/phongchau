// Builds a VietQR bank-transfer QR image URL entirely client-side — no API key needed.
// img.vietqr.io generates the QR image on the fly from the bank BIN + account number
// (NEXT_PUBLIC_VIETQR_BANK_BIN / NEXT_PUBLIC_VIETQR_ACCOUNT_NO), which are public routing
// info, not secrets. Returns null (and callers render nothing) until both are configured —
// same "inert until configured" pattern as frontend/src/lib/analytics.ts and the disabled
// payment gateway providers.

interface BuildVietqrImageUrlInput {
  amountVnd: number;
  orderNumber: string;
}

const VIETQR_TEMPLATE = 'compact2';

export function buildVietqrImageUrl({ amountVnd, orderNumber }: BuildVietqrImageUrlInput): string | null {
  const bankBin = process.env.NEXT_PUBLIC_VIETQR_BANK_BIN;
  const accountNo = process.env.NEXT_PUBLIC_VIETQR_ACCOUNT_NO;
  const accountName = process.env.NEXT_PUBLIC_VIETQR_ACCOUNT_NAME ?? '';

  if (!bankBin || !accountNo) return null;

  const amount = Math.round(amountVnd);
  const params = new URLSearchParams({
    amount: String(amount),
    addInfo: orderNumber,
    accountName,
  });

  return `https://img.vietqr.io/image/${bankBin}-${accountNo}-${VIETQR_TEMPLATE}.png?${params.toString()}`;
}
