'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProductVariant } from '@/lib/types';
import { formatMoney } from '@/lib/format';
import { useCart } from '@/context/CartContext';

export function AddToCartPanel({ variants, productSlug }: { variants: ProductVariant[]; productSlug: string }) {
  const [selectedId, setSelectedId] = useState(variants.find((v) => v.isDefault)?.id ?? variants[0]?.id);
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<'idle' | 'adding' | 'added' | 'error'>('idle');
  const { addItem } = useCart();
  const router = useRouter();

  const selected = variants.find((v) => v.id === selectedId);
  if (!selected) return null;

  const inStock = (selected.availableStock ?? 0) > 0;

  async function handleAddToCart() {
    setStatus('adding');
    try {
      await addItem(selected!.id, quantity);
      setStatus('added');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 p-6">
      <p className="text-2xl font-bold text-brand-700">{formatMoney(selected.price)}</p>
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
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
          className="w-20 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          onClick={handleAddToCart}
          disabled={!inStock || status === 'adding'}
          className="flex-1 rounded-md bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {status === 'adding' ? 'Adding...' : status === 'added' ? 'Added to cart ✓' : 'Add to Cart'}
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
