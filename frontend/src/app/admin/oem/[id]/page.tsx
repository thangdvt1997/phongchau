'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

// Mirrors backend/src/modules/oem/oem.service.ts ALLOWED_TRANSITIONS — keep in sync.
// A same-status "transition" is always allowed server-side as an idempotent no-op,
// so it is not listed here (the UI simply excludes the current status from the list
// of *other* selectable options, but re-submitting the same status will succeed).
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  REQUEST: ['REVIEW', 'CANCELLED'],
  REVIEW: ['SAMPLE', 'REJECTED', 'CANCELLED'],
  SAMPLE: ['PRICING', 'REJECTED', 'CANCELLED'],
  PRICING: ['APPROVAL', 'REJECTED', 'CANCELLED'],
  APPROVAL: ['PRODUCTION', 'REJECTED', 'CANCELLED'],
  PRODUCTION: ['QC', 'CANCELLED'],
  QC: ['DELIVERY', 'PRODUCTION', 'CANCELLED'],
  DELIVERY: [],
  REJECTED: [],
  CANCELLED: [],
};

interface OemMessage {
  id: string;
  message: string;
  attachmentUrl: string | null;
  createdAt: string;
  sender: { id: string; fullName: string; role: string } | null;
}

interface OemDetail {
  id: string;
  requestNumber: string;
  status: string;
  productType: string;
  ingredients: string | null;
  recipe: string | null;
  targetMarket: string | null;
  packageType: string | null;
  packageSize: string | null;
  brandName: string | null;
  isPrivateLabel: boolean;
  estimatedQuantity: string | null;
  certificationRequirement: string | null;
  targetPrice: string | null;
  destinationCountry: string | null;
  attachmentUrl: string | null;
  assignedSalesId: string | null;
  internalNote: string | null;
  createdAt: string;
  messages: OemMessage[];
  user: { id: string; fullName: string; email: string; phone: string | null; companyId: string | null } | null;
  company: { id: string; name: string; country: string; businessType: string; contactPerson: string } | null;
}

