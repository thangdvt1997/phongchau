'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { apiClient } from '@/lib/api-client';
import { formatMoney } from '@/lib/format';

export default function CheckoutPage() {
  const { user } = useAuth();
  const { cart } = useCart();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    guestEmail: '',
    fullName: '',
    phone: '',
    line1: '',
    city: '',
    country: 'Vietnam',
    postalCode: '',
    paymentProvider: 'COD',
    couponCode: '',
  });

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await apiClient.post('/checkout', {
        guestEmail: user ? undefined : form.guestEmail,
        shippingAddress: {
          fullName: form.fullName,
          phone: form.phone,
          line1: form.line1,
          city: form.city,
          country: form.country,
          postalCode: form.postalCode || undefined,
        },
        billingSameAsShipping: true,
        paymentProvider: form.paymentProvider,
        couponCode: form.couponCode || undefined,
      });
      router.push(`/order-confirmation/${data.order.orderNumber}`);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Checkout failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!cart || cart.items.length === 0) {
    return <div className="mx-auto max-w-3xl px-6 py-16 text-center text-gray-500">Your cart is empty.</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        {!user && (
          <div>
            <label className="text-sm font-semibold text-gray-700">Email</label>
            <input
              type="email"
              required
              value={form.guestEmail}
              onChange={(e) => update('guestEmail', e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
        )}

        <fieldset className="space-y-4 rounded-lg border border-gray-200 p-4">
          <legend className="px-2 text-sm font-semibold text-gray-700">Shipping Address</legend>
          <input
            required
            placeholder="Full name"
            value={form.fullName}
            onChange={(e) => update('fullName', e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
          <input
            required
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
          <input
            required
            placeholder="Address"
            value={form.line1}
            onChange={(e) => update('line1', e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
          <div className="grid grid-cols-2 gap-4">
            <input
              required
              placeholder="City"
              value={form.city}
              onChange={(e) => update('city', e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2"
            />
            <input
              placeholder="Postal code"
              value={form.postalCode}
              onChange={(e) => update('postalCode', e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <input
            required
            placeholder="Country"
            value={form.country}
            onChange={(e) => update('country', e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </fieldset>

        <fieldset className="rounded-lg border border-gray-200 p-4">
          <legend className="px-2 text-sm font-semibold text-gray-700">Payment</legend>
          <select
            value={form.paymentProvider}
            onChange={(e) => update('paymentProvider', e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="COD">Cash on Delivery</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
          </select>
        </fieldset>

        <div>
          <label className="text-sm font-semibold text-gray-700">Coupon code</label>
          <input
            value={form.couponCode}
            onChange={(e) => update('couponCode', e.target.value)}
            placeholder="e.g. WELCOME10"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div className="flex justify-between border-t border-gray-200 pt-4 text-lg font-semibold">
          <span>Subtotal</span>
          <span>{formatMoney(cart.subtotal, cart.currency)}</span>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {submitting ? 'Placing order...' : 'Place Order'}
        </button>
      </form>
    </div>
  );
}
