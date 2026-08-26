'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'WAITING_ON_CUSTOMER', 'RESOLVED', 'CLOSED'];
const TICKET_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

function formatEnumLabel(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

interface TicketRow {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  user: { id: string; fullName: string; email: string } | null;
  assignee: { id: string; fullName: string } | null;
}

interface StaffOption {
  id: string;
  fullName: string;
}

export default function AdminSupportListPage() {
  const [tickets, setTickets] = useState<TicketRow[] | null>(null);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get('/admin/support/assignable-staff')
      .then(({ data }) => setStaff(data))
      .catch(() => setStaff([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setTickets(null);
    apiClient
      .get('/admin/support', {
        params: {
          status: status || undefined,
          priority: priority || undefined,
          assigneeId: assigneeId || undefined,
          page,
          pageSize,
        },
      })
      .then(({ data }) => {
        if (cancelled) return;
        setTickets(data.items);
        setTotal(data.total);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.response?.data?.message ?? 'Failed to load tickets.');
        setTickets([]);
      });
    return () => {
      cancelled = true;
    };
  }, [status, priority, assigneeId, page]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label htmlFor="ticket-status-filter" className="text-sm font-medium text-gray-700">
          Status
        </label>
        <select
          id="ticket-status-filter"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">All</option>
          {TICKET_STATUSES.map((s) => (
            <option key={s} value={s}>
              {formatEnumLabel(s)}
            </option>
          ))}
        </select>

        <label htmlFor="ticket-priority-filter" className="text-sm font-medium text-gray-700">
          Priority
        </label>
        <select
          id="ticket-priority-filter"
          value={priority}
          onChange={(e) => {
            setPriority(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">All</option>
          {TICKET_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {formatEnumLabel(p)}
            </option>
          ))}
        </select>

        <label htmlFor="ticket-assignee-filter" className="text-sm font-medium text-gray-700">
          Assignee
        </label>
        <select
          id="ticket-assignee-filter"
          value={assigneeId}
          onChange={(e) => {
            setAssigneeId(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">All</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.fullName}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {tickets === null ? (
        <p className="mt-6 text-sm text-gray-500">Loading tickets...</p>
      ) : tickets.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">No tickets found.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-md border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Ticket #</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Subject</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Customer</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Priority</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Status</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Assignee</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {tickets.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link href={`/admin/support/${t.id}`} className="font-medium text-brand-700 hover:underline">
                      {t.ticketNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-700">{t.subject}</td>
                  <td className="px-4 py-2 text-gray-700">
                    {t.user ? `${t.user.fullName} (${t.user.email})` : 'Guest'}
                  </td>
                  <td className="px-4 py-2 text-gray-700">{formatEnumLabel(t.priority)}</td>
                  <td className="px-4 py-2 text-gray-700">{formatEnumLabel(t.status)}</td>
                  <td className="px-4 py-2 text-gray-500">{t.assignee?.fullName ?? 'Unassigned'}</td>
                  <td className="px-4 py-2 text-gray-500">{new Date(t.createdAt).toLocaleDateString()}</td>
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
