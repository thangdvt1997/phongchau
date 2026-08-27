'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api-client';
import { formatMoney } from '@/lib/format';

interface ShipmentTrack {
  status: string;
  createdAt: string;
  location?: string | null;
  note?: string | null;
}

interface OrderTrackResult {
  orderNumber: string;
  status: string;
  grandTotal: number;
  currency: string;
  statusHistory: { status: string; createdAt: string; note?: string | null }[];
  shipments: { trackingNumber: string | null; carrier: string | null; tracking: ShipmentTrack[] }[];
}

export default function TrackOrderPage() {
  const t = useTranslations('track');
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [result, setResult] = useState<OrderTrackResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get(`/orders/track/${orderNumber}`, { params: { email } });
      setResult(data);
    } catch {
      setError(t('notFoundError'));
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
      <form onSubmit={handleSubmit} className="mt-6 flex gap-3">
        <div className="flex-1">
          <label htmlFor="track-order-number" className="text-sm font-medium text-gray-700">
            {t('orderNumberLabel')}
          </label>
          <input
            id="track-order-number"
            required
            placeholder={t('orderNumberPlaceholder')}
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="track-email" className="text-sm font-medium text-gray-700">
            {t('emailLabel')}
          </label>
          <input
            id="track-email"
            placeholder={t('emailLabel')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="self-end rounded-md bg-brand-600 px-5 py-2 font-semibold text-white"
        >
          {t('trackBtn')}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {result && (
        <div className="mt-8 rounded-lg border border-gray-200 p-6">
          <p className="font-semibold">
            {t('orderSummary', {
              orderNumber: result.orderNumber,
              amount: formatMoney(result.grandTotal, result.currency),
            })}
          </p>
          <ol className="mt-4 space-y-3 border-l-2 border-brand-200 pl-4">
            {result.statusHistory.map((h, idx) => (
              <li key={idx} className="text-sm">
                <p className="font-medium text-gray-800">{h.status}</p>
                <p className="text-xs text-gray-400">{new Date(h.createdAt).toLocaleString()}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
