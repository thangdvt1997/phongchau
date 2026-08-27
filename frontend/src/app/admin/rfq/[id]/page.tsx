'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { formatMoney } from '@/lib/format';

// Mirrors backend/src/modules/rfq/rfq.service.ts ALLOWED_TRANSITIONS — keep in sync.
// A same-status "transition" is always allowed server-side as an idempotent no-op,
// so it is not listed here (the UI simply excludes the current status from the list
// of *other* selectable options, but re-submitting the same status will succeed).
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['SALES_REVIEW', 'REJECTED', 'CANCELLED'],
  SALES_REVIEW: ['QUOTATION_SENT', 'REJECTED', 'CANCELLED'],
  QUOTATION_SENT: ['NEGOTIATION', 'ACCEPTED', 'REJECTED', 'CANCELLED'],
  NEGOTIATION: ['QUOTATION_SENT', 'ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['PURCHASE_ORDER', 'CANCELLED'],
  PURCHASE_ORDER: ['PAYMENT', 'CANCELLED'],
  PAYMENT: ['PRODUCTION', 'CANCELLED'],
  PRODUCTION: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};

// Quotation creation is only possible when the backend's assertValidRfqTransition
// would accept a transition to QUOTATION_SENT from the current status.
const QUOTATION_ELIGIBLE_STATUSES = ['SALES_REVIEW', 'NEGOTIATION', 'QUOTATION_SENT'];

interface ProductOption {
  id: string;
  name: string;
  sku: string;
}

interface RfqItem {
  id: string;
  productId: string;
  product: { id: string; name: string; sku: string } | null;
  specification: string | null;
  quantity: number;
  unit: string;
  packaging: string | null;
}

interface RfqMessage {
  id: string;
  message: string;
  attachmentUrl: string | null;
  createdAt: string;
  sender: { id: string; fullName: string; role: string } | null;
}

interface QuotationItem {
  id: string;
  productId: string;
  product: { id: string; name: string; sku: string } | null;
  quantity: number;
  unitPrice: number;
  leadTime: string | null;
}

interface Quotation {
  id: string;
  version: number;
  validUntil: string | null;
  currency: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  items: QuotationItem[];
}

interface RfqDetail {
  id: string;
  rfqNumber: string;
  status: string;
  destinationCountry: string | null;
  destinationPort: string | null;
  incoterm: string | null;
  paymentTerm: string | null;
  specialRequirement: string | null;
  attachmentUrl: string | null;
  assignedSalesId: string | null;
  createdAt: string;
  items: RfqItem[];
  messages: RfqMessage[];
  quotations: Quotation[];
  user: { id: string; fullName: string; email: string; phone: string | null; companyId: string | null } | null;
  company: { id: string; name: string; country: string; businessType: string; contactPerson: string } | null;
}

interface QuotationLineDraft {
  productId: string;
  quantity: string;
  unitPrice: string;
  leadTime: string;
}

