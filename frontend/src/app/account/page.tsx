'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api-client';
import { formatMoney } from '@/lib/format';

interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  grandTotal: number;
  currency: string;
  createdAt: string;
}

interface RfqSummary {
  id: string;
  rfqNumber: string;
  status: string;
  createdAt: string;
}

interface OemSummary {
  id: string;
  requestNumber: string;
  status: string;
  createdAt: string;
}

export default function AccountPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [rfqs, setRfqs] = useState<RfqSummary[]>([]);
  const [oemRequests, setOemRequests] = useState<OemSummary[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    apiClient.get('/orders').then(({ data }) => setOrders(data.items));
    apiClient.get('/rfq').then(({ data }) => setRfqs(data.items ?? data));
    apiClient.get('/oem').then(({ data }) => setOemRequests(data.items ?? data));
  }, [user]);

  if (!user) return null;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Account</h1>
          <p className="text-gray-600">{user.fullName} — {user.email}</p>
          {user.role === 'B2B_CUSTOMER' && (
            <p className="mt-1 text-sm text-brand-700">B2B / Wholesale Account</p>
          )}
        </div>
        <button onClick={() => logout()} className="text-sm text-gray-500 hover:underline">
          Sign out
        </button>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900">Order History</h2>
        {orders.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No orders yet.</p>
        ) : (
          <div className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-200">
            {orders.map((o) => (
              <Link
                key={o.id}
                href={`/order-confirmation/${o.orderNumber}`}
                className="flex items-center justify-between p-4 text-sm hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium text-gray-800">{o.orderNumber}</p>
                  <p className="text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatMoney(o.grandTotal, o.currency)}</p>
                  <p className="text-gray-500">{o.status}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">My RFQs</h2>
          <Link href="/rfq" className="text-sm font-medium text-brand-700 hover:underline">
            New RFQ
          </Link>
        </div>
        {rfqs.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No RFQs yet.</p>
        ) : (
          <div className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-200">
            {rfqs.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-4 text-sm">
                <p className="font-medium text-gray-800">{r.rfqNumber}</p>
                <p className="text-gray-500">{r.status}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">My OEM/ODM Requests</h2>
          <Link href="/oem" className="text-sm font-medium text-brand-700 hover:underline">
            New OEM/ODM Request
          </Link>
        </div>
        {oemRequests.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No OEM/ODM requests yet.</p>
        ) : (
          <div className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-200">
            {oemRequests.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-4 text-sm">
                <p className="font-medium text-gray-800">{r.requestNumber}</p>
                <p className="text-gray-500">{r.status}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
