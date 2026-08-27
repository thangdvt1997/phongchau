'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

interface RateRow {
  id?: string;
  targetCurrency: string;
  rate: number;
  updatedAt?: string;
}

function inputCls() {
  return 'rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500';
}

function extractErrorMessage(err: any, fallback: string): string {
  const message = err?.response?.data?.message;
  if (Array.isArray(message)) return message.join(' ');
  return message ?? fallback;
}

/**
 * Admin CRUD for ExchangeRate rows (spec section 25, P1 display-only slice). `rate` is
 * "units of target currency per 1 VND" — see the schema.prisma comment on ExchangeRate.
 * These rates only drive frontend display conversion; they never affect what a customer
 * is actually charged (Orders/Payments/Cart always settle in VND).
 */
export default function AdminCurrencyPage() {
  const [items, setItems] = useState<RateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ targetCurrency: '', rate: '' });
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setLoading(true);
    apiClient
      .get('/admin/currency/rates')
      .then(({ data }) => setItems(data))
      .catch((err) => setError(extractErrorMessage(err, 'Failed to load exchange rates.')))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleUpsert(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const code = form.targetCurrency.trim().toUpperCase();
      await apiClient.put(`/admin/currency/rates/${code}`, { rate: Number(form.rate) });
      setForm({ targetCurrency: '', rate: '' });
      load();
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to save exchange rate.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      await apiClient.delete(`/admin/currency/rates/${id}`);
      load();
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to delete exchange rate.'));
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Exchange Rates</h1>
      <p className="mt-1 text-sm text-gray-500">
        Display-only conversion rates. VND is always the base currency at rate 1 — customers still pay in VND
        regardless of what&apos;s shown here.
      </p>

      <form
        onSubmit={handleUpsert}
        className="mt-6 flex flex-wrap items-end gap-3 rounded-xl2 border border-gray-200 bg-white p-4 shadow-card"
      >
        <div>
          <label htmlFor="currency-code" className="mb-1 block text-xs font-medium text-gray-600">
            Currency code
          </label>
          <input
            id="currency-code"
            required
            maxLength={3}
            placeholder="USD"
            value={form.targetCurrency}
            onChange={(e) => setForm((f) => ({ ...f, targetCurrency: e.target.value }))}
            className={inputCls()}
          />
        </div>
        <div>
          <label htmlFor="currency-rate" className="mb-1 block text-xs font-medium text-gray-600">
            Rate (units per 1 VND)
          </label>
          <input
            id="currency-rate"
            required
            type="number"
            step="any"
            min="0"
            placeholder="0.000039"
            value={form.rate}
            onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
            className={inputCls()}
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 disabled:opacity-50"
        >
          Save Rate
        </button>
      </form>

      {error && (
        <div className="mt-4 rounded-xl2 border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-gray-500">Loading exchange rates...</p>
      ) : items.length === 0 ? (
        <div className="mt-4 rounded-xl2 border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
          No exchange rates configured.
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl2 border border-gray-200 bg-white shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-2.5">Currency</th>
                <th className="px-4 py-2.5">Rate (per 1 VND)</th>
                <th className="px-4 py-2.5">Updated</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((r) => (
                <tr key={r.targetCurrency} className="transition-colors hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-800">{r.targetCurrency}</td>
                  <td className="px-4 py-2.5 text-gray-600">{r.rate}</td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {r.updatedAt ? new Date(r.updatedAt).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {r.id ? (
                      <button
                        onClick={() => handleDelete(r.id!)}
                        className="font-medium text-rose-600 hover:text-rose-700 hover:underline"
                      >
                        Delete
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">base currency</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