export default function AdminRfqDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [rfq, setRfq] = useState<RfqDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductOption[]>([]);

  const [statusValue, setStatusValue] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [replyMessage, setReplyMessage] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const [validUntil, setValidUntil] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [lines, setLines] = useState<QuotationLineDraft[]>([
    { productId: '', quantity: '', unitPrice: '', leadTime: '' },
  ]);
  const [quotationSubmitting, setQuotationSubmitting] = useState(false);
  const [quotationError, setQuotationError] = useState<string | null>(null);

  function load() {
    apiClient
      .get(`/admin/rfq/${params.id}`)
      .then(({ data }) => {
        setRfq(data);
        setStatusValue(data.status);
      })
      .catch((err) => {
        setLoadError(err?.response?.data?.message ?? 'Failed to load RFQ.');
      });
  }

  useEffect(() => {
    load();
    apiClient.get('/catalog/products', { params: { pageSize: 100 } }).then(({ data }) => {
      setProducts(data.items.map((p: any) => ({ id: p.id, name: p.name, sku: p.sku })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function submitStatus(e: React.FormEvent) {
    e.preventDefault();
    setStatusSubmitting(true);
    setStatusError(null);
    try {
      await apiClient.patch(`/admin/rfq/${params.id}/status`, {
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
      await apiClient.post(`/rfq/${params.id}/messages`, { message: replyMessage });
      setReplyMessage('');
      load();
    } catch (err: any) {
      setReplyError(err?.response?.data?.message ?? 'Failed to send message.');
    } finally {
      setReplySubmitting(false);
    }
  }

  function updateLine(idx: number, key: keyof QuotationLineDraft, value: string) {
    setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, [key]: value } : l)));
  }

  function addLine() {
    setLines((ls) => [...ls, { productId: '', quantity: '', unitPrice: '', leadTime: '' }]);
  }

  function removeLine(idx: number) {
    setLines((ls) => (ls.length > 1 ? ls.filter((_, i) => i !== idx) : ls));
  }

  const quotationTotal = lines.reduce((sum, l) => {
    const q = Number(l.quantity) || 0;
    const p = Number(l.unitPrice) || 0;
    return sum + q * p;
  }, 0);

  async function submitQuotation(e: React.FormEvent) {
    e.preventDefault();
    setQuotationSubmitting(true);
    setQuotationError(null);
    try {
      await apiClient.post(`/admin/rfq/${params.id}/quotations`, {
        validUntil: validUntil || undefined,
        currency,
        items: lines.map((l) => ({
          productId: l.productId,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
          leadTime: l.leadTime || undefined,
        })),
      });
      setLines([{ productId: '', quantity: '', unitPrice: '', leadTime: '' }]);
      setValidUntil('');
      load();
    } catch (err: any) {
      setQuotationError(err?.response?.data?.message ?? 'Failed to create quotation.');
    } finally {
      setQuotationSubmitting(false);
    }
  }

  if (loadError) {
    return <div className="rounded-xl2 border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{loadError}</div>;
  }
  if (!rfq) {
    return <p className="text-sm text-gray-500">Loading RFQ...</p>;
  }

  const nextStatuses = ALLOWED_TRANSITIONS[rfq.status] ?? [];
  const canCreateQuotation = QUOTATION_ELIGIBLE_STATUSES.includes(rfq.status);

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">RFQ {rfq.rfqNumber}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Current status: <span className="font-semibold text-teal-700">{rfq.status}</span>
          </p>
        </div>
        <button onClick={() => router.push('/admin/rfq')} className="text-sm text-gray-500 hover:underline">
          Back to RFQs
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-xl2 border border-gray-200 bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold text-gray-900">Customer</h2>
          <p className="mt-2 text-sm text-gray-700">
            {rfq.company
              ? `${rfq.company.name} (${rfq.company.country}, ${rfq.company.businessType}) — contact: ${rfq.company.contactPerson}`
              : rfq.user
                ? `${rfq.user.fullName} (${rfq.user.email})`
                : '—'}
          </p>
          {rfq.user?.phone && <p className="mt-1 text-sm text-gray-500">Phone: {rfq.user.phone}</p>}
        </section>

        <section className="rounded-xl2 border border-gray-200 bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold text-gray-900">Shipment Details</h2>
          <dl className="mt-2 space-y-1 text-sm text-gray-700">
            <div>Destination: {rfq.destinationCountry ?? '—'} {rfq.destinationPort ? `/ ${rfq.destinationPort}` : ''}</div>
            <div>Incoterm: {rfq.incoterm ?? '—'}</div>
            <div>Payment Term: {rfq.paymentTerm ?? '—'}</div>
            {rfq.specialRequirement && <div>Special requirement: {rfq.specialRequirement}</div>}
          </dl>
        </section>
      </div>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900">RFQ Items</h2>
        <div className="mt-2 overflow-hidden rounded-xl2 border border-gray-200 bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Product</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Specification</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Quantity</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Unit</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Packaging</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rfq.items.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-4 py-2.5">{item.product?.name ?? item.productId}</td>
                    <td className="px-4 py-2.5 text-gray-600">{item.specification ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right">{item.quantity}</td>
                    <td className="px-4 py-2.5">{item.unit}</td>
                    <td className="px-4 py-2.5 text-gray-600">{item.packaging ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-xl2 border border-gray-200 bg-white p-6 shadow-card">
        <h2 className="text-lg font-semibold text-gray-900">Update Status</h2>
        <form onSubmit={submitStatus} className="mt-3 space-y-3">
          <div className="flex gap-3">
            <label htmlFor="rfq-status-select" className="sr-only">
              New status
            </label>
            <select
              id="rfq-status-select"
              value={statusValue}
              onChange={(e) => setStatusValue(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value={rfq.status}>{rfq.status} (current)</option>
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
          <label htmlFor="rfq-status-note" className="sr-only">
            Status update note
          </label>
          <textarea
            id="rfq-status-note"
            placeholder="Optional note"
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            rows={2}
          />
          {nextStatuses.length === 0 && (
            <p className="text-xs text-gray-400">This RFQ is in a terminal state; no further transitions are allowed.</p>
          )}
          {statusError && (
            <div className="rounded-xl2 border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{statusError}</div>
          )}
        </form>
      </section>

      <section className="mt-6 rounded-xl2 border border-gray-200 bg-white p-6 shadow-card">
        <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
        <div className="mt-3 max-h-80 space-y-3 overflow-y-auto">
          {rfq.messages.length === 0 ? (
            <p className="text-sm text-gray-500">No messages yet.</p>
          ) : (
            rfq.messages.map((m) => (
              <div key={m.id} className="rounded-lg bg-gray-50 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-800">
                    {m.sender?.fullName ?? 'Unknown'} <span className="text-gray-400">({m.sender?.role})</span>
                  </span>
                  <span className="text-xs text-gray-400">{new Date(m.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-gray-700">{m.message}</p>
                {m.attachmentUrl && (
                  <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-700 hover:text-teal-800 hover:underline">
                    Attachment
                  </a>
                )}
              </div>
            ))
          )}
        </div>
        <form onSubmit={submitReply} className="mt-3 flex gap-2">
          <label htmlFor="rfq-reply-message" className="sr-only">
            Reply to customer
          </label>
          <textarea
            id="rfq-reply-message"
            placeholder="Reply to customer..."
            value={replyMessage}
            onChange={(e) => setReplyMessage(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            rows={2}
          />
          <button
            type="submit"
            disabled={replySubmitting}
            className="inline-flex items-center justify-center self-end rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 disabled:opacity-50"
          >
            Send
          </button>
        </form>
        {replyError && (
          <div className="mt-2 rounded-xl2 border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{replyError}</div>
        )}
      </section>

      <section className="mt-6 rounded-xl2 border border-gray-200 bg-white p-6 shadow-card">
        <h2 className="text-lg font-semibold text-gray-900">Quotations</h2>
        {rfq.quotations.length === 0 ? (
          <div className="mt-3 rounded-xl2 border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
            No quotations sent yet.
          </div>
        ) : (
          <div className="mt-3 space-y-4">
            {rfq.quotations.map((q) => (
              <div key={q.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-800">
                    Version {q.version} —{' '}
                    <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                      {q.status}
                    </span>
                  </span>
                  <span className="text-gray-500">{formatMoney(q.totalAmount, q.currency)}</span>
                </div>
                {q.validUntil && (
                  <p className="mt-1 text-xs text-gray-400">Valid until {new Date(q.validUntil).toLocaleDateString()}</p>
                )}
                <div className="mt-2 overflow-hidden rounded-lg border border-gray-200 bg-white">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <th className="px-2 py-1.5">Product</th>
                        <th className="px-2 py-1.5 text-right">Qty</th>
                        <th className="px-2 py-1.5 text-right">Unit Price</th>
                        <th className="px-2 py-1.5">Lead Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {q.items.map((it) => (
                        <tr key={it.id}>
                          <td className="px-2 py-1.5">{it.product?.name ?? it.productId}</td>
                          <td className="px-2 py-1.5 text-right">{it.quantity}</td>
                          <td className="px-2 py-1.5 text-right">{formatMoney(it.unitPrice, q.currency)}</td>
                          <td className="px-2 py-1.5">{it.leadTime ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 border-t border-gray-100 pt-4">
          <h3 className="text-sm font-semibold text-gray-800">Create Quotation</h3>
          {!canCreateQuotation && (
            <p className="mt-1 text-xs text-gray-400">
              A new quotation can only be created while the RFQ is in SALES_REVIEW, NEGOTIATION, or
              QUOTATION_SENT status.
            </p>
          )}
          <form onSubmit={submitQuotation} className="mt-3 space-y-3">
            <div className="flex gap-3">
              <label htmlFor="quotation-valid-until" className="sr-only">
                Valid until
              </label>
              <input
                id="quotation-valid-until"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <label htmlFor="quotation-currency" className="sr-only">
                Currency
              </label>
              <input
                id="quotation-currency"
                placeholder="Currency (e.g. USD)"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label={`Line ${idx + 1} product`}
                    value={line.productId}
                    onChange={(e) => updateLine(idx, 'productId', e.target.value)}
                    required
                    className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="">Select product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                  <input
                    aria-label={`Line ${idx + 1} quantity`}
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Quantity"
                    value={line.quantity}
                    onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                    required
                    className="w-28 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  <input
                    aria-label={`Line ${idx + 1} unit price`}
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Unit price"
                    value={line.unitPrice}
                    onChange={(e) => updateLine(idx, 'unitPrice', e.target.value)}
                    required
                    className="w-28 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  <input
                    aria-label={`Line ${idx + 1} lead time`}
                    placeholder="Lead time"
                    value={line.leadTime}
                    onChange={(e) => updateLine(idx, 'leadTime', e.target.value)}
                    className="w-32 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeLine(idx)}
                    disabled={lines.length === 1}
                    className="text-xs font-medium text-rose-600 hover:text-rose-700 disabled:opacity-30"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" onClick={addLine} className="text-sm font-medium text-teal-700 hover:text-teal-800 hover:underline">
                + Add line
              </button>
            </div>

            <p className="text-sm font-medium text-gray-700">
              Total: {formatMoney(quotationTotal, currency)}
            </p>

            {quotationError && (
              <div className="rounded-xl2 border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{quotationError}</div>
            )}

            <button
              type="submit"
              disabled={quotationSubmitting}
              className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 disabled:opacity-50"
            >
              {quotationSubmitting ? 'Submitting...' : 'Send Quotation'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
