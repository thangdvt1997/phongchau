'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api-client';
import { formatMoney } from '@/lib/format';
import { HeroBanner } from '@/components/marketing/HeroBanner';

const INPUT_CLASS =
  'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500';

export default function LogisticsPage() {
  const t = useTranslations('logistics');
  const [destinationCountry, setDestinationCountry] = useState('Vietnam');
  const [weightKg, setWeightKg] = useState('100');
  const [subtotal, setSubtotal] = useState('1000000');
  const [quote, setQuote] = useState<{ zone: string; method: string; cost: number; currency: string } | null>(
    null,
  );

  async function getQuote(e: React.FormEvent) {
    e.preventDefault();
    const { data } = await apiClient.get('/shipping/quote', {
      params: { destinationCountry, weightKg, subtotal },
    });
    setQuote(data);
  }

  return (
    <div>
      <HeroBanner
        image="/images/logistics/shipping-containers-dock.jpg"
        alt="Shipping containers stacked at a busy port"
        eyebrow={t('heroEyebrow')}
        size="md"
      >
        <h1 className="text-4xl font-bold md:text-5xl">{t('heroTitle')}</h1>
        <p className="mt-5 text-brand-50 md:text-lg">{t('heroBody')}</p>
      </HeroBanner>

      <div className="mx-auto max-w-4xl px-6 py-16 md:py-24">
        <form
          onSubmit={getQuote}
          className="grid grid-cols-1 gap-5 rounded-xl2 border border-gray-100 bg-white p-8 shadow-card sm:grid-cols-3"
        >
          <div>
            <label htmlFor="logistics-destination" className="text-sm font-medium text-gray-700">
              {t('destinationLabel')}
            </label>
            <input
              id="logistics-destination"
              placeholder={t('destinationLabel')}
              value={destinationCountry}
              onChange={(e) => setDestinationCountry(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="logistics-weight" className="text-sm font-medium text-gray-700">
              {t('weightLabel')}
            </label>
            <input
              id="logistics-weight"
              type="number"
              placeholder={t('weightLabel')}
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="logistics-subtotal" className="text-sm font-medium text-gray-700">
              {t('subtotalLabel')}
            </label>
            <input
              id="logistics-subtotal"
              type="number"
              placeholder={t('subtotalLabel')}
              value={subtotal}
              onChange={(e) => setSubtotal(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-4 py-3 font-semibold text-white transition hover:bg-brand-700 sm:col-span-3"
          >
            {t('getEstimate')}
          </button>
        </form>

        {quote && (
          <div className="mt-6 rounded-xl2 bg-brand-50 p-6 text-brand-800">
            <p>
              {t('zoneLabel')}: <strong>{quote.zone}</strong> — {t('methodLabel')}: <strong>{quote.method}</strong>
            </p>
            <p className="mt-1 text-2xl font-bold">{formatMoney(quote.cost, quote.currency)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