export default function AdminOemDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [oemRequest, setOemRequest] = useState<OemDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [statusValue, setStatusValue] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [replyMessage, setReplyMessage] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const [internalNote, setInternalNote] = useState('');
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  function load() {
    apiClient
      .get(`/admin/oem/${params.id}`)
      .then(({ data }) => {
        setOemRequest(data);
        setStatusValue(data.status);
        setInternalNote(data.internalNote ?? '');
      })
      .catch((err) => {
        setLoadError(err?.response?.data?.message ?? 'Failed to load OEM/ODM request.');
      });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function submitStatus(e: React.FormEvent) {
    e.preventDefault();
    setStatusSubmitting(true);
    setStatusError(null);
    try {
      await apiClient.patch(`/admin/oem/${params.id}/status`, {
        status: statusValue,
        note: statusNote || undefined,
      });
      setStatusNote('');
      load();
    } catch (err: any) {
      setStatusError(err?.response?.data?.message ?? 'Failed to update status.');
    } finally {
      setStatusSubmitting(false);
    }
  }

  async function submitReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyMessage.trim()) return;
    setReplySubmitting(true);
    setReplyError(null);
    try {
      await apiClient.post(`/oem/${params.id}/messages`, { message: replyMessage });
      setReplyMessage('');
      load();
    } catch (err: any) {
      setReplyError(err?.response?.data?.message ?? 'Failed to send message.');
    } finally {
      setReplySubmitting(false);
    }
  }

  async function submitNote(e: React.FormEvent) {
    e.preventDefault();
    setNoteSubmitting(true);
    setNoteError(null);
    try {
      await apiClient.patch(`/admin/oem/${params.id}`, { internalNote });
      load();
    } catch (err: any) {
      setNoteError(err?.response?.data?.message ?? 'Failed to update internal note.');
    } finally {
      setNoteSubmitting(false);
    }
  }

  if (loadError) {
    return <div className="rounded-xl2 border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{loadError}</div>;
  }
  if (!oemRequest) {
    return <p className="text-sm text-gray-500">Loading OEM/ODM request...</p>;
  }

  const nextStatuses = ALLOWED_TRANSITIONS[oemRequest.status] ?? [];

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">OEM/ODM Request {oemRequest.requestNumber}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Current status: <span className="font-semibold text-teal-700">{oemRequest.status}</span>
          </p>
        </div>
        <button onClick={() => router.push('/admin/oem')} className="text-sm font-medium text-gray-500 hover:text-gray-700 hover:underline">
          Back to OEM/ODM Requests
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-xl2 border border-gray-200 bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold text-gray-900">Customer</h2>
          <p className="mt-2 text-sm text-gray-700">
            {oemRequest.company
              ? `${oemRequest.company.name} (${oemRequest.company.country}, ${oemRequest.company.businessType}) — contact: ${oemRequest.company.contactPerson}`
              : oemRequest.user
                ? `${oemRequest.user.fullName} (${oemRequest.user.email})`
                : '—'}
          </p>
          {oemRequest.user?.phone && (
            <p className="mt-1 text-sm text-gray-500">Phone: {oemRequest.user.phone}</p>
          )}
        </section>

        <section className="rounded-xl2 border border-gray-200 bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold text-gray-900">Product Details</h2>
          <dl className="mt-2 space-y-1 text-sm text-gray-700">
            <div>Product type: {oemRequest.productType}</div>
            <div>Ingredients: {oemRequest.ingredients ?? '—'}</div>
            <div>Recipe: {oemRequest.recipe ?? '—'}</div>
            <div>Target market: {oemRequest.targetMarket ?? '—'}</div>
            <div>Destination country: {oemRequest.destinationCountry ?? '—'}</div>
          </dl>
        </section>

        <section className="rounded-xl2 border border-gray-200 bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold text-gray-900">Packaging & Branding</h2>
          <dl className="mt-2 space-y-1 text-sm text-gray-700">
            <div>Package type: {oemRequest.packageType ?? '—'}</div>
            <div>Package size: {oemRequest.packageSize ?? '—'}</div>
            <div>Brand name: {oemRequest.brandName ?? '—'}</div>
            <div>Private label: {oemRequest.isPrivateLabel ? 'Yes' : 'No'}</div>
          </dl>
        </section>

        <section className="rounded-xl2 border border-gray-200 bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold text-gray-900">Commercial</h2>
          <dl className="mt-2 space-y-1 text-sm text-gray-700">
            <div>Estimated quantity: {oemRequest.estimatedQuantity ?? '—'}</div>
            <div>Target price: {oemRequest.targetPrice ?? '—'}</div>
            <div>Certification requirement: {oemRequest.certificationRequirement ?? '—'}</div>
            {oemRequest.attachmentUrl && (
              <div>
                <a
                  href={oemRequest.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-700 hover:underline"
                >
                  Attachment
                </a>
              </div>
            )}
          </dl>
        </section>
      </div>

      <section className="mt-6 rounded-xl2 border border-gray-200 bg-white p-6 shadow-card">
        <h2 className="text-lg font-semibold text-gray-900">Update Status</h2>
        <form onSubmit={submitStatus} className="mt-3 space-y-3">
          <div className="flex gap-3">
            <label htmlFor="oem-status-select" className="sr-only">
              New status
            </label>
            <select
              id="oem-status-select"
              value={statusValue}
              onChange={(e) => setStatusValue(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value={oemRequest.status}>{oemRequest.status} (current)</option>
              {nextStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={statusSubmitting}
              className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 disabled:opacity-50"
            >
              Update
            </button>
          </div>
          <label htmlFor="oem-status-note" className="sr-only">
            Status update note
          </label>
          <textarea
            id="oem-status-note"
            placeholder="Optional note"
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            rows={2}
          />
          {nextStatuses.length === 0 && (
            <p className="text-xs text-gray-400">
              This OEM/ODM request is in a terminal state; no further transitions are allowed.
            </p>
          )}
          {statusError && (
            <div className="rounded-xl2 border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{statusError}</div>
          )}
        </form>
      </section>

      <section className="mt-6 rounded-xl2 border border-gray-200 bg-white p-6 shadow-card">
        <h2 className="text-lg font-semibold text-gray-900">Internal Note</h2>
        <form onSubmit={submitNote} className="mt-3 space-y-3">
          <label htmlFor="oem-internal-note" className="sr-only">
            Internal note
          </label>
          <textarea
            id="oem-internal-note"
            placeholder="Internal note (not visible to the customer)"
            value={internalNote}
            onChange={(e) => setInternalNote(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            rows={3}
          />
          <button
            type="submit"
            disabled={noteSubmitting}
            className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 disabled:opacity-50"
          >
            Save Note
          </button>
          {noteError && (
            <div className="rounded-xl2 border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{noteError}</div>
          )}
        </form>
      </section>

      <section className="mt-6 rounded-xl2 border border-gray-200 bg-white p-6 shadow-card">
        <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
        <div className="mt-3 max-h-80 space-y-3 overflow-y-auto">
          {oemRequest.messages.length === 0 ? (
            <p className="text-sm text-gray-500">No messages yet.</p>
          ) : (
            oemRequest.messages.map((m) => (
              <div key={m.id} className="rounded-lg bg-gray-50 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-800">
                    {m.sender?.fullName ?? 'Unknown'} <span className="text-gray-400">({m.sender?.role})</span>
                  </span>
                  <span className="text-xs text-gray-400">{new Date(m.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-gray-700">{m.message}</p>
                {m.attachmentUrl && (
                  <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-700 hover:underline">
                    Attachment
                  </a>
                )}
              </div>
            ))
          )}
        </div>
        <form onSubmit={submitReply} className="mt-3 flex gap-2">
          <label htmlFor="oem-reply-message" className="sr-only">
            Reply to customer
          </label>
          <textarea
            id="oem-reply-message"
            placeholder="Reply to customer..."
            value={replyMessage}
            onChange={(e) => setReplyMessage(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            rows={2}
          />
          <button
            type="submit"
            disabled={replySubmitting}
            className="self-end inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 disabled:opacity-50"
          >
            Send
          </button>
        </form>
        {replyError && (
          <div className="mt-2 rounded-xl2 border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{replyError}</div>
        )}
      </section>
    </div>
  );
}
