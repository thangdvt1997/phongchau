'use client';

import { useState } from 'react';
import Image from 'next/image';
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
      <Image
        src="/logo-full.png"
        alt="Phong Chau"
        width={200}
        height={80}
        className="mx-auto h-20 w-auto"
      />
      <h1 className="mt-6 text-2xl font-bold text-gray-900">Become a Wholesale / B2B Partner</h1>
      <p className="mt-2 text-sm text-gray-600">
        Distributors, wholesalers, supermarkets, restaurants, factories, and importers can apply
        for wholesale pricing, MOQ terms, and contract pricing. Your account will be reviewed by
        our sales team before wholesale pricing is unlocked.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="b2b-company-name" className="text-sm font-medium text-gray-700">
            Company name
          </label>
          <input
            id="b2b-company-name"
            required
            placeholder="Company name"
            value={form.companyName}
            onChange={(e) => update('companyName', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="b2b-tax-id" className="text-sm font-medium text-gray-700">
            Tax ID
          </label>
          <input
            id="b2b-tax-id"
            required
            placeholder="Tax ID"
            value={form.taxId}
            onChange={(e) => update('taxId', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="b2b-country" className="text-sm font-medium text-gray-700">
            Country
          </label>
          <input
            id="b2b-country"
            required
            placeholder="Country"
            value={form.country}
            onChange={(e) => update('country', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="b2b-business-type" className="text-sm font-medium text-gray-700">
            Business type
          </label>
          <select
            id="b2b-business-type"
            value={form.businessType}
            onChange={(e) => update('businessType', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          >
            {BUSINESS_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="b2b-expected-volume" className="text-sm font-medium text-gray-700">
            Expected purchase volume
          </label>
          <input
            id="b2b-expected-volume"
            placeholder="Expected purchase volume"
            value={form.expectedVolume}
            onChange={(e) => update('expectedVolume', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="b2b-interested-products" className="text-sm font-medium text-gray-700">
            Interested products
          </label>
          <input
            id="b2b-interested-products"
            placeholder="Interested products"
            value={form.interestedProducts}
            onChange={(e) => update('interestedProducts', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="b2b-website" className="text-sm font-medium text-gray-700">
            Website (optional)
          </label>
          <input
            id="b2b-website"
            placeholder="Website (optional)"
            value={form.website}
            onChange={(e) => update('website', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <hr />
        <div>
          <label htmlFor="b2b-contact-person" className="text-sm font-medium text-gray-700">
            Contact person
          </label>
          <input
            id="b2b-contact-person"
            required
            placeholder="Contact person"
            value={form.contactPerson}
            onChange={(e) => update('contactPerson', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="b2b-phone" className="text-sm font-medium text-gray-700">
            Phone
          </label>
          <input
            id="b2b-phone"
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="b2b-email" className="text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="b2b-email"
            type="email"
            required
            placeholder="Email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="b2b-password" className="text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="b2b-password"
            type="password"
            required
            minLength={8}
            placeholder="Password (min 8 characters)"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
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
