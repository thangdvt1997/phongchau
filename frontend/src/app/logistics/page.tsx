'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { formatMoney } from '@/lib/format';

export default function LogisticsPage() {
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
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-3xl font-bold text-gray-900">Logistics &amp; Export</h1>
      <p className="mt-4 text-gray-600">
        Domestic delivery across Vietnam and international export via FCL/LCL to ASEAN, Asia,
        Europe, and North America. Get an instant shipping estimate below, or submit an RFQ for a
        formal freight quote on large export shipments.
      </p>

      <form onSubmit={getQuote} className="mt-8 grid grid-cols-1 gap-4 rounded-lg border border-gray-200 p-6 sm:grid-cols-3">
        <div>
          <label htmlFor="logistics-destination" className="text-sm font-medium text-gray-700">
            Destination country
          </label>
          <input
            id="logistics-destination"
            placeholder="Destination country"
            value={destinationCountry}
            onChange={(e) => setDestinationCountry(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="logistics-weight" className="text-sm font-medium text-gray-700">
            Weight (kg)
          </label>
          <input
            id="logistics-weight"
            type="number"
            placeholder="Weight (kg)"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="logistics-subtotal" className="text-sm font-medium text-gray-700">
            Order subtotal
          </label>
          <input
            id="logistics-subtotal"
            type="number"
            placeholder="Order subtotal"
            value={subtotal}
            onChange={(e) => setSubtotal(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <button type="submit" className="sm:col-span-3 rounded-md bg-brand-600 px-4 py-2.5 font-semibold text-white">
          Get Shipping Estimate
        </button>
      </form>

      {quote && (
        <div className="mt-6 rounded-lg bg-brand-50 p-6 text-brand-800">
          <p>
            Zone: <strong>{quote.zone}</strong> — Method: <strong>{quote.method}</strong>
          </p>
          <p className="mt-1 text-lg font-bold">{formatMoney(quote.cost, quote.currency)}</p>
        </div>
      )}
    </div>
  );
}
