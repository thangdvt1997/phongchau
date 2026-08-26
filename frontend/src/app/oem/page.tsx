'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api-client';

export default function OemPage() {
  const { user, loading } = useAuth();
  const [form, setForm] = useState({
    productType: '',
    ingredients: '',
    recipe: '',
    targetMarket: '',
    packageType: '',
    packageSize: '',
    brandName: '',
    isPrivateLabel: false,
    estimatedQuantity: '',
    certificationRequirement: '',
    targetPrice: '',
    destinationCountry: '',
    attachmentUrl: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function update(key: string, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { data: oemRequest } = await apiClient.post('/oem', {
        productType: form.productType,
        ingredients: form.ingredients || undefined,
        recipe: form.recipe || undefined,
        targetMarket: form.targetMarket || undefined,
        packageType: form.packageType || undefined,
        packageSize: form.packageSize || undefined,
        brandName: form.brandName || undefined,
        isPrivateLabel: form.isPrivateLabel,
        estimatedQuantity: form.estimatedQuantity || undefined,
        certificationRequirement: form.certificationRequirement || undefined,
        targetPrice: form.targetPrice || undefined,
        destinationCountry: form.destinationCountry || undefined,
        attachmentUrl: form.attachmentUrl || undefined,
      });
      setSuccess(oemRequest.requestNumber);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to submit OEM/ODM request.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!loading && !user) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Sign in to request OEM/ODM production</h1>
        <p className="mt-2 text-gray-600">OEM/ODM requests are tracked against your account.</p>
        <Link
          href={`/login?next=/oem`}
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
        <h1 className="text-2xl font-bold text-brand-700">Request Submitted</h1>
        <p className="mt-2 text-gray-600">
          Your OEM/ODM request <span className="font-semibold">{success}</span> has been sent to
          our sales team. We will review it and get back to you.
        </p>
        <Link href="/account" className="mt-6 inline-block text-brand-700 hover:underline">
          View my OEM/ODM Requests
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900">OEM / Private Label Request</h1>
      <p className="mt-2 text-sm text-gray-600">
        Tell us about the product you want manufactured under your own brand — recipe, packaging,
        target market, and quantity — and our team will guide you through review, sampling, and
        pricing.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="oem-product-type" className="text-sm font-semibold text-gray-700">
            Product type
          </label>
          <input
            id="oem-product-type"
            required
            placeholder="e.g. Roasted cashew nuts, Instant coffee 3-in-1..."
            value={form.productType}
            onChange={(e) => update('productType', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="oem-ingredients" className="text-sm font-semibold text-gray-700">
            Ingredients
          </label>
          <input
            id="oem-ingredients"
            placeholder="Ingredients"
            value={form.ingredients}
            onChange={(e) => update('ingredients', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="oem-recipe" className="text-sm font-semibold text-gray-700">
            Recipe / formulation notes
          </label>
          <textarea
            id="oem-recipe"
            placeholder="Recipe / formulation notes"
            value={form.recipe}
            onChange={(e) => update('recipe', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="oem-target-market" className="text-sm font-semibold text-gray-700">
              Target market
            </label>
            <input
              id="oem-target-market"
              placeholder="e.g. EU, USA, Middle East..."
              value={form.targetMarket}
              onChange={(e) => update('targetMarket', e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="oem-destination-country" className="text-sm font-semibold text-gray-700">
              Destination country
            </label>
            <input
              id="oem-destination-country"
              placeholder="Destination country"
              value={form.destinationCountry}
              onChange={(e) => update('destinationCountry', e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="oem-package-type" className="text-sm font-semibold text-gray-700">
              Package type
            </label>
            <input
              id="oem-package-type"
              placeholder="e.g. Pouch, Jar, Carton..."
              value={form.packageType}
              onChange={(e) => update('packageType', e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="oem-package-size" className="text-sm font-semibold text-gray-700">
              Package size
            </label>
            <input
              id="oem-package-size"
              placeholder="e.g. 250g, 500g..."
              value={form.packageSize}
              onChange={(e) => update('packageSize', e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label htmlFor="oem-brand-name" className="text-sm font-semibold text-gray-700">
            Brand name
          </label>
          <input
            id="oem-brand-name"
            placeholder="Your brand name"
            value={form.brandName}
            onChange={(e) => update('brandName', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="oem-is-private-label"
            type="checkbox"
            checked={form.isPrivateLabel}
            onChange={(e) => update('isPrivateLabel', e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="oem-is-private-label" className="text-sm font-medium text-gray-700">
            This is a private-label product (packaged under my own brand)
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="oem-estimated-quantity" className="text-sm font-semibold text-gray-700">
              Estimated quantity
            </label>
            <input
              id="oem-estimated-quantity"
              placeholder="e.g. 5,000 units / month"
              value={form.estimatedQuantity}
              onChange={(e) => update('estimatedQuantity', e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="oem-target-price" className="text-sm font-semibold text-gray-700">
              Target price
            </label>
            <input
              id="oem-target-price"
              placeholder="e.g. USD 2.50 / unit"
              value={form.targetPrice}
              onChange={(e) => update('targetPrice', e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label htmlFor="oem-certification-requirement" className="text-sm font-semibold text-gray-700">
            Certification requirements
          </label>
          <input
            id="oem-certification-requirement"
            placeholder="e.g. FDA, HACCP, Organic, Halal..."
            value={form.certificationRequirement}
            onChange={(e) => update('certificationRequirement', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="oem-attachment-url" className="text-sm font-semibold text-gray-700">
            Attachment URL
          </label>
          <input
            id="oem-attachment-url"
            placeholder="Link to spec sheet, artwork, or label design"
            value={form.attachmentUrl}
            onChange={(e) => update('attachmentUrl', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !form.productType}
          className="w-full rounded-md bg-brand-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>
    </div>
  );
}
