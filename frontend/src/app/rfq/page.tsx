'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api-client';

interface ProductOption {
  id: string;
  name: string;
  slug: string;
}

// useSearchParams() requires a Suspense boundary during static prerendering — see RfqPage below.
function RfqPageContent() {
  const { user, loading } = useAuth();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productId, setProductId] = useState('');
  const [form, setForm] = useState({
    specification: '',
    quantity: '',
    unit: 'kg',
    packaging: '',
    destinationCountry: '',
    destinationPort: '',
    incoterm: 'FOB',
    paymentTerm: '',
    specialRequirement: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get('/catalog/products', { params: { pageSize: 100 } }).then(({ data }) => {
      const items = data.items.map((p: any) => ({ id: p.id, name: p.name, slug: p.slug }));
      setProducts(items);
      const preselectSlug = searchParams.get('productSlug');
      const preselected = items.find((p: ProductOption) => p.slug === preselectSlug);
      if (preselected) setProductId(preselected.id);
      else if (items[0]) setProductId(items[0].id);
    });
  }, [searchParams]);

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { data: rfq } = await apiClient.post('/rfq', {
        items: [
          {
            productId,
            specification: form.specification || undefined,
            quantity: Number(form.quantity),
            unit: form.unit,
            packaging: form.packaging || undefined,
          },
        ],
        destinationCountry: form.destinationCountry || undefined,
        destinationPort: form.destinationPort || undefined,
        incoterm: form.incoterm || undefined,
        paymentTerm: form.paymentTerm || undefined,
        specialRequirement: form.specialRequirement || undefined,
      });
      await apiClient.post(`/rfq/${rfq.id}/submit`);
      setSuccess(rfq.rfqNumber);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to submit RFQ.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!loading && !user) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Sign in to request a quote</h1>
        <p className="mt-2 text-gray-600">RFQs are tracked against your account.</p>
        <Link
          href={`/login?next=/rfq`}
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
        <h1 className="text-2xl font-bold text-brand-700">RFQ Submitted</h1>
        <p className="mt-2 text-gray-600">
          Your request <span className="font-semibold">{success}</span> has been sent to our sales
          team. We will respond with a quotation shortly.
        </p>
        <Link href="/account" className="mt-6 inline-block text-brand-700 hover:underline">
          View my RFQs
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900">Request for Quotation (RFQ)</h1>
      <p className="mt-2 text-sm text-gray-600">
        Tell us what you need — product, quantity, destination, and Incoterm — and our sales team
        will send a formal quotation.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="rfq-product" className="text-sm font-semibold text-gray-700">
            Product
          </label>
          <select
            id="rfq-product"
            required
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="rfq-quantity" className="text-sm font-semibold text-gray-700">
              Quantity
            </label>
            <input
              id="rfq-quantity"
              required
              type="number"
              min={1}
              placeholder="Quantity"
              value={form.quantity}
              onChange={(e) => update('quantity', e.target.value)}
              className="mt-1 rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="rfq-unit" className="text-sm font-semibold text-gray-700">
              Unit
            </label>
            <input
              id="rfq-unit"
              required
              placeholder="Unit (kg, tonne, container...)"
              value={form.unit}
              onChange={(e) => update('unit', e.target.value)}
              className="mt-1 rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label htmlFor="rfq-packaging" className="text-sm font-semibold text-gray-700">
            Packaging
          </label>
          <input
            id="rfq-packaging"
            placeholder="Packaging (e.g. Vacuum bag 25kg)"
            value={form.packaging}
            onChange={(e) => update('packaging', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="rfq-specification" className="text-sm font-semibold text-gray-700">
            Specification / grade requirements
          </label>
          <input
            id="rfq-specification"
            placeholder="Specification / grade requirements"
            value={form.specification}
            onChange={(e) => update('specification', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="rfq-destination-country" className="text-sm font-semibold text-gray-700">
              Destination country
            </label>
            <input
              id="rfq-destination-country"
              placeholder="Destination country"
              value={form.destinationCountry}
              onChange={(e) => update('destinationCountry', e.target.value)}
              className="mt-1 rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="rfq-destination-port" className="text-sm font-semibold text-gray-700">
              Destination port
            </label>
            <input
              id="rfq-destination-port"
              placeholder="Destination port"
              value={form.destinationPort}
              onChange={(e) => update('destinationPort', e.target.value)}
              className="mt-1 rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="rfq-incoterm" className="text-sm font-semibold text-gray-700">
              Incoterm
            </label>
            <select
              id="rfq-incoterm"
              value={form.incoterm}
              onChange={(e) => update('incoterm', e.target.value)}
              className="mt-1 rounded-md border border-gray-300 px-3 py-2"
            >
              {['EXW', 'FOB', 'CIF', 'CFR', 'DDP'].map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="rfq-payment-term" className="text-sm font-semibold text-gray-700">
              Payment term
            </label>
            <input
              id="rfq-payment-term"
              placeholder="Payment term (e.g. T/T 30/70)"
              value={form.paymentTerm}
              onChange={(e) => update('paymentTerm', e.target.value)}
              className="mt-1 rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label htmlFor="rfq-special-requirement" className="text-sm font-semibold text-gray-700">
            Special requirements
          </label>
          <textarea
            id="rfq-special-requirement"
            placeholder="Special requirements"
            value={form.specialRequirement}
            onChange={(e) => update('specialRequirement', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            rows={3}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !productId}
          className="w-full rounded-md bg-brand-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Submit RFQ'}
        </button>
      </form>
    </div>
  );
}

export default function RfqPage() {
  return (
    <Suspense fallback={null}>
      <RfqPageContent />
    </Suspense>
  );
}
