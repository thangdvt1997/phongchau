'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ProductListItem } from '@/lib/types';
import { formatMoney, convertDisplay } from '@/lib/format';
import { useCurrency } from '@/context/CurrencyContext';

export function ProductCard({ product }: { product: ProductListItem }) {
  const { selected, getRate } = useCurrency();
  const t = useTranslations('productCard');
  const image = product.image?.url ?? '/placeholder-product.svg';

  // DISPLAY-only conversion — product.currency is always 'VND' today (checkout still
  // settles in VND regardless of what's shown here). Fall back to the raw VND price
  // whenever the selected currency is VND itself or has no configured rate.
  const rate = selected !== 'VND' ? getRate(selected) : null;
  const showConverted = selected !== 'VND' && rate != null;
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl2 border border-gray-100 bg-white shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-soft"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
        <Image
          src={image}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        {product.isOrganic && (
          <span className="absolute left-2 top-2 rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-medium text-white shadow-card">
            {t('organic')}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        {product.category && (
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{product.category}</span>
        )}
        <h3 className="line-clamp-2 font-medium text-gray-900">{product.name}</h3>
        {product.origin && <p className="text-xs text-gray-500">{t('originLabel', { origin: product.origin })}</p>}
        <div className="mt-auto pt-2">
          {showConverted ? (
            <>
              <p className="font-semibold text-brand-700">
                {formatMoney(convertDisplay(product.basePrice, rate!), selected)}
              </p>
              <p className="text-xs text-gray-400">
                {formatMoney(product.basePrice, product.currency)} {t('checkoutPrice')}
              </p>
            </>
          ) : (
            <p className="font-semibold text-brand-700">
              {formatMoney(product.basePrice, product.currency)}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
