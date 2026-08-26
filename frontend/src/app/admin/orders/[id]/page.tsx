'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { formatMoney } from '@/lib/format';

const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'AWAITING_PAYMENT',
  'PAID',
  'PROCESSING',
  'PRODUCTION',
  'QUALITY_CHECKING',
  'PACKED',
  'READY_TO_SHIP',
  'SHIPPED',
  'CUSTOMS_CLEARANCE',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
];

const SHIPPING_METHODS = ['FLAT_RATE', 'FREE', 'ZONE_BASED', 'CUSTOMER_PICKUP'];
const SHIPPING_ZONES = ['VIETNAM', 'ASEAN', 'ASIA', 'EUROPE', 'NORTH_AMERICA', 'GLOBAL'];

interface Address {
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  province: string | null;
  country: string;
  postalCode: string | null;
}

interface OrderItem {
  id: string;
  productNameSnapshot: string;
  skuSnapshot: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface StatusHistoryEntry {
  id: string;
  status: string;
  note: string | null;
  changedBy: string | null;
  createdAt: string;
}

interface Payment {
  id: string;
  provider: string;
  status: string;
  amount: number;
  currency: string;
  transactionRef: string | null;
  proofUrl: string | null;
  createdAt: string;
}

interface ShipmentTracking {
  id: string;
  status: string;
  note: string | null;
  location: string | null;
  createdAt: string;
}

interface Shipment {
  id: string;
  carrier: string | null;
  trackingNumber: string | null;
  method: string;
  zone: string | null;
  cost: number;
  status: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  tracking: ShipmentTracking[];
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  userId: string | null;
  user: { id: string; fullName: string; email: string } | null;
  guestEmail: string | null;
  status: string;
  paymentStatus: string;
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  grandTotal: number;
  currency: string;
  poNumber: string | null;
  deliveryNote: string | null;
  customerNote: string | null;
  internalNote: string | null;
  createdAt: string;
  items: OrderItem[];
  statusHistory: StatusHistoryEntry[];
  payments: Payment[];
  shipments: Shipment[];
  shippingAddress: Address | null;
  billingAddress: Address | null;
}

export default function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [statusValue, setStatusValue] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [internalNote, setInternalNote] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [notesSubmitting, setNotesSubmitting] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);

  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const [refundOpenFor, setRefundOpenFor] = useState<string | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [paymentActionError, setPaymentActionError] = useState<string | null>(null);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  const [shipmentForm, setShipmentForm] = useState({
    carrier: '',
    trackingNumber: '',
    method: 'FLAT_RATE',
    zone: '',
    cost: '',
  });
  const [shipmentSubmitting, setShipmentSubmitting] = useState(false);
  const [shipmentError, setShipmentError] = useState<string | null>(null);

  const [trackingForms, setTrackingForms] = useState<
    Record<string, { status: string; note: string; location: string }>
  >({});
  const [trackingSubmittingId, setTrackingSubmittingId] = useState<string | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  function load() {
    apiClient
      .get(`/admin/orders/${params.id}`)
      .then(({ data }) => {
        setOrder(data);
        setStatusValue(data.status);
        setInternalNote(data.internalNote ?? '');
        setCustomerNote(data.customerNote ?? '');
        const tf: Record<string, { status: string; note: string; location: string }> = {};
        for (const s of data.shipments as Shipment[]) {
          tf[s.id] = { status: s.status, note: '', location: '' };
        }
        setTrackingForms(tf);
      })
      .catch((err) => {
        setLoadError(err?.response?.data?.message ?? 'Failed to load order.');
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
      await apiClient.patch(`/admin/orders/${params.id}/status`, {
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

  async function submitNotes(e: React.FormEvent) {
    e.preventDefault();
    setNotesSubmitting(true);
    setNotesError(null);
    try {
      await apiClient.patch(`/admin/orders/${params.id}/notes`, {
        internalNote: internalNote || undefined,
        customerNote: customerNote || undefined,
      });
      load();
    } catch (err: any) {
      setNotesError(err?.response?.data?.message ?? 'Failed to update notes.');
    } finally {
      setNotesSubmitting(false);
    }
  }

  async function submitCancel() {
    setCancelSubmitting(true);
    setCancelError(null);
    try {
      await apiClient.post(`/admin/orders/${params.id}/cancel`);
      setCancelConfirm(false);
      load();
    } catch (err: any) {
      setCancelError(err?.response?.data?.message ?? 'Failed to cancel order.');
    } finally {
      setCancelSubmitting(false);
    }
  }

  async function markPaid(paymentId: string) {
    setPaymentSubmitting(true);
    setPaymentActionError(null);
    try {
      await apiClient.post(`/admin/payments/${paymentId}/mark-paid`);
      load();
    } catch (err: any) {
      setPaymentActionError(err?.response?.data?.message ?? 'Failed to mark payment as paid.');
    } finally {
      setPaymentSubmitting(false);
    }
  }

  async function submitRefund(paymentId: string, e: React.FormEvent) {
    e.preventDefault();
    setPaymentSubmitting(true);
    setPaymentActionError(null);
    try {
      await apiClient.post(`/admin/payments/${paymentId}/refund`, {
        amount: refundAmount ? Number(refundAmount) : undefined,
        reason: refundReason || undefined,
      });
      setRefundOpenFor(null);
      setRefundAmount('');
      setRefundReason('');
      load();
    } catch (err: any) {
      setPaymentActionError(err?.response?.data?.message ?? 'Failed to process refund.');
    } finally {
      setPaymentSubmitting(false);
    }
  }

  async function submitShipment(e: React.FormEvent) {
    e.preventDefault();
    setShipmentSubmitting(true);
    setShipmentError(null);
    try {
      await apiClient.post('/admin/shipments', {
        orderId: params.id,
        carrier: shipmentForm.carrier || undefined,
        trackingNumber: shipmentForm.trackingNumber || undefined,
        method: shipmentForm.method,
        zone: shipmentForm.zone || undefined,
        cost: Number(shipmentForm.cost || 0),
      });
      setShipmentForm({ carrier: '', trackingNumber: '', method: 'FLAT_RATE', zone: '', cost: '' });
      load();
    } catch (err: any) {
      setShipmentError(err?.response?.data?.message ?? 'Failed to create shipment.');
    } finally {
      setShipmentSubmitting(false);
    }
  }

  async function submitTracking(shipmentId: string, e: React.FormEvent) {
    e.preventDefault();
    const form = trackingForms[shipmentId];
    setTrackingSubmittingId(shipmentId);
    setTrackingError(null);
    try {
      await apiClient.patch(`/admin/shipments/${shipmentId}/status`, {
        status: form.status,
        note: form.note || undefined,
        location: form.location || undefined,
      });
      load();
    } catch (err: any) {
      setTrackingError(err?.response?.data?.message ?? 'Failed to update shipment tracking.');
    } finally {
      setTrackingSubmittingId(null);
    }
  }

  if (loadError) {
    return <p className="text-sm text-red-600">{loadError}</p>;
  }

  if (!order) {
    return <p className="text-sm text-gray-500">Loading order...</p>;
  }

  const unpaidPayments = order.payments.filter((p) => p.status === 'PENDING' || p.status === 'FAILED');
  const paidPayments = order.payments.filter(
    (p) => p.status === 'PAID' || p.status === 'PARTIALLY_REFUNDED',
  );

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Order {order.orderNumber}</h1>
        <button onClick={() => router.push('/admin/orders')} className="text-sm text-gray-500 hover:underline">
          Back to orders
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-md border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-800">Customer</h2>
          <p className="mt-2 text-sm text-gray-700">
            {order.user ? `${order.user.fullName} (${order.user.email})` : order.guestEmail ?? 'Guest'}
          </p>
          {order.poNumber && <p className="mt-1 text-sm text-gray-500">PO Number: {order.poNumber}</p>}
          {order.customerNote && (
            <p className="mt-1 text-sm text-gray-500">Customer note: {order.customerNote}</p>
          )}
          {order.deliveryNote && (
            <p className="mt-1 text-sm text-gray-500">Delivery note: {order.deliveryNote}</p>
          )}
        </section>

        <section className="rounded-md border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-800">Totals</h2>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Subtotal</dt>
              <dd>{formatMoney(order.subtotal, order.currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Discount</dt>
              <dd>-{formatMoney(order.discountTotal, order.currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Shipping</dt>
              <dd>{formatMoney(order.shippingTotal, order.currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Tax</dt>
              <dd>{formatMoney(order.taxTotal, order.currency)}</dd>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-1 font-semibold text-gray-800">
              <dt>Grand Total</dt>
              <dd>{formatMoney(order.grandTotal, order.currency)}</dd>
            </div>
          </dl>
        </section>

        {order.shippingAddress && (
          <section className="rounded-md border border-gray-200 p-4">
            <h2 className="font-semibold text-gray-800">Shipping Address</h2>
            <p className="mt-2 text-sm text-gray-700">
              {order.shippingAddress.fullName} — {order.shippingAddress.phone}
              <br />
              {order.shippingAddress.line1}
              {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}
              <br />
              {order.shippingAddress.city}
              {order.shippingAddress.province ? `, ${order.shippingAddress.province}` : ''},{' '}
              {order.shippingAddress.country} {order.shippingAddress.postalCode ?? ''}
            </p>
          </section>
        )}

        {order.billingAddress && (
          <section className="rounded-md border border-gray-200 p-4">
            <h2 className="font-semibold text-gray-800">Billing Address</h2>
            <p className="mt-2 text-sm text-gray-700">
              {order.billingAddress.fullName} — {order.billingAddress.phone}
              <br />
              {order.billingAddress.line1}
              {order.billingAddress.line2 ? `, ${order.billingAddress.line2}` : ''}
              <br />
              {order.billingAddress.city}
              {order.billingAddress.province ? `, ${order.billingAddress.province}` : ''},{' '}
              {order.billingAddress.country} {order.billingAddress.postalCode ?? ''}
            </p>
          </section>
        )}
      </div>

      <section className="mt-6">
        <h2 className="font-semibold text-gray-800">Line Items</h2>
        <div className="mt-2 overflow-x-auto rounded-md border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Product</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">SKU</th>
                <th className="px-4 py-2 text-right font-semibold text-gray-600">Qty</th>
                <th className="px-4 py-2 text-right font-semibold text-gray-600">Unit Price</th>
                <th className="px-4 py-2 text-right font-semibold text-gray-600">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2">{item.productNameSnapshot}</td>
                  <td className="px-4 py-2 text-gray-500">{item.skuSnapshot}</td>
                  <td className="px-4 py-2 text-right">{item.quantity}</td>
                  <td className="px-4 py-2 text-right">{formatMoney(item.unitPrice, order.currency)}</td>
                  <td className="px-4 py-2 text-right">{formatMoney(item.lineTotal, order.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="font-semibold text-gray-800">Status History</h2>
        <ol className="mt-2 space-y-2 border-l-2 border-brand-200 pl-4">
          {order.statusHistory.map((h) => (
            <li key={h.id} className="text-sm">
              <p className="font-medium text-gray-800">{h.status}</p>
              <p className="text-xs text-gray-400">{new Date(h.createdAt).toLocaleString()}</p>
              {h.note && <p className="text-gray-600">{h.note}</p>}
            </li>
          ))}
        </ol>
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
              {ORDER_STATUSES.map((s) => (
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
          {statusError && <p className="text-sm text-red-600">{statusError}</p>}
        </form>

        <div className="mt-4">
          {!cancelConfirm ? (
            <button
              onClick={() => setCancelConfirm(true)}
              disabled={order.status === 'CANCELLED' || order.status === 'DELIVERED' || order.status === 'REFUNDED'}
              className="rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-40"
            >
              Cancel Order
            </button>
          ) : (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-gray-700">Cancel this order?</span>
              <button
                onClick={submitCancel}
                disabled={cancelSubmitting}
                className="rounded-md bg-red-600 px-3 py-1.5 font-semibold text-white disabled:opacity-50"
              >
                Yes, cancel
              </button>
              <button
                onClick={() => setCancelConfirm(false)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-gray-600"
              >
                No
              </button>
            </div>
          )}
          {cancelError && <p className="mt-2 text-sm text-red-600">{cancelError}</p>}
        </div>
      </section>

      <section className="mt-6 rounded-md border border-gray-200 p-4">
        <h2 className="font-semibold text-gray-800">Notes</h2>
        <form onSubmit={submitNotes} className="mt-3 space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Internal note (staff only)</label>
            <textarea
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              rows={2}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Customer-visible note</label>
            <textarea
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              rows={2}
            />
          </div>
          {notesError && <p className="text-sm text-red-600">{notesError}</p>}
          <button
            type="submit"
            disabled={notesSubmitting}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Save Notes
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-md border border-gray-200 p-4">
        <h2 className="font-semibold text-gray-800">Payments</h2>
        {order.payments.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No payments recorded.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {order.payments.map((p) => (
              <div key={p.id} className="rounded-md border border-gray-100 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-800">
                    {p.provider} — {formatMoney(p.amount, p.currency)}
                  </span>
                  <span className="text-gray-500">{p.status}</span>
                </div>
                {p.transactionRef && (
                  <p className="mt-1 text-xs text-gray-400">Ref: {p.transactionRef}</p>
                )}
                <p className="text-xs text-gray-400">{new Date(p.createdAt).toLocaleString()}</p>

                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {(p.status === 'PENDING' || p.status === 'FAILED') && (
                    <button
                      onClick={() => markPaid(p.id)}
                      disabled={paymentSubmitting}
                      className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Mark as Paid
                    </button>
                  )}
                  {(p.status === 'PAID' || p.status === 'PARTIALLY_REFUNDED') && (
                    <button
                      onClick={() => setRefundOpenFor(refundOpenFor === p.id ? null : p.id)}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700"
                    >
                      Refund
                    </button>
                  )}
                </div>

                {refundOpenFor === p.id && (
                  <form onSubmit={(e) => submitRefund(p.id, e)} className="mt-2 flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder={`Amount (default full ${formatMoney(p.amount, p.currency)})`}
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      className="w-56 rounded-md border border-gray-300 px-2 py-1 text-xs"
                    />
                    <input
                      placeholder="Reason"
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      className="w-56 rounded-md border border-gray-300 px-2 py-1 text-xs"
                    />
                    <button
                      type="submit"
                      disabled={paymentSubmitting}
                      className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Confirm Refund
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
        {paymentActionError && <p className="mt-2 text-sm text-red-600">{paymentActionError}</p>}
      </section>

      <section className="mt-6 rounded-md border border-gray-200 p-4">
        <h2 className="font-semibold text-gray-800">Shipments</h2>
        {order.shipments.length === 0 ? (
          <>
            <p className="mt-2 text-sm text-gray-500">No shipment created yet.</p>
            <form onSubmit={submitShipment} className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <input
                placeholder="Carrier"
                value={shipmentForm.carrier}
                onChange={(e) => setShipmentForm((f) => ({ ...f, carrier: e.target.value }))}
                className="rounded-md border border-gray-300 px-3 py-2"
              />
              <input
                placeholder="Tracking number"
                value={shipmentForm.trackingNumber}
                onChange={(e) => setShipmentForm((f) => ({ ...f, trackingNumber: e.target.value }))}
                className="rounded-md border border-gray-300 px-3 py-2"
              />
              <select
                value={shipmentForm.method}
                onChange={(e) => setShipmentForm((f) => ({ ...f, method: e.target.value }))}
                className="rounded-md border border-gray-300 px-3 py-2"
              >
                {SHIPPING_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={shipmentForm.zone}
                onChange={(e) => setShipmentForm((f) => ({ ...f, zone: e.target.value }))}
                className="rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="">No zone</option>
                {SHIPPING_ZONES.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="Cost"
                value={shipmentForm.cost}
                onChange={(e) => setShipmentForm((f) => ({ ...f, cost: e.target.value }))}
                className="rounded-md border border-gray-300 px-3 py-2"
              />
              <button
                type="submit"
                disabled={shipmentSubmitting}
                className="col-span-2 rounded-md bg-brand-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
              >
                Create Shipment
              </button>
              {shipmentError && <p className="col-span-2 text-sm text-red-600">{shipmentError}</p>}
            </form>
          </>
        ) : (
          <div className="mt-3 space-y-4">
            {order.shipments.map((s) => (
              <div key={s.id} className="rounded-md border border-gray-100 p-3 text-sm">
                <p className="font-medium text-gray-800">
                  {s.carrier ?? 'Unknown carrier'} {s.trackingNumber ? `— ${s.trackingNumber}` : ''}
                </p>
                <p className="text-gray-500">
                  {s.method} {s.zone ? `(${s.zone})` : ''} — {formatMoney(s.cost, order.currency)} — status:{' '}
                  {s.status}
                </p>
                <ol className="mt-2 space-y-1 border-l-2 border-brand-200 pl-3">
                  {s.tracking.map((t) => (
                    <li key={t.id} className="text-xs">
                      <span className="font-medium text-gray-700">{t.status}</span>{' '}
                      <span className="text-gray-400">{new Date(t.createdAt).toLocaleString()}</span>
                      {t.location && <span className="text-gray-500"> — {t.location}</span>}
                      {t.note && <p className="text-gray-500">{t.note}</p>}
                    </li>
                  ))}
                </ol>

                <form
                  onSubmit={(e) => submitTracking(s.id, e)}
                  className="mt-3 flex flex-wrap items-center gap-2"
                >
                  <select
                    value={trackingForms[s.id]?.status ?? s.status}
                    onChange={(e) =>
                      setTrackingForms((f) => ({
                        ...f,
                        [s.id]: { ...f[s.id], status: e.target.value },
                      }))
                    }
                    className="rounded-md border border-gray-300 px-2 py-1 text-xs"
                  >
                    {ORDER_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                  <input
                    placeholder="Location"
                    value={trackingForms[s.id]?.location ?? ''}
                    onChange={(e) =>
                      setTrackingForms((f) => ({
                        ...f,
                        [s.id]: { ...f[s.id], location: e.target.value },
                      }))
                    }
                    className="w-32 rounded-md border border-gray-300 px-2 py-1 text-xs"
                  />
                  <input
                    placeholder="Note"
                    value={trackingForms[s.id]?.note ?? ''}
                    onChange={(e) =>
                      setTrackingForms((f) => ({
                        ...f,
                        [s.id]: { ...f[s.id], note: e.target.value },
                      }))
                    }
                    className="w-40 rounded-md border border-gray-300 px-2 py-1 text-xs"
                  />
                  <button
                    type="submit"
                    disabled={trackingSubmittingId === s.id}
                    className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    Update Tracking
                  </button>
                </form>
              </div>
            ))}
            {trackingError && <p className="text-sm text-red-600">{trackingError}</p>}
          </div>
        )}
      </section>
    </div>
  );
}
