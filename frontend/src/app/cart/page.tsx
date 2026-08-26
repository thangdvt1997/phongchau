'use client';

import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { formatMoney } from '@/lib/format';

export default function CartPage() {
  const { cart, loading, updateItem, removeItem } = useCart();

  if (loading) {
    return <div className="mx-auto max-w-4xl px-6 py-16 text-center text-gray-500">Loading cart...</div>;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Your cart is empty</h1>
        <Link href="/products" className="mt-4 inline-block text-brand-700 hover:underline">
          Continue shopping &rarr;
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900">Shopping Cart</h1>
      <div className="mt-6 divide-y divide-gray-200 border-y border-gray-200">
        {cart.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="font-medium text-gray-900">{item.productName}</p>
              <p className="text-sm text-gray-500">
                {[item.weightLabel, item.packagingLabel].filter(Boolean).join(' / ')} — SKU {item.sku}
              </p>
              {item.priceSource !== 'BASE_PRICE' && (
                <p className="text-xs text-brand-600">
                  {item.priceSource === 'CUSTOMER_PRICE' ? 'Your contract price' : 'Wholesale tier price'}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor={`cart-qty-${item.id}`} className="sr-only">
                Quantity for {item.productName}
              </label>
              <input
                id={`cart-qty-${item.id}`}
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => updateItem(item.id, Math.max(1, Number(e.target.value)))}
                className="w-16 rounded-md border border-gray-300 px-2 py-1 text-sm"
              />
              <p className="w-28 text-right font-medium">{formatMoney(item.lineTotal, item.currency)}</p>
              <button
                onClick={() => removeItem(item.id)}
                className="text-sm text-red-500 hover:underline"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <div className="w-full max-w-xs space-y-2">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>{formatMoney(cart.subtotal, cart.currency)}</span>
          </div>
          <p className="text-xs text-gray-400">Shipping and taxes calculated at checkout.</p>
          <Link
            href="/checkout"
            className="block rounded-md bg-brand-600 px-4 py-3 text-center font-semibold text-white hover:bg-brand-700"
          >
            Proceed to Checkout
          </Link>
        </div>
      </div>
    </div>
  );
}
