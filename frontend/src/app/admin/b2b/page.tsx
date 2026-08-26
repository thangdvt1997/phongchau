'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

const COMPANY_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'];

interface CompanyRow {
  id: string;
  name: string;
  taxId: string;
  country: string;
  businessType: string;
  contactPerson: string;
  status: string;
  createdAt: string;
}

export default function AdminB2bListPage() {
  const [companies, setCompanies] = useState<CompanyRow[] | null>(null);
  const [status, setStatus] = useState('PENDING');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;
  const [error, setError] = useState<string | null>(null);
  const [rejectOpenFor, setRejectOpenFor] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  function load() {
    setCompanies(null);
    apiClient
      .get('/admin/b2b/companies', { params: { status: status || undefined, page, pageSize } })
      .then(({ data }) => {
        setCompanies(data.items);
        setTotal(data.total);
      })
      .catch((err) => {
        setError(err?.response?.data?.message ?? 'Failed to load companies.');
        setCompanies([]);
      });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page]);

  async function approve(id: string) {
    setActionSubmitting(id);
    setActionError(null);
    try {
      await apiClient.post(`/admin/b2b/companies/${id}/approve`);
      load();
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? 'Failed to approve company.');
    } finally {
      setActionSubmitting(null);
    }
  }

  async function reject(id: string) {
    if (!rejectReason.trim()) return;
    setActionSubmitting(id);
    setActionError(null);
    try {
      await apiClient.post(`/admin/b2b/companies/${id}/reject`, { reason: rejectReason });
      setRejectOpenFor(null);
      setRejectReason('');
      load();
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? 'Failed to reject company.');
    } finally {
      setActionSubmitting(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">B2B Companies</h1>

      <div className="mt-4 flex items-center gap-3">
        <label htmlFor="b2b-status-filter" className="text-sm font-medium text-gray-700">Status</label>
        <select
          id="b2b-status-filter"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">All</option>
          {COMPANY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {actionError && <p className="mt-4 text-sm text-red-600">{actionError}</p>}

      {companies === null ? (
        <p className="mt-6 text-sm text-gray-500">Loading companies...</p>
      ) : companies.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">No companies found.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-md border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Company</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Tax ID</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Country</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Business Type</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Status</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Primary Contact</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {companies.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link href={`/admin/b2b/${c.id}`} className="font-medium text-brand-700 hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-700">{c.taxId}</td>
                  <td className="px-4 py-2 text-gray-700">{c.country}</td>
                  <td className="px-4 py-2 text-gray-700">{c.businessType}</td>
                  <td className="px-4 py-2 text-gray-700">{c.status}</td>
                  <td className="px-4 py-2 text-gray-700">{c.contactPerson}</td>
                  <td className="px-4 py-2">
                    {c.status === 'PENDING' && (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => approve(c.id)}
                            disabled={actionSubmitting === c.id}
                            className="rounded-md bg-brand-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setRejectOpenFor(rejectOpenFor === c.id ? null : c.id)}
                            className="rounded-md border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700"
                          >
                            Reject
                          </button>
                        </div>
                        {rejectOpenFor === c.id && (
                          <div className="flex items-center gap-2">
                            <label htmlFor={`reject-reason-${c.id}`} className="sr-only">
                              Reason for rejection
                            </label>
                            <textarea
                              id={`reject-reason-${c.id}`}
                              placeholder="Reason for rejection"
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              className="w-56 rounded-md border border-gray-300 px-2 py-1 text-xs"
                              rows={2}
                            />
                            <button
                              onClick={() => reject(c.id)}
                              disabled={actionSubmitting === c.id}
                              className="rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                            >
                              Confirm
                            </button>
                          </div>
                        )}
                      </div>
                    )}
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
