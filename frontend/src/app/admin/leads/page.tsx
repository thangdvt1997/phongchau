'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'QUOTATION', 'NEGOTIATION', 'WON', 'LOST'];

interface LeadRow {
  id: string;
  source: string;
  status: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  createdAt: string;
  assignee: { id: string; fullName: string } | null;
  rfq: { rfqNumber: string } | null;
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<LeadRow[] | null>(null);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  function load() {
    apiClient
      .get('/admin/leads', { params: { status: status || undefined, page, pageSize } })
      .then(({ data }) => {
        setLeads(data.items);
        setTotal(data.total);
      })
      .catch((err) => {
        setError(err?.response?.data?.message ?? 'Failed to load leads.');
        setLeads([]);
      });
  }

  useEffect(() => {
    setLeads(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page]);

  async function updateStatus(id: string, newStatus: string) {
    setUpdatingId(id);
    setError(null);
    try {
      await apiClient.patch(`/admin/leads/${id}`, { status: newStatus });
      setLeads((ls) => (ls ? ls.map((l) => (l.id === id ? { ...l, status: newStatus } : l)) : ls));
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to update lead status.');
      load();
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Leads</h1>

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
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {leads === null ? (
        <p className="mt-6 text-sm text-gray-500">Loading leads...</p>
      ) : leads.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">No leads found.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-md border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Name</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Email / Phone</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Company</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Source</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Status</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Assignee</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {leads.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-800">
                    {l.fullName}
                    {l.rfq && <span className="ml-2 text-xs text-gray-400">({l.rfq.rfqNumber})</span>}
                  </td>
                  <td className="px-4 py-2 text-gray-700">
                    {l.email ?? '—'}
                    {l.phone ? ` / ${l.phone}` : ''}
                  </td>
                  <td className="px-4 py-2 text-gray-700">{l.companyName ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-700">{l.source}</td>
                  <td className="px-4 py-2">
                    <select
                      value={l.status}
                      disabled={updatingId === l.id}
                      onChange={(e) => updateStatus(l.id, e.target.value)}
                      className="rounded-md border border-gray-300 px-2 py-1 text-sm disabled:opacity-50"
                    >
                      {LEAD_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-gray-500">{l.assignee?.fullName ?? 'Unassigned'}</td>
                  <td className="px-4 py-2 text-gray-500">{new Date(l.createdAt).toLocaleDateString()}</td>
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
