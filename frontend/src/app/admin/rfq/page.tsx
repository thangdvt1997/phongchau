'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

const RFQ_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'SALES_REVIEW',
  'QUOTATION_SENT',
  'NEGOTIATION',
  'ACCEPTED',
  'PURCHASE_ORDER',
  'PAYMENT',
  'PRODUCTION',
  'SHIPPING',
  'COMPLETED',
  'REJECTED',
  'CANCELLED',
];

function statusBadgeClass(status: string): string {
  if (/CANCEL|REJECT/.test(status)) return 'bg-rose-50 text-rose-700';
  if (/DELIVER|COMPLETE|APPROVE|PAID/.test(status)) return 'bg-emerald-50 text-emerald-700';
  if (/PENDING|PROCESSING|WAITING/.test(status)) return 'bg-amber-50 text-amber-700';
  return 'bg-gray-100 text-gray-700';
}

interface RfqRow {
  id: string;
  rfqNumber: string;
  status: string;
  destinationCountry: string | null;
  assignedSalesId: string | null;
  createdAt: string;
  user: { id: string; fullName: string; email: string; phone: string | null } | null;
  company: { id: string; name: string; country: string; businessType: string } | null;
}

export default function AdminRfqListPage() {
  const [rfqs, setRfqs] = useState<RfqRow[] | null>(null);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRfqs(null);
    apiClient
      .get('/admin/rfq', { params: { status: status || undefined, page, pageSize } })
      .then(({ data }) => {
        if (cancelled) return;
        setRfqs(data.items);
        setTotal(data.total);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.response?.data?.message ?? 'Failed to load RFQs.');
        setRfqs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [status, page]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">RFQs</h1>
      </div>

      <div className="flex items-center gap-3">
        <label htmlFor="rfq-status-filter" className="text-sm font-medium text-gray-700">Status</label>
        <select
          id="rfq-status-filter"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value="">All</option>
          {RFQ_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mt-4 rounded-xl2 border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      )}

      {rfqs === null ? (
        <p className="mt-6 text-sm text-gray-500">Loading RFQs...</p>
      ) : rfqs.length === 0 ? (
        <div className="mt-4 rounded-xl2 border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
          No RFQs found.
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl2 border border-gray-200 bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">RFQ #</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Customer / Company</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Destination</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Assigned Sales</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rfqs.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <Link href={`/admin/rfq/${r.id}`} className="font-medium text-teal-700 hover:text-teal-800 hover:underline">
                        {r.rfqNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">
                      {r.company ? r.company.name : r.user ? `${r.user.fullName} (${r.user.email})` : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">{r.destinationCountry ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500">{r.assignedSalesId ?? 'Unassigned'}</td>
                    <td className="px-4 py-2.5 text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</td>
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
