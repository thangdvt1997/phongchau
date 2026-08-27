'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
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
  const t = useTranslations('rfq');
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
          href={`/login?next=/rfq`}
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
        <Link href="/account" className="mt-6 inline-block text-brand-700 hover:underline">
          {t('viewMyRfqs')}
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
          <label htmlFor="rfq-product" className="text-sm font-semibold text-gray-700">
            {t('productLabel')}
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
              {t('quantityLabel')}
            </label>
            <input
              id="rfq-quantity"
              required
              type="number"
              min={1}
              placeholder={t('quantityLabel')}
              value={form.quantity}
              onChange={(e) => update('quantity', e.target.value)}
              className="mt-1 rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="rfq-unit" className="text-sm font-semibold text-gray-700">
              {t('unitLabel')}
            </label>
            <input
              id="rfq-unit"
              required
              placeholder={t('unitPlaceholder')}
              value={form.unit}
              onChange={(e) => update('unit', e.target.value)}
              className="mt-1 rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label htmlFor="rfq-packaging" className="text-sm font-semibold text-gray-700">
            {t('packagingLabel')}
          </label>
          <input
            id="rfq-packaging"
            placeholder={t('packagingPlaceholder')}
            value={form.packaging}
            onChange={(e) => update('packaging', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="rfq-specification" className="text-sm font-semibold text-gray-700">
            {t('specificationLabel')}
          </label>
          <input
            id="rfq-specification"
            placeholder={t('specificationLabel')}
            value={form.specification}
            onChange={(e) => update('specification', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="rfq-destination-country" className="text-sm font-semibold text-gray-700">
              {t('destinationCountryLabel')}
            </label>
            <input
              id="rfq-destination-country"
              placeholder={t('destinationCountryLabel')}
              value={form.destinationCountry}
              onChange={(e) => update('destinationCountry', e.target.value)}
              className="mt-1 rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="rfq-destination-port" className="text-sm font-semibold text-gray-700">
              {t('destinationPortLabel')}
            </label>
            <input
              id="rfq-destination-port"
              placeholder={t('destinationPortLabel')}
              value={form.destinationPort}
              onChange={(e) => update('destinationPort', e.target.value)}
              className="mt-1 rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="rfq-incoterm" className="text-sm font-semibold text-gray-700">
              {t('incotermLabel')}
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
              {t('paymentTermLabel')}
            </label>
            <input
              id="rfq-payment-term"
              placeholder={t('paymentTermPlaceholder')}
              value={form.paymentTerm}
              onChange={(e) => update('paymentTerm', e.target.value)}
              className="mt-1 rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label htmlFor="rfq-special-requirement" className="text-sm font-semibold text-gray-700">
            {t('specialRequirementLabel')}
          </label>
          <textarea
            id="rfq-special-requirement"
            placeholder={t('specialRequirementLabel')}
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
          {submitting ? t('submitting') : t('submitRfq')}
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
