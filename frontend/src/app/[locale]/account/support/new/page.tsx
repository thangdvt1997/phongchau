'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api-client';

const CATEGORIES = ['ORDER', 'PRODUCT', 'PAYMENT', 'SHIPPING', 'RFQ', 'OEM', 'ACCOUNT', 'OTHER'] as const;

interface OrderOption {
  id: string;
  orderNumber: string;
}

export default function NewSupportTicketPage() {
  const { user, loading } = useAuth();
  const t = useTranslations('accountSupportNew');
  const tCategory = useTranslations('ticketCategory');
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
      setError(err?.response?.data?.message ?? t('genericError'));
    } finally {
      setSubmitting(false);
    }
  }

  if (!loading && !user) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">{t('signInTitle')}</h1>
        <p className="mt-2 text-gray-600">{t('signInBody')}</p>
        <Link
          href="/login?next=/account/support/new"
          className="mt-6 inline-block rounded-md bg-brand-600 px-6 py-3 font-semibold text-white"
        >
          {t('signInBtn')}
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-brand-700">{t('successTitle')}</h1>
        <p className="mt-2 text-gray-600">{t('successBody', { number: success })}</p>
        <Link href="/account/support" className="mt-6 inline-block text-brand-700 hover:underline">
          {t('viewMyTickets')}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
      <p className="mt-2 text-sm text-gray-600">{t('intro')}</p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="ticket-subject" className="text-sm font-semibold text-gray-700">
            {t('subjectLabel')}
          </label>
          <input
            id="ticket-subject"
            required
            placeholder={t('subjectPlaceholder')}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="ticket-category" className="text-sm font-semibold text-gray-700">
            {t('categoryLabel')}
          </label>
          <select
            id="ticket-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {tCategory(c)}
              </option>
            ))}
          </select>
        </div>

        {orders.length > 0 && (
          <div>
            <label htmlFor="ticket-order" className="text-sm font-semibold text-gray-700">
              {t('relatedOrderLabel')}
            </label>
            <select
              id="ticket-order"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="">{t('noneOption')}</option>
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
            {t('messageLabel')}
          </label>
          <textarea
            id="ticket-message"
            required
            placeholder={t('messagePlaceholder')}
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
          {submitting ? t('submitting') : t('submit')}
        </button>
      </form>
    </div>
  );
}
