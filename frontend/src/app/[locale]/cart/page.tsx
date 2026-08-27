'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useCart } from '@/context/CartContext';
import { useCurrency } from '@/context/CurrencyContext';
import { formatMoney, convertDisplay } from '@/lib/format';

export default function CartPage() {
  const { cart, loading, updateItem, removeItem } = useCart();
  const { selected, getRate } = useCurrency();
  const t = useTranslations('cart');

  if (loading) {
    return <div className="mx-auto max-w-4xl px-6 py-16 text-center text-gray-500">{t('loading')}</div>;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h1 className="text-2xl font-bold text-gray-900">{t('emptyTitle')}</h1>
        <Link
          href="/products"
          className="mt-5 inline-block rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white transition hover:bg-brand-700"
        >
          {t('continueShopping')}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 md:py-16">
      <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
      <div className="mt-6 divide-y divide-gray-100 rounded-xl2 border border-gray-100 bg-white shadow-card">
        {cart.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-4 p-5">
            <div>
              <p className="font-medium text-gray-900">{item.productName}</p>
              <p className="text-sm text-gray-500">
                {[item.weightLabel, item.packagingLabel].filter(Boolean).join(' / ')} —{' '}
                {t('skuLine', { sku: item.sku })}
              </p>
              {item.priceSource !== 'BASE_PRICE' && (
                <p className="mt-1 text-xs font-medium text-brand-600">
                  {item.priceSource === 'CUSTOMER_PRICE' ? t('yourContractPrice') : t('wholesaleTierPrice')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor={`cart-qty-${item.id}`} className="sr-only">
                {t('quantitySr', { name: item.productName })}
              </label>
              <input
                id={`cart-qty-${item.id}`}
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => updateItem(item.id, Math.max(1, Number(e.target.value)))}
                className="w-16 rounded-md border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <p className="w-28 text-right font-semibold text-gray-900">
                {formatMoney(item.lineTotal, item.currency)}
              </p>
              <button
                onClick={() => removeItem(item.id)}
                className="text-sm font-medium text-red-500 hover:text-red-600 hover:underline"
              >
                {t('remove')}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <div className="w-full max-w-xs space-y-2 rounded-xl2 border border-gray-100 bg-white p-6 shadow-card">
          <div className="flex justify-between font-semibold text-gray-900">
            <span>{t('subtotal')}</span>
            <span>{formatMoney(cart.subtotal, cart.currency)}</span>
          </div>
          {selected !== 'VND' && getRate(selected) != null && (
            <p className="text-right text-xs text-gray-400">
              {t('estimateNote', {
                amount: formatMoney(convertDisplay(cart.subtotal, getRate(selected)!), selected),
              })}
            </p>
          )}
          <p className="text-xs text-gray-400">{t('shippingNote')}</p>
          <Link
            href="/checkout"
            className="block rounded-lg bg-brand-600 px-4 py-3 text-center font-semibold text-white transition hover:bg-brand-700"
          >
            {t('proceedToCheckout')}
          </Link>
        </div>
      </div>
    </div>
  );
}
