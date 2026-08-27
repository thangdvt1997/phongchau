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

function statusBadgeClass(status: string): string {
  if (/CANCEL|REJECT/.test(status)) return 'bg-rose-50 text-rose-700';
  if (/DELIVER|COMPLETE|APPROVE|PAID/.test(status)) return 'bg-emerald-50 text-emerald-700';
  if (/PENDING|PROCESSING|WAITING/.test(status)) return 'bg-amber-50 text-amber-700';
  return 'bg-gray-100 text-gray-700';
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
      </div>

      <div className="flex items-center gap-3">
        <label htmlFor="orders-status-filter" className="text-sm font-medium text-gray-700">Status</label>
        <select
          id="orders-status-filter"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value="">All</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mt-4 rounded-xl2 border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      )}

      {orders === null ? (
        <p className="mt-6 text-sm text-gray-500">Loading orders...</p>
      ) : orders.length === 0 ? (
        <div className="mt-4 rounded-xl2 border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
          No orders found.
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl2 border border-gray-200 bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Order #</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Customer</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Payment</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Total</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((o) => (
                  <tr key={o.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <Link href={`/admin/orders/${o.id}`} className="font-medium text-teal-700 hover:text-teal-800 hover:underline">
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">
                      {o.user ? `${o.user.fullName} (${o.user.email})` : o.guestEmail ?? 'Guest'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(o.status)}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(o.paymentStatus)}`}>
                        {o.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-800">
                      {formatMoney(o.grandTotal, o.currency)}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {new Date(o.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page * pageSize >= total}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
