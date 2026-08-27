import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { serverFetch } from '@/lib/server-api';
import { formatMoney } from '@/lib/format';
import { buildVietqrImageUrl } from '@/lib/vietqr';
import { PurchaseTracker } from '@/components/PurchaseTracker';

interface OrderTrack {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentProvider: string | null;
  grandTotal: number;
  currency: string;
  items: { productNameSnapshot: string; quantity: number; lineTotal: number }[];
  statusHistory: { status: string; createdAt: string }[];
}

export default async function OrderConfirmationPage({
  params,
}: {
  params: { orderNumber: string; locale: string };
}) {
  const { orderNumber, locale } = params;
  setRequestLocale(locale);
  const t = await getTranslations('orderConfirmation');
  const order = await serverFetch<OrderTrack>(`/orders/track/${orderNumber}`, {
    cache: 'no-store',
  });
  if (!order) notFound();

  const needsVietqr = order.paymentProvider === 'VIETQR' && order.paymentStatus !== 'PAID';
  const vietqrImageUrl = needsVietqr
    ? buildVietqrImageUrl({ amountVnd: order.grandTotal, orderNumber: order.orderNumber })
    : null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-center">
      <PurchaseTracker orderNumber={order.orderNumber} grandTotal={order.grandTotal} currency={order.currency} />
      <h1 className="text-3xl font-bold text-brand-700">{t('thankYou')}</h1>
      <p className="mt-2 text-gray-600">{t('orderPlaced', { orderNumber: order.orderNumber })}</p>

      {vietqrImageUrl && (
        <div className="mt-8 rounded-lg border border-brand-200 bg-brand-50 p-6 text-left">
          <p className="text-center text-sm font-medium text-gray-700">{t('vietqrInstructions')}</p>
          <div className="mt-4 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={vietqrImageUrl}
              alt={`VietQR payment code for order ${order.orderNumber}`}
              width={300}
              height={300}
              className="rounded-md border border-gray-200 bg-white"
            />
          </div>
          <dl className="mx-auto mt-4 max-w-xs space-y-1 text-sm text-gray-700">
            <div className="flex justify-between">
              <dt className="text-gray-500">{t('bankLabel')}</dt>
              <dd className="font-medium">TPBank</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">{t('accountNumberLabel')}</dt>
              <dd className="font-medium">{process.env.NEXT_PUBLIC_VIETQR_ACCOUNT_NO}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">{t('accountNameLabel')}</dt>
              <dd className="font-medium">{process.env.NEXT_PUBLIC_VIETQR_ACCOUNT_NAME}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">{t('amountLabel')}</dt>
              <dd className="font-medium">{formatMoney(order.grandTotal, order.currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">{t('transferNoteLabel')}</dt>
              <dd className="font-medium">{order.orderNumber}</dd>
            </div>
          </dl>
        </div>
      )}

      <div className="mt-8 rounded-lg border border-gray-200 p-6 text-left">
        <p className="font-semibold text-gray-800">
          {t('statusLabel')}: {order.status}
        </p>
        <ul className="mt-4 divide-y divide-gray-100">
          {order.items.map((item, idx) => (
            <li key={idx} className="flex justify-between py-2 text-sm">
              <span>
                {item.productNameSnapshot} × {item.quantity}
              </span>
              <span>{formatMoney(item.lineTotal, order.currency)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t border-gray-200 pt-4 font-semibold">
          <span>{t('totalLabel')}</span>
          <span>{formatMoney(order.grandTotal, order.currency)}</span>
        </div>
      </div>

      <div className="mt-8 flex justify-center gap-4">
        <Link href="/products" className="rounded-md bg-brand-600 px-6 py-3 font-semibold text-white">
          {t('continueShopping')}
        </Link>
        <Link
          href={`/track?orderNumber=${order.orderNumber}`}
          className="rounded-md border border-brand-600 px-6 py-3 font-semibold text-brand-700"
        >
          {t('trackOrder')}
        </Link>
      </div>
    </div>
  );
}
