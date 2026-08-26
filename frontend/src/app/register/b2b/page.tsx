'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

const BUSINESS_TYPES = [
  'DISTRIBUTOR',
  'WHOLESALER',
  'IMPORTER',
  'RETAILER',
  'RETAIL_CHAIN',
  'RESTAURANT',
  'FACTORY',
  'SUPERMARKET',
  'OTHER',
];

export default function RegisterB2bPage() {
  const { registerB2b } = useAuth();
  const [form, setForm] = useState({
    email: '',
    password: '',
    contactPerson: '',
    phone: '',
    companyName: '',
    taxId: '',
    country: '',
    businessType: 'DISTRIBUTOR',
    expectedVolume: '',
    interestedProducts: '',
    website: '',
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await registerB2b(form);
      setMessage(result.message);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (message) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-brand-700">Application Submitted</h1>
        <p className="mt-4 text-gray-600">{message}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-2xl font-bold text-gray-900">Become a Wholesale / B2B Partner</h1>
      <p className="mt-2 text-sm text-gray-600">
        Distributors, wholesalers, supermarkets, restaurants, factories, and importers can apply
        for wholesale pricing, MOQ terms, and contract pricing. Your account will be reviewed by
        our sales team before wholesale pricing is unlocked.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <input
          required
          placeholder="Company name"
          value={form.companyName}
          onChange={(e) => update('companyName', e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
        <input
          required
          placeholder="Tax ID"
          value={form.taxId}
          onChange={(e) => update('taxId', e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
        <input
          required
          placeholder="Country"
          value={form.country}
          onChange={(e) => update('country', e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
        <select
          value={form.businessType}
          onChange={(e) => update('businessType', e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        >
          {BUSINESS_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace('_', ' ')}
            </option>
          ))}
        </select>
        <input
          placeholder="Expected purchase volume"
          value={form.expectedVolume}
          onChange={(e) => update('expectedVolume', e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
        <input
          placeholder="Interested products"
          value={form.interestedProducts}
          onChange={(e) => update('interestedProducts', e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
        <input
          placeholder="Website (optional)"
          value={form.website}
          onChange={(e) => update('website', e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
        <hr />
        <input
          required
          placeholder="Contact person"
          value={form.contactPerson}
          onChange={(e) => update('contactPerson', e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
        <input
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => update('phone', e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
        <input
          type="email"
          required
          placeholder="Email"
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="Password (min 8 characters)"
          value={form.password}
          onChange={(e) => update('password', e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-600 px-4 py-2.5 font-semibold text-white disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Submit Application'}
        </button>
      </form>
    </div>
  );
}
