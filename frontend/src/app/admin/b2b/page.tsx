'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

const COMPANY_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'];

function statusBadgeClass(status: string): string {
  if (/CANCEL|REJECT/.test(status)) return 'bg-rose-50 text-rose-700';
  if (/DELIVER|COMPLETE|APPROVE|PAID/.test(status)) return 'bg-emerald-50 text-emerald-700';
  if (/PENDING|PROCESSING|WAITING/.test(status)) return 'bg-amber-50 text-amber-700';
  return 'bg-gray-100 text-gray-700';
}

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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">B2B Companies</h1>
      </div>

      <div className="flex items-center gap-3">
        <label htmlFor="b2b-status-filter" className="text-sm font-medium text-gray-700">Status</label>
        <select
          id="b2b-status-filter"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value="">All</option>
          {COMPANY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mt-4 rounded-xl2 border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      )}
      {actionError && (
        <div className="mt-4 rounded-xl2 border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{actionError}</div>
      )}

      {companies === null ? (
        <p className="mt-6 text-sm text-gray-500">Loading companies...</p>
      ) : companies.length === 0 ? (
        <div className="mt-4 rounded-xl2 border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
          No companies found.
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl2 border border-gray-200 bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Company</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Tax ID</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Country</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Business Type</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Primary Contact</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {companies.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <Link href={`/admin/b2b/${c.id}`} className="font-medium text-teal-700 hover:text-teal-800 hover:underline">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">{c.taxId}</td>
                    <td className="px-4 py-2.5 text-gray-700">{c.country}</td>
                    <td className="px-4 py-2.5 text-gray-700">{c.businessType}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(c.status)}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">{c.contactPerson}</td>
                    <td className="px-4 py-2.5">
                      {c.status === 'PENDING' && (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <button
                              onClick={() => approve(c.id)}
                              disabled={actionSubmitting === c.id}
                              className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => setRejectOpenFor(rejectOpenFor === c.id ? null : c.id)}
                              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
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
                                className="w-56 rounded-lg border border-gray-300 px-2 py-1 text-xs focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                rows={2}
                              />
                              <button
                                onClick={() => reject(c.id)}
                                disabled={actionSubmitting === c.id}
                                className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-rose-700 disabled:opacity-50"
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
