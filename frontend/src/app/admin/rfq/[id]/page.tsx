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
    return <p className="text-sm text-red-600">{loadError}</p>;
  }
  if (!rfq) {
    return <p className="text-sm text-gray-500">Loading RFQ...</p>;
  }

  const nextStatuses = ALLOWED_TRANSITIONS[rfq.status] ?? [];
  const canCreateQuotation = QUOTATION_ELIGIBLE_STATUSES.includes(rfq.status);

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">RFQ {rfq.rfqNumber}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Current status: <span className="font-semibold text-brand-700">{rfq.status}</span>
          </p>
        </div>
        <button onClick={() => router.push('/admin/rfq')} className="text-sm text-gray-500 hover:underline">
          Back to RFQs
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-md border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-800">Customer</h2>
          <p className="mt-2 text-sm text-gray-700">
            {rfq.company
              ? `${rfq.company.name} (${rfq.company.country}, ${rfq.company.businessType}) — contact: ${rfq.company.contactPerson}`
              : rfq.user
                ? `${rfq.user.fullName} (${rfq.user.email})`
                : '—'}
          </p>
          {rfq.user?.phone && <p className="mt-1 text-sm text-gray-500">Phone: {rfq.user.phone}</p>}
        </section>

        <section className="rounded-md border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-800">Shipment Details</h2>
          <dl className="mt-2 space-y-1 text-sm text-gray-700">
            <div>Destination: {rfq.destinationCountry ?? '—'} {rfq.destinationPort ? `/ ${rfq.destinationPort}` : ''}</div>
            <div>Incoterm: {rfq.incoterm ?? '—'}</div>
            <div>Payment Term: {rfq.paymentTerm ?? '—'}</div>
            {rfq.specialRequirement && <div>Special requirement: {rfq.specialRequirement}</div>}
          </dl>
        </section>
      </div>

      <section className="mt-6">
        <h2 className="font-semibold text-gray-800">RFQ Items</h2>
        <div className="mt-2 overflow-x-auto rounded-md border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Product</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Specification</th>
                <th className="px-4 py-2 text-right font-semibold text-gray-600">Quantity</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Unit</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Packaging</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {rfq.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2">{item.product?.name ?? item.productId}</td>
                  <td className="px-4 py-2 text-gray-600">{item.specification ?? '—'}</td>
                  <td className="px-4 py-2 text-right">{item.quantity}</td>
                  <td className="px-4 py-2">{item.unit}</td>
                  <td className="px-4 py-2 text-gray-600">{item.packaging ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-md border border-gray-200 p-4">
        <h2 className="font-semibold text-gray-800">Update Status</h2>
        <form onSubmit={submitStatus} className="mt-3 space-y-3">
          <div className="flex gap-3">
            <select
              value={statusValue}
              onChange={(e) => setStatusValue(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
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
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Update
            </button>
          </div>
          <textarea
            placeholder="Optional note"
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            rows={2}
          />
          {nextStatuses.length === 0 && (
            <p className="text-xs text-gray-400">This RFQ is in a terminal state; no further transitions are allowed.</p>
          )}
          {statusError && <p className="text-sm text-red-600">{statusError}</p>}
        </form>
      </section>

      <section className="mt-6 rounded-md border border-gray-200 p-4">
        <h2 className="font-semibold text-gray-800">Messages</h2>
        <div className="mt-3 max-h-80 space-y-3 overflow-y-auto">
          {rfq.messages.length === 0 ? (
            <p className="text-sm text-gray-500">No messages yet.</p>
          ) : (
            rfq.messages.map((m) => (
              <div key={m.id} className="rounded-md bg-gray-50 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-800">
                    {m.sender?.fullName ?? 'Unknown'} <span className="text-gray-400">({m.sender?.role})</span>
                  </span>
                  <span className="text-xs text-gray-400">{new Date(m.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-gray-700">{m.message}</p>
                {m.attachmentUrl && (
                  <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-700 hover:underline">
                    Attachment
                  </a>
                )}
              </div>
            ))
          )}
        </div>
        <form onSubmit={submitReply} className="mt-3 flex gap-2">
          <textarea
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

      <section className="mt-6 rounded-md border border-gray-200 p-4">
        <h2 className="font-semibold text-gray-800">Quotations</h2>
        {rfq.quotations.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No quotations sent yet.</p>
        ) : (
          <div className="mt-3 space-y-4">
            {rfq.quotations.map((q) => (
              <div key={q.id} className="rounded-md border border-gray-100 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-800">
                    Version {q.version} — {q.status}
                  </span>
                  <span className="text-gray-500">{formatMoney(q.totalAmount, q.currency)}</span>
                </div>
                {q.validUntil && (
                  <p className="text-xs text-gray-400">Valid until {new Date(q.validUntil).toLocaleDateString()}</p>
                )}
                <table className="mt-2 w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-1">Product</th>
                      <th className="py-1 text-right">Qty</th>
                      <th className="py-1 text-right">Unit Price</th>
                      <th className="py-1">Lead Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.items.map((it) => (
                      <tr key={it.id} className="border-t border-gray-100">
                        <td className="py-1">{it.product?.name ?? it.productId}</td>
                        <td className="py-1 text-right">{it.quantity}</td>
                        <td className="py-1 text-right">{formatMoney(it.unitPrice, q.currency)}</td>
                        <td className="py-1">{it.leadTime ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 border-t border-gray-100 pt-4">
          <h3 className="font-medium text-gray-800">Create Quotation</h3>
          {!canCreateQuotation && (
            <p className="mt-1 text-xs text-gray-400">
              A new quotation can only be created while the RFQ is in SALES_REVIEW, NEGOTIATION, or
              QUOTATION_SENT status.
            </p>
          )}
          <form onSubmit={submitQuotation} className="mt-3 space-y-3">
            <div className="flex gap-3">
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                placeholder="Currency (e.g. USD)"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-2">
                  <select
                    value={line.productId}
                    onChange={(e) => updateLine(idx, 'productId', e.target.value)}
                    required
                    className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  >
                    <option value="">Select product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Quantity"
                    value={line.quantity}
                    onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                    required
                    className="w-28 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Unit price"
                    value={line.unitPrice}
                    onChange={(e) => updateLine(idx, 'unitPrice', e.target.value)}
                    required
                    className="w-28 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                  <input
                    placeholder="Lead time"
                    value={line.leadTime}
                    onChange={(e) => updateLine(idx, 'leadTime', e.target.value)}
                    className="w-32 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeLine(idx)}
                    disabled={lines.length === 1}
                    className="text-xs text-red-600 disabled:opacity-30"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" onClick={addLine} className="text-sm font-medium text-brand-700 hover:underline">
                + Add line
              </button>
            </div>

            <p className="text-sm font-medium text-gray-700">
              Total: {formatMoney(quotationTotal, currency)}
            </p>

            {quotationError && <p className="text-sm text-red-600">{quotationError}</p>}

            <button
              type="submit"
              disabled={quotationSubmitting}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {quotationSubmitting ? 'Submitting...' : 'Send Quotation'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
