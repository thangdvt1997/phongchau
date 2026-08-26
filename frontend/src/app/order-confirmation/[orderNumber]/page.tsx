import Link from 'next/link';
import { notFound } from 'next/navigation';
import { serverFetch } from '@/lib/server-api';
import { formatMoney } from '@/lib/format';

interface OrderTrack {
  orderNumber: string;
  status: string;
  grandTotal: number;
  currency: string;
  items: { productNameSnapshot: string; quantity: number; lineTotal: number }[];
  statusHistory: { status: string; createdAt: string }[];
}

export default async function OrderConfirmationPage({ params }: { params: { orderNumber: string } }) {
  const order = await serverFetch<OrderTrack>(`/orders/track/${params.orderNumber}`, {
    cache: 'no-store',
  });
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-center">
      <h1 className="text-3xl font-bold text-brand-700">Thank you for your order!</h1>
      <p className="mt-2 text-gray-600">
        Order <span className="font-semibold">{order.orderNumber}</span> has been placed.
      </p>

      <div className="mt-8 rounded-lg border border-gray-200 p-6 text-left">
        <p className="font-semibold text-gray-800">Status: {order.status}</p>
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
          <span>Total</span>
          <span>{formatMoney(order.grandTotal, order.currency)}</span>
        </div>
      </div>

      <div className="mt-8 flex justify-center gap-4">
        <Link href="/products" className="rounded-md bg-brand-600 px-6 py-3 font-semibold text-white">
          Continue Shopping
        </Link>
        <Link
          href={`/track?orderNumber=${order.orderNumber}`}
          className="rounded-md border border-brand-600 px-6 py-3 font-semibold text-brand-700"
        >
          Track Order
        </Link>
      </div>
    </div>
  );
}
