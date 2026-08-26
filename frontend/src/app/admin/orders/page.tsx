'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { formatMoney } from '@/lib/format';

const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'AWAITING_PAYMENT',
  'PAID',
  'PROCESSING',
  'PRODUCTION',
  'QUALITY_CHECKING',
  'PACKED',
  'READY_TO_SHIP',
  'SHIPPED',
  'CUSTOMS_CLEARANCE',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
];

interface OrderRow {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  grandTotal: number;
  currency: string;
  createdAt: string;
  guestEmail: string | null;
  user: { id: string; fullName: string; email: string } | null;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setOrders(null);
    apiClient
      .get('/admin/orders', { params: { status: status || undefined, page, pageSize } })
      .then(({ data }) => {
        if (cancelled) return;
        setOrders(data.items);
        setTotal(data.total);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.response?.data?.message ?? 'Failed to load orders.');
        setOrders([]);
      });
    return () => {
      cancelled = true;
    };
  }, [status, page]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Status</label>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">All</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {orders === null ? (
        <p className="mt-6 text-sm text-gray-500">Loading orders...</p>
      ) : orders.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">No orders found.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-md border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Order #</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Customer</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Status</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Payment</th>
                <th className="px-4 py-2 text-right font-semibold text-gray-600">Total</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link href={`/admin/orders/${o.id}`} className="font-medium text-brand-700 hover:underline">
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-700">
                    {o.user ? `${o.user.fullName} (${o.user.email})` : o.guestEmail ?? 'Guest'}
                  </td>
                  <td className="px-4 py-2 text-gray-700">{o.status}</td>
                  <td className="px-4 py-2 text-gray-700">{o.paymentStatus}</td>
                  <td className="px-4 py-2 text-right text-gray-800">
                    {formatMoney(o.grandTotal, o.currency)}
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {new Date(o.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
        <span>
          Page {page} of {Math.max(1, Math.ceil(total / pageSize))} ({total} total)
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-md border border-gray-300 px-3 py-1 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page * pageSize >= total}
            className="rounded-md border border-gray-300 px-3 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
