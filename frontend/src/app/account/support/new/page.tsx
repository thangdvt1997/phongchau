'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api-client';

const CATEGORIES = ['ORDER', 'PRODUCT', 'PAYMENT', 'SHIPPING', 'RFQ', 'OEM', 'ACCOUNT', 'OTHER'];

function formatEnumLabel(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

interface OrderOption {
  id: string;
  orderNumber: string;
}

export default function NewSupportTicketPage() {
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('ORDER');
  const [message, setMessage] = useState('');
  const [orderId, setOrderId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    apiClient
      .get('/orders')
      .then(({ data }) => setOrders(data.items))
      .catch(() => setOrders([]));
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { data: ticket } = await apiClient.post('/support', {
        subject,
        category,
        message,
        orderId: orderId || undefined,
      });
      setSuccess(ticket.ticketNumber);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to submit ticket.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!loading && !user) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Sign in to open a support ticket</h1>
        <p className="mt-2 text-gray-600">Your tickets are tracked against your account.</p>
        <Link
          href="/login?next=/account/support/new"
          className="mt-6 inline-block rounded-md bg-brand-600 px-6 py-3 font-semibold text-white"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-brand-700">Ticket Submitted</h1>
        <p className="mt-2 text-gray-600">
          Your ticket <span className="font-semibold">{success}</span> has been opened. Our support team will
          respond shortly.
        </p>
        <Link href="/account/support" className="mt-6 inline-block text-brand-700 hover:underline">
          View my tickets
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900">Open a Support Ticket</h1>
      <p className="mt-2 text-sm text-gray-600">
        Tell us what is going on and our support team will get back to you.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="ticket-subject" className="text-sm font-semibold text-gray-700">
            Subject
          </label>
          <input
            id="ticket-subject"
            required
            placeholder="Brief summary of your issue"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="ticket-category" className="text-sm font-semibold text-gray-700">
            Category
          </label>
          <select
            id="ticket-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {formatEnumLabel(c)}
              </option>
            ))}
          </select>
        </div>

        {orders.length > 0 && (
          <div>
            <label htmlFor="ticket-order" className="text-sm font-semibold text-gray-700">
              Related order (optional)
            </label>
            <select
              id="ticket-order"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="">None</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.orderNumber}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="ticket-message" className="text-sm font-semibold text-gray-700">
            Message
          </label>
          <textarea
            id="ticket-message"
            required
            placeholder="Describe your issue in detail"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            rows={6}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !subject.trim() || !message.trim()}
          className="w-full rounded-md bg-brand-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Submit Ticket'}
        </button>
      </form>
    </div>
  );
}
