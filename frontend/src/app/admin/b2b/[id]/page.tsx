'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { formatMoney } from '@/lib/format';

interface ProductOption {
  id: string;
  name: string;
  sku: string;
}

interface CompanyDetail {
  id: string;
  name: string;
  taxId: string;
  country: string;
  businessType: string;
  expectedVolume: string | null;
  interestedProducts: string | null;
  website: string | null;
  contactPerson: string;
  status: string;
  creditLimit: number | null;
  paymentTerms: string | null;
  rejectionReason: string | null;
  createdAt: string;
  users: { id: string; email: string; fullName: string }[];
}

interface PriceTier {
  id: string;
  productId: string;
  minQty: number;
  maxQty: number | null;
  price: number;
  currency: string;
}

interface CustomerPrice {
  id: string;
  companyId: string;
  productId: string;
  price: number;
  currency: string;
  validFrom: string | null;
  validTo: string | null;
}

export default function AdminB2bDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductOption[]>([]);

  const [creditLimit, setCreditLimit] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [companySubmitting, setCompanySubmitting] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [companySaved, setCompanySaved] = useState(false);

  // Price tiers are per-product (backend routes: /admin/b2b/products/:productId/price-tiers),
  // not per-company — so this section is a product-picker-then-manage-tiers flow.
  const [tierProductId, setTierProductId] = useState('');
  const [tiers, setTiers] = useState<PriceTier[] | null>(null);
  const [tierForm, setTierForm] = useState({ minQty: '', maxQty: '', price: '', currency: 'USD' });
  const [tierSubmitting, setTierSubmitting] = useState(false);
  const [tierError, setTierError] = useState<string | null>(null);

  const [customerPrices, setCustomerPrices] = useState<CustomerPrice[] | null>(null);
  const [cpForm, setCpForm] = useState({ productId: '', price: '', currency: 'USD', validFrom: '', validTo: '' });
  const [cpSubmitting, setCpSubmitting] = useState(false);
  const [cpError, setCpError] = useState<string | null>(null);

  function loadCompany() {
    apiClient
      .get(`/admin/b2b/companies/${params.id}`)
      .then(({ data }) => {
        setCompany(data);
        setCreditLimit(data.creditLimit !== null ? String(data.creditLimit) : '');
        setPaymentTerms(data.paymentTerms ?? '');
      })
      .catch((err) => setLoadError(err?.response?.data?.message ?? 'Failed to load company.'));
  }

  function loadCustomerPrices() {
    apiClient
      .get(`/admin/b2b/companies/${params.id}/customer-prices`)
      .then(({ data }) => setCustomerPrices(data))
      .catch(() => setCustomerPrices([]));
  }

  useEffect(() => {
    loadCompany();
    loadCustomerPrices();
    apiClient.get('/catalog/products', { params: { pageSize: 100 } }).then(({ data }) => {
      setProducts(data.items.map((p: any) => ({ id: p.id, name: p.name, sku: p.sku })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    if (!tierProductId) {
      setTiers(null);
      return;
    }
    setTiers(null);
    apiClient
      .get(`/admin/b2b/products/${tierProductId}/price-tiers`)
      .then(({ data }) => setTiers(data))
      .catch(() => setTiers([]));
  }, [tierProductId]);

  async function submitCompany(e: React.FormEvent) {
    e.preventDefault();
    setCompanySubmitting(true);
    setCompanyError(null);
    setCompanySaved(false);
    try {
      await apiClient.patch(`/admin/b2b/companies/${params.id}`, {
        creditLimit: creditLimit !== '' ? Number(creditLimit) : undefined,
        paymentTerms: paymentTerms || undefined,
      });
      setCompanySaved(true);
      loadCompany();
    } catch (err: any) {
      setCompanyError(err?.response?.data?.message ?? 'Failed to update company.');
    } finally {
      setCompanySubmitting(false);
    }
  }

  async function submitTier(e: React.FormEvent) {
    e.preventDefault();
    if (!tierProductId) return;
    setTierSubmitting(true);
    setTierError(null);
    try {
      await apiClient.post(`/admin/b2b/products/${tierProductId}/price-tiers`, {
        minQty: Number(tierForm.minQty),
        maxQty: tierForm.maxQty !== '' ? Number(tierForm.maxQty) : undefined,
        price: Number(tierForm.price),
        currency: tierForm.currency,
      });
      setTierForm({ minQty: '', maxQty: '', price: '', currency: tierForm.currency });
      apiClient.get(`/admin/b2b/products/${tierProductId}/price-tiers`).then(({ data }) => setTiers(data));
    } catch (err: any) {
      setTierError(err?.response?.data?.message ?? 'Failed to create price tier.');
    } finally {
      setTierSubmitting(false);
    }
  }

  async function deleteTier(tierId: string) {
    setTierError(null);
    try {
      await apiClient.delete(`/admin/b2b/price-tiers/${tierId}`);
      setTiers((ts) => (ts ? ts.filter((t) => t.id !== tierId) : ts));
    } catch (err: any) {
      setTierError(err?.response?.data?.message ?? 'Failed to delete price tier.');
    }
  }

  async function submitCustomerPrice(e: React.FormEvent) {
    e.preventDefault();
    if (!cpForm.productId) return;
    setCpSubmitting(true);
    setCpError(null);
    try {
      await apiClient.post(`/admin/b2b/companies/${params.id}/customer-prices`, {
        productId: cpForm.productId,
        price: Number(cpForm.price),
        currency: cpForm.currency,
        validFrom: cpForm.validFrom || undefined,
        validTo: cpForm.validTo || undefined,
      });
      setCpForm({ productId: '', price: '', currency: cpForm.currency, validFrom: '', validTo: '' });
      loadCustomerPrices();
    } catch (err: any) {
      setCpError(err?.response?.data?.message ?? 'Failed to save customer price.');
    } finally {
      setCpSubmitting(false);
    }
  }

  async function deleteCustomerPrice(id: string) {
    setCpError(null);
    try {
      await apiClient.delete(`/admin/b2b/customer-prices/${id}`);
      setCustomerPrices((ps) => (ps ? ps.filter((p) => p.id !== id) : ps));
    } catch (err: any) {
      setCpError(err?.response?.data?.message ?? 'Failed to delete customer price.');
    }
  }

  function productName(productId: string) {
    return products.find((p) => p.id === productId)?.name ?? productId;
  }

  if (loadError) {
    return <p className="text-sm text-red-600">{loadError}</p>;
  }
  if (!company) {
    return <p className="text-sm text-gray-500">Loading company...</p>;
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
        <button onClick={() => router.push('/admin/b2b')} className="text-sm text-gray-500 hover:underline">
          Back to companies
        </button>
      </div>

      <section className="mt-6 rounded-md border border-gray-200 p-4">
        <h2 className="font-semibold text-gray-800">Company Info</h2>
        <dl className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-700">
          <div>Tax ID: {company.taxId}</div>
          <div>Country: {company.country}</div>
          <div>Business Type: {company.businessType}</div>
          <div>Status: {company.status}</div>
          <div>Contact: {company.contactPerson}</div>
          <div>Website: {company.website ?? '—'}</div>
          <div>Expected Volume: {company.expectedVolume ?? '—'}</div>
          <div>Interested Products: {company.interestedProducts ?? '—'}</div>
          {company.rejectionReason && <div className="col-span-2">Rejection Reason: {company.rejectionReason}</div>}
        </dl>
        {company.users.length > 0 && (
          <div className="mt-3">
            <p className="text-sm font-medium text-gray-700">Users</p>
            <ul className="mt-1 text-sm text-gray-600">
              {company.users.map((u) => (
                <li key={u.id}>
                  {u.fullName} ({u.email})
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-md border border-gray-200 p-4">
        <h2 className="font-semibold text-gray-800">Credit Limit &amp; Payment Terms</h2>
        <form onSubmit={submitCompany} className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Credit Limit</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Terms</label>
            <input
              placeholder="e.g. Net 30, T/T 30/70"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={companySubmitting}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Save
          </button>
          {companySaved && <span className="text-sm text-green-600">Saved.</span>}
        </form>
        {companyError && <p className="mt-2 text-sm text-red-600">{companyError}</p>}
      </section>

      <section className="mt-6 rounded-md border border-gray-200 p-4">
        <h2 className="font-semibold text-gray-800">Product Price Tiers</h2>
        <p className="mt-1 text-xs text-gray-400">
          Price tiers apply per product across all B2B customers, not just this company. Pick a product to
          manage its volume-based pricing.
        </p>
        <select
          value={tierProductId}
          onChange={(e) => setTierProductId(e.target.value)}
          className="mt-3 rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Select a product...</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.sku})
            </option>
          ))}
        </select>

        {tierProductId && (
          <div className="mt-4">
            {tiers === null ? (
              <p className="text-sm text-gray-500">Loading tiers...</p>
            ) : tiers.length === 0 ? (
              <p className="text-sm text-gray-500">No price tiers for this product yet.</p>
            ) : (
              <table className="mt-2 w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-1">Min Qty</th>
                    <th className="py-1">Max Qty</th>
                    <th className="py-1">Price</th>
                    <th className="py-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {tiers.map((t) => (
                    <tr key={t.id} className="border-t border-gray-100">
                      <td className="py-1">{t.minQty}</td>
                      <td className="py-1">{t.maxQty ?? '∞'}</td>
                      <td className="py-1">{formatMoney(t.price, t.currency)}</td>
                      <td className="py-1 text-right">
                        <button onClick={() => deleteTier(t.id)} className="text-xs text-red-600">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <form onSubmit={submitTier} className="mt-3 flex flex-wrap items-center gap-2">
              <input
                type="number"
                min={0}
                placeholder="Min qty"
                value={tierForm.minQty}
                onChange={(e) => setTierForm((f) => ({ ...f, minQty: e.target.value }))}
                required
                className="w-24 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
              <input
                type="number"
                min={0}
                placeholder="Max qty (optional)"
                value={tierForm.maxQty}
                onChange={(e) => setTierForm((f) => ({ ...f, maxQty: e.target.value }))}
                className="w-36 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="Price"
                value={tierForm.price}
                onChange={(e) => setTierForm((f) => ({ ...f, price: e.target.value }))}
                required
                className="w-28 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
              <input
                placeholder="Currency"
                value={tierForm.currency}
                onChange={(e) => setTierForm((f) => ({ ...f, currency: e.target.value }))}
                required
                className="w-24 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
              <button
                type="submit"
                disabled={tierSubmitting}
                className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                Add Tier
              </button>
            </form>
            {tierError && <p className="mt-2 text-sm text-red-600">{tierError}</p>}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-md border border-gray-200 p-4">
        <h2 className="font-semibold text-gray-800">Customer-Specific Contract Prices</h2>
        <p className="mt-1 text-xs text-gray-400">Specific to {company.name} — overrides tier pricing for the chosen product.</p>

        {customerPrices === null ? (
          <p className="mt-3 text-sm text-gray-500">Loading contract prices...</p>
        ) : customerPrices.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No contract prices set for this company yet.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-1">Product</th>
                <th className="py-1">Price</th>
                <th className="py-1">Valid From</th>
                <th className="py-1">Valid To</th>
                <th className="py-1"></th>
              </tr>
            </thead>
            <tbody>
              {customerPrices.map((cp) => (
                <tr key={cp.id} className="border-t border-gray-100">
                  <td className="py-1">{productName(cp.productId)}</td>
                  <td className="py-1">{formatMoney(cp.price, cp.currency)}</td>
                  <td className="py-1">{cp.validFrom ? new Date(cp.validFrom).toLocaleDateString() : '—'}</td>
                  <td className="py-1">{cp.validTo ? new Date(cp.validTo).toLocaleDateString() : '—'}</td>
                  <td className="py-1 text-right">
                    <button onClick={() => deleteCustomerPrice(cp.id)} className="text-xs text-red-600">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <form onSubmit={submitCustomerPrice} className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={cpForm.productId}
            onChange={(e) => setCpForm((f) => ({ ...f, productId: e.target.value }))}
            required
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="">Select product</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            step="0.01"
            placeholder="Price"
            value={cpForm.price}
            onChange={(e) => setCpForm((f) => ({ ...f, price: e.target.value }))}
            required
            className="w-28 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
          <input
            placeholder="Currency"
            value={cpForm.currency}
            onChange={(e) => setCpForm((f) => ({ ...f, currency: e.target.value }))}
            required
            className="w-24 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
          <input
            type="date"
            value={cpForm.validFrom}
            onChange={(e) => setCpForm((f) => ({ ...f, validFrom: e.target.value }))}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
          <input
            type="date"
            value={cpForm.validTo}
            onChange={(e) => setCpForm((f) => ({ ...f, validTo: e.target.value }))}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
          <button
            type="submit"
            disabled={cpSubmitting}
            className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Save Price
          </button>
        </form>
        {cpError && <p className="mt-2 text-sm text-red-600">{cpError}</p>}
      </section>
    </div>
  );
}
