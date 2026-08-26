'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

const OEM_STATUSES = [
  'REQUEST',
  'REVIEW',
  'SAMPLE',
  'PRICING',
  'APPROVAL',
  'PRODUCTION',
  'QC',
  'DELIVERY',
  'REJECTED',
  'CANCELLED',
];

interface OemRow {
  id: string;
  requestNumber: string;
  status: string;
  productType: string;
  destinationCountry: string | null;
  assignedSalesId: string | null;
  createdAt: string;
  user: { id: string; fullName: string; email: string; phone: string | null } | null;
  company: { id: string; name: string; country: string; businessType: string } | null;
}

export default function AdminOemListPage() {
  const [requests, setRequests] = useState<OemRow[] | null>(null);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRequests(null);
    apiClient
      .get('/admin/oem', { params: { status: status || undefined, page, pageSize } })
      .then(({ data }) => {
        if (cancelled) return;
        setRequests(data.items);
        setTotal(data.total);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.response?.data?.message ?? 'Failed to load OEM/ODM requests.');
        setRequests([]);
      });
    return () => {
      cancelled = true;
    };
  }, [status, page]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">OEM/ODM Requests</h1>

      <div className="mt-4 flex items-center gap-3">
        <label htmlFor="oem-status-filter" className="text-sm font-medium text-gray-700">Status</label>
        <select
          id="oem-status-filter"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">All</option>
          {OEM_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {requests === null ? (
        <p className="mt-6 text-sm text-gray-500">Loading OEM/ODM requests...</p>
      ) : requests.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">No OEM/ODM requests found.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-md border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Request #</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Customer / Company</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Product Type</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Status</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Destination</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Assigned Sales</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link href={`/admin/oem/${r.id}`} className="font-medium text-brand-700 hover:underline">
                      {r.requestNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-700">
                    {r.company ? r.company.name : r.user ? `${r.user.fullName} (${r.user.email})` : '—'}
                  </td>
                  <td className="px-4 py-2 text-gray-700">{r.productType}</td>
                  <td className="px-4 py-2 text-gray-700">{r.status}</td>
                  <td className="px-4 py-2 text-gray-700">{r.destinationCountry ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-500">{r.assignedSalesId ?? 'Unassigned'}</td>
                  <td className="px-4 py-2 text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</td>
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
