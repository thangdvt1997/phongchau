'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProductVariant } from '@/lib/types';
import { formatMoney, convertDisplay } from '@/lib/format';
import { useCart } from '@/context/CartContext';
import { useCurrency } from '@/context/CurrencyContext';
import { trackAddToCart, trackViewItem } from '@/lib/analytics';

export function AddToCartPanel({
  variants,
  productSlug,
  productId,
  productName,
  currency,
}: {
  variants: ProductVariant[];
  productSlug: string;
  productId: string;
  productName: string;
  currency: string;
}) {
  const [selectedId, setSelectedId] = useState(variants.find((v) => v.isDefault)?.id ?? variants[0]?.id);
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<'idle' | 'adding' | 'added' | 'error'>('idle');
  const { addItem } = useCart();
  const { selected: selectedCurrency, getRate } = useCurrency();
  const router = useRouter();

  const selected = variants.find((v) => v.id === selectedId);

  // AddToCartPanel is the only client component rendered on the product detail page
  // (products/[slug]/page.tsx is a server component), so it's the simplest correct place
  // to fire the GA4/Meta/TikTok `view_item` event on mount — one fire per page load,
  // guarded with a ref rather than an empty-deps effect since `selected` may briefly be
  // undefined depending on variants ordering.
  const viewTrackedRef = useRef(false);
  useEffect(() => {
    if (viewTrackedRef.current || !selected) return;
    viewTrackedRef.current = true;
    trackViewItem({ id: productId, name: productName, price: selected.price, currency });
  }, [selected, productId, productName, currency]);

  if (!selected) return null;

  // DISPLAY-only conversion — variant prices are always VND today; the customer is
  // still charged the VND amount shown as the secondary reference line below.
  const rate = selectedCurrency !== 'VND' ? getRate(selectedCurrency) : null;
  const showConverted = selectedCurrency !== 'VND' && rate != null;

  const inStock = (selected.availableStock ?? 0) > 0;

  async function handleAddToCart() {
    setStatus('adding');
    try {
      await addItem(selected!.id, quantity);
      setStatus('added');
      trackAddToCart({
        productId,
        name: productName,
        price: selected!.price,
        currency,
        quantity,
      });
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 p-6">
      {showConverted ? (
        <>
          <p className="text-2xl font-bold text-brand-700">
            {formatMoney(convertDisplay(selected.price, rate!), selectedCurrency)}
          </p>
          <p className="text-sm text-gray-400">{formatMoney(selected.price)} (checkout price)</p>
        </>
      ) : (
        <p className="text-2xl font-bold text-brand-700">{formatMoney(selected.price)}</p>
      )}
      {selected.compareAtPrice && (
        <p className="text-sm text-gray-400 line-through">{formatMoney(selected.compareAtPrice)}</p>
      )}

      <div className="mt-4">
        <p className="text-sm font-semibold text-gray-700">Variant</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {variants.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelectedId(v.id)}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                v.id === selectedId
                  ? 'border-brand-600 bg-brand-50 text-brand-700'
                  : 'border-gray-300 text-gray-600'
              }`}
            >
              {[v.weightLabel, v.packagingLabel, v.gradeLabel].filter(Boolean).join(' / ') || v.sku}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-3 text-sm text-gray-500">
        {inStock ? `${selected.availableStock} in stock` : 'Out of stock'}
      </p>

      <div className="mt-4 flex items-center gap-3">
        <label htmlFor="add-to-cart-quantity" className="sr-only">
          Quantity
        </label>
        <input
          id="add-to-cart-quantity"
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
          className="w-20 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          onClick={handleAddToCart}
          disabled={!inStock || status === 'adding'}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {status === 'adding' ? (
            'Adding...'
          ) : status === 'added' ? (
            <>
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4 shrink-0"
              >
                <path
                  fillRule="evenodd"
                  d="M16.704 5.29a1 1 0 010 1.415l-7.5 7.5a1 1 0 01-1.415 0l-3.5-3.5a1 1 0 111.415-1.415L8.5 12.086l6.79-6.795a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Added to cart
            </>
          ) : (
            'Add to Cart'
          )}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        <Link href="/cart" className="font-medium text-brand-700 hover:underline">
          View cart
        </Link>
        <button
          onClick={() => router.push(`/rfq?productSlug=${productSlug}`)}
          className="font-medium text-brand-700 hover:underline"
        >
          Request Quote
        </button>
        <Link href="/contact" className="font-medium text-brand-700 hover:underline">
          Contact Sales
        </Link>
      </div>
    </div>
  );
}
