'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { apiClient } from '@/lib/api-client';
import { formatMoney } from '@/lib/format';
import { trackBeginCheckout } from '@/lib/analytics';

export default function CheckoutPage() {
  const { user } = useAuth();
  const { cart } = useCart();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fire `begin_checkout` exactly once per checkout-page visit, the moment a non-empty
  // cart is available (CartContext fetches it asynchronously, so it may be null on the
  // very first render). The ref survives re-renders/re-fetches, unlike a plain state flag
  // recomputed from `cart`, so a cart refresh mid-checkout never double-fires this.
  const beginCheckoutTrackedRef = useRef(false);
  useEffect(() => {
    if (beginCheckoutTrackedRef.current) return;
    if (!cart || cart.items.length === 0) return;
    beginCheckoutTrackedRef.current = true;
    trackBeginCheckout({ subtotal: cart.subtotal, currency: cart.currency, itemCount: cart.itemCount });
  }, [cart]);
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
            <label htmlFor="checkout-guest-email" className="text-sm font-semibold text-gray-700">
              Email
            </label>
            <input
              id="checkout-guest-email"
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
          <div>
            <label htmlFor="checkout-fullname" className="text-sm font-medium text-gray-700">
              Full name
            </label>
            <input
              id="checkout-fullname"
              required
              placeholder="Full name"
              value={form.fullName}
              onChange={(e) => update('fullName', e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="checkout-phone" className="text-sm font-medium text-gray-700">
              Phone
            </label>
            <input
              id="checkout-phone"
              required
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="checkout-address" className="text-sm font-medium text-gray-700">
              Address
            </label>
            <input
              id="checkout-address"
              required
              placeholder="Address"
              value={form.line1}
              onChange={(e) => update('line1', e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="checkout-city" className="text-sm font-medium text-gray-700">
                City
              </label>
              <input
                id="checkout-city"
                required
                placeholder="City"
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
                className="mt-1 rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label htmlFor="checkout-postal-code" className="text-sm font-medium text-gray-700">
                Postal code
              </label>
              <input
                id="checkout-postal-code"
                placeholder="Postal code"
                value={form.postalCode}
                onChange={(e) => update('postalCode', e.target.value)}
                className="mt-1 rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label htmlFor="checkout-country" className="text-sm font-medium text-gray-700">
              Country
            </label>
            <input
              id="checkout-country"
              required
              placeholder="Country"
              value={form.country}
              onChange={(e) => update('country', e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
        </fieldset>

        <fieldset className="rounded-lg border border-gray-200 p-4">
          <legend className="px-2 text-sm font-semibold text-gray-700">Payment</legend>
          <label htmlFor="checkout-payment-provider" className="sr-only">
            Payment method
          </label>
          <select
            id="checkout-payment-provider"
            value={form.paymentProvider}
            onChange={(e) => update('paymentProvider', e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="COD">Cash on Delivery</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
          </select>
        </fieldset>

        <div>
          <label htmlFor="checkout-coupon" className="text-sm font-semibold text-gray-700">
            Coupon code
          </label>
          <input
            id="checkout-coupon"
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
