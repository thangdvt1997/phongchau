'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

// Mirrors backend/src/modules/support/support.service.ts ALLOWED_TICKET_TRANSITIONS —
// keep in sync. A same-status "transition" is always allowed server-side as an
// idempotent no-op, so it is not listed here.
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  OPEN: ['IN_PROGRESS', 'WAITING_ON_CUSTOMER', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['WAITING_ON_CUSTOMER', 'RESOLVED', 'CLOSED'],
  WAITING_ON_CUSTOMER: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: ['IN_PROGRESS'],
};

const TICKET_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const TICKET_CATEGORIES = ['ORDER', 'PRODUCT', 'PAYMENT', 'SHIPPING', 'RFQ', 'OEM', 'ACCOUNT', 'OTHER'];

function formatEnumLabel(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

interface TicketMessage {
  id: string;
  message: string;
  attachmentUrl: string | null;
  isFromStaff: boolean;
  createdAt: string;
  sender: { id: string; fullName: string; role: string } | null;
}

interface TicketDetail {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
  messages: TicketMessage[];
  user: { id: string; fullName: string; email: string; phone: string | null } | null;
  guestEmail: string | null;
  guestName: string | null;
  assignee: { id: string; fullName: string; email: string } | null;
  order: { id: string; orderNumber: string; status: string } | null;
}

interface StaffOption {
  id: string;
  fullName: string;
  email: string;
}

export default function AdminSupportDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffOption[]>([]);

  const [statusValue, setStatusValue] = useState('');
  const [priorityValue, setPriorityValue] = useState('');
  const [categoryValue, setCategoryValue] = useState('');
  const [assigneeValue, setAssigneeValue] = useState('');
  const [controlsSubmitting, setControlsSubmitting] = useState(false);
  const [controlsError, setControlsError] = useState<string | null>(null);

  const [replyMessage, setReplyMessage] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  function load() {
    apiClient
      .get(`/admin/support/${params.id}`)
      .then(({ data }) => {
        setTicket(data);
        setStatusValue(data.status);
        setPriorityValue(data.priority);
        setCategoryValue(data.category);
        setAssigneeValue(data.assignee?.id ?? '');
      })
      .catch((err) => {
        setLoadError(err?.response?.data?.message ?? 'Failed to load ticket.');
      });
  }

  useEffect(() => {
    load();
    apiClient
      .get('/admin/support/assignable-staff')
      .then(({ data }) => setStaff(data))
      .catch(() => setStaff([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function submitControls(e: React.FormEvent) {
    e.preventDefault();
    if (!ticket) return;
    setControlsSubmitting(true);
    setControlsError(null);
    try {
      await apiClient.patch(`/admin/support/${params.id}`, {
        status: statusValue !== ticket.status ? statusValue : undefined,
        priority: priorityValue !== ticket.priority ? priorityValue : undefined,
        category: categoryValue !== ticket.category ? categoryValue : undefined,
        assigneeId: assigneeValue || null,
      });
      load();
    } catch (err: any) {
      setControlsError(err?.response?.data?.message ?? 'Failed to update ticket.');
    } finally {
      setControlsSubmitting(false);
    }
  }

  async function submitReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyMessage.trim()) return;
    setReplySubmitting(true);
    setReplyError(null);
    try {
      await apiClient.post(`/admin/support/${params.id}/messages`, { message: replyMessage });
      setReplyMessage('');
      load();
    } catch (err: any) {
      setReplyError(err?.response?.data?.message ?? 'Failed to send message.');
    } finally {
      setReplySubmitting(false);
    }
  }

  if (loadError) {
    return <p className="text-sm text-red-600">{loadError}</p>;
  }
  if (!ticket) {
    return <p className="text-sm text-gray-500">Loading ticket...</p>;
  }

  const nextStatuses = ALLOWED_TRANSITIONS[ticket.status] ?? [];

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {ticket.ticketNumber} — {ticket.subject}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Current status: <span className="font-semibold text-brand-700">{formatEnumLabel(ticket.status)}</span>
          </p>
        </div>
        <button onClick={() => router.push('/admin/support')} className="text-sm text-gray-500 hover:underline">
          Back to Tickets
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-md border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-800">Customer</h2>
          <p className="mt-2 text-sm text-gray-700">
            {ticket.user
              ? `${ticket.user.fullName} (${ticket.user.email})`
              : `${ticket.guestName ?? 'Guest'} (${ticket.guestEmail ?? 'no email'})`}
          </p>
          {ticket.user?.phone && <p className="mt-1 text-sm text-gray-500">Phone: {ticket.user.phone}</p>}
          {ticket.order && (
            <p className="mt-1 text-sm text-gray-500">
              Order: {ticket.order.orderNumber} ({ticket.order.status})
            </p>
          )}
        </section>

        <section className="rounded-md border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-800">Details</h2>
          <dl className="mt-2 space-y-1 text-sm text-gray-700">
            <div>Category: {formatEnumLabel(ticket.category)}</div>
            <div>Priority: {formatEnumLabel(ticket.priority)}</div>
            <div>Created: {new Date(ticket.createdAt).toLocaleString()}</div>
            {ticket.resolvedAt && <div>Resolved: {new Date(ticket.resolvedAt).toLocaleString()}</div>}
          </dl>
        </section>
      </div>

      <section className="mt-6 rounded-md border border-gray-200 p-4">
        <h2 className="font-semibold text-gray-800">Ticket Controls</h2>
        <form onSubmit={submitControls} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <label htmlFor="ticket-status-select" className="text-xs font-medium text-gray-600">
              Status
            </label>
            <select
              id="ticket-status-select"
              value={statusValue}
              onChange={(e) => setStatusValue(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value={ticket.status}>{formatEnumLabel(ticket.status)} (current)</option>
              {nextStatuses.map((s) => (
                <option key={s} value={s}>
                  {formatEnumLabel(s)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ticket-priority-select" className="text-xs font-medium text-gray-600">
              Priority
            </label>
            <select
              id="ticket-priority-select"
              value={priorityValue}
              onChange={(e) => setPriorityValue(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {TICKET_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {formatEnumLabel(p)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ticket-category-select" className="text-xs font-medium text-gray-600">
              Category
            </label>
            <select
              id="ticket-category-select"
              value={categoryValue}
              onChange={(e) => setCategoryValue(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {TICKET_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {formatEnumLabel(c)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ticket-assignee-select" className="text-xs font-medium text-gray-600">
              Assignee
            </label>
            <select
              id="ticket-assignee-select"
              value={assigneeValue}
              onChange={(e) => setAssigneeValue(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Unassigned</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 md:col-span-4">
            <button
              type="submit"
              disabled={controlsSubmitting}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {controlsSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
            {nextStatuses.length === 0 && (
              <p className="mt-2 text-xs text-gray-400">This ticket is in a terminal state; no further status transitions are allowed.</p>
            )}
            {controlsError && <p className="mt-2 text-sm text-red-600">{controlsError}</p>}
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-md border border-gray-200 p-4">
        <h2 className="font-semibold text-gray-800">Messages</h2>
        <div className="mt-3 max-h-96 space-y-3 overflow-y-auto">
          {ticket.messages.length === 0 ? (
            <p className="text-sm text-gray-500">No messages yet.</p>
          ) : (
            ticket.messages.map((m) => (
              <div
                key={m.id}
                className={`rounded-md p-3 text-sm ${
                  m.isFromStaff ? 'bg-brand-50 border border-brand-100' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-800">
                    {m.sender?.fullName ?? (m.isFromStaff ? 'Support' : 'Customer')}{' '}
                    <span className="text-gray-400">({m.isFromStaff ? 'Staff' : 'Customer'})</span>
                  </span>
                  <span className="text-xs text-gray-400">{new Date(m.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-gray-700">{m.message}</p>
                {m.attachmentUrl && (
                  <a
                    href={m.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-xs text-brand-700 hover:underline"
                  >
                    Attachment
                  </a>
                )}
              </div>
            ))
          )}
        </div>
        <form onSubmit={submitReply} className="mt-3 flex gap-2">
          <label htmlFor="ticket-reply-message" className="sr-only">
            Reply to customer
          </label>
          <textarea
            id="ticket-reply-message"
            placeholder="Reply to customer..."
            value={replyMessage}
            onChange={(e) => setReplyMessage(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
            rows={2}
          />
          <button
            type="submit"
            disabled={replySubmitting}
            className="self-end rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Send
          </button>
        </form>
        {replyError && <p className="mt-2 text-sm text-red-600">{replyError}</p>}
      </section>
    </div>
  );
}
