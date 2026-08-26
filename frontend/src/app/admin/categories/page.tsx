'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

type Tab = 'categories' | 'brands' | 'origins' | 'certifications';

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  description: string | null;
  imageUrl: string | null;
}

interface BrandRow {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
}

interface OriginRow {
  id: string;
  name: string;
  country: string;
  province: string | null;
  farmName: string | null;
}

interface CertificationRow {
  id: string;
  name: string;
  code: string;
  description: string | null;
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'categories', label: 'Categories' },
  { key: 'brands', label: 'Brands' },
  { key: 'origins', label: 'Origins' },
  { key: 'certifications', label: 'Certifications' },
];

function inputCls() {
  return 'rounded-md border border-gray-300 px-3 py-2 text-sm';
}

function extractErrorMessage(err: any, fallback: string): string {
  const message = err?.response?.data?.message;
  if (Array.isArray(message)) return message.join(' ');
  return message ?? fallback;
}

export default function AdminCategoriesPage() {
  const [tab, setTab] = useState<Tab>('categories');

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Catalog Lookups</h1>
      <div className="mt-6 flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium ${
              tab === t.key
                ? 'border-b-2 border-brand-600 text-brand-700'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {tab === 'categories' && <CategoriesTab />}
        {tab === 'brands' && <BrandsTab />}
        {tab === 'origins' && <OriginsTab />}
        {tab === 'certifications' && <CertificationsTab />}
      </div>
    </div>
  );
}

function CategoriesTab() {
  const [items, setItems] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', parentId: '', description: '', imageUrl: '' });
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setLoading(true);
    apiClient
      .get('/admin/catalog/categories')
      .then(({ data }) => setItems(data))
      .catch((err) => setError(extractErrorMessage(err, 'Failed to load categories.')))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/admin/catalog/categories', {
        name: form.name,
        slug: form.slug || undefined,
        parentId: form.parentId || undefined,
        description: form.description || undefined,
        imageUrl: form.imageUrl || undefined,
      });
      setForm({ name: '', slug: '', parentId: '', description: '', imageUrl: '' });
      load();
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to create category.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      await apiClient.delete(`/admin/catalog/categories/${id}`);
      load();
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to delete category.'));
    }
  }

  const nameById = new Map(items.map((c) => [c.id, c.name]));

  return (
    <div>
      <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3 rounded-md border border-gray-200 p-4">
        <input
          aria-label="Category name"
          required
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className={inputCls()}
        />
        <input
          aria-label="Category slug (optional)"
          placeholder="Slug (optional)"
          value={form.slug}
          onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
          className={inputCls()}
        />
        <select
          aria-label="Parent category"
          value={form.parentId}
          onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
          className={inputCls()}
        >
          <option value="">No parent</option>
          {items.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          aria-label="Category description"
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          className={inputCls()}
        />
        <input
          aria-label="Category image URL"
          placeholder="Image URL"
          value={form.imageUrl}
          onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
          className={inputCls()}
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Add Category
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="mt-4 text-sm text-gray-500">Loading categories...</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">No categories yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-md border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Slug</th>
                <th className="px-4 py-2 font-medium">Parent</th>
                <th className="px-4 py-2 font-medium">Description</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-2 font-medium text-gray-800">{c.name}</td>
                  <td className="px-4 py-2 text-gray-600">{c.slug}</td>
                  <td className="px-4 py-2 text-gray-600">{c.parentId ? nameById.get(c.parentId) ?? '—' : '—'}</td>
                  <td className="px-4 py-2 text-gray-600">{c.description ?? '—'}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => handleDelete(c.id)} className="font-medium text-red-600 hover:underline">
                      Delete
                    </button>
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

function BrandsTab() {
  const [items, setItems] = useState<BrandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', logoUrl: '' });
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setLoading(true);
    apiClient
      .get('/admin/catalog/brands')
      .then(({ data }) => setItems(data))
      .catch((err) => setError(extractErrorMessage(err, 'Failed to load brands.')))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/admin/catalog/brands', {
        name: form.name,
        slug: form.slug || undefined,
        logoUrl: form.logoUrl || undefined,
      });
      setForm({ name: '', slug: '', logoUrl: '' });
      load();
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to create brand.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      await apiClient.delete(`/admin/catalog/brands/${id}`);
      load();
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to delete brand.'));
    }
  }

  return (
    <div>
      <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3 rounded-md border border-gray-200 p-4">
        <input
          aria-label="Brand name"
          required
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className={inputCls()}
        />
        <input
          aria-label="Brand slug (optional)"
          placeholder="Slug (optional)"
          value={form.slug}
          onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
          className={inputCls()}
        />
        <input
          aria-label="Brand logo URL"
          placeholder="Logo URL"
          value={form.logoUrl}
          onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
          className={inputCls()}
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Add Brand
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="mt-4 text-sm text-gray-500">Loading brands...</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">No brands yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-md border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Slug</th>
                <th className="px-4 py-2 font-medium">Logo</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-2 font-medium text-gray-800">{b.name}</td>
                  <td className="px-4 py-2 text-gray-600">{b.slug}</td>
                  <td className="px-4 py-2 text-gray-600">{b.logoUrl ?? '—'}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => handleDelete(b.id)} className="font-medium text-red-600 hover:underline">
                      Delete
                    </button>
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

function OriginsTab() {
  const [items, setItems] = useState<OriginRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', country: '', province: '', farmName: '' });
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setLoading(true);
    apiClient
      .get('/admin/catalog/origins')
      .then(({ data }) => setItems(data))
      .catch((err) => setError(extractErrorMessage(err, 'Failed to load origins.')))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/admin/catalog/origins', {
        name: form.name,
        country: form.country,
        province: form.province || undefined,
        farmName: form.farmName || undefined,
      });
      setForm({ name: '', country: '', province: '', farmName: '' });
      load();
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to create origin.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      await apiClient.delete(`/admin/catalog/origins/${id}`);
      load();
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to delete origin.'));
    }
  }

  return (
    <div>
      <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3 rounded-md border border-gray-200 p-4">
        <input
          aria-label="Origin name"
          required
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className={inputCls()}
        />
        <input
          aria-label="Origin country"
          required
          placeholder="Country"
          value={form.country}
          onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
          className={inputCls()}
        />
        <input
          aria-label="Origin province"
          placeholder="Province"
          value={form.province}
          onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))}
          className={inputCls()}
        />
        <input
          aria-label="Origin farm name"
          placeholder="Farm Name"
          value={form.farmName}
          onChange={(e) => setForm((f) => ({ ...f, farmName: e.target.value }))}
          className={inputCls()}
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Add Origin
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="mt-4 text-sm text-gray-500">Loading origins...</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">No origins yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-md border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Country</th>
                <th className="px-4 py-2 font-medium">Province</th>
                <th className="px-4 py-2 font-medium">Farm</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-2 font-medium text-gray-800">{o.name}</td>
                  <td className="px-4 py-2 text-gray-600">{o.country}</td>
                  <td className="px-4 py-2 text-gray-600">{o.province ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-600">{o.farmName ?? '—'}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => handleDelete(o.id)} className="font-medium text-red-600 hover:underline">
                      Delete
                    </button>
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

function CertificationsTab() {
  const [items, setItems] = useState<CertificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', code: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setLoading(true);
    apiClient
      .get('/admin/catalog/certifications')
      .then(({ data }) => setItems(data))
      .catch((err) => setError(extractErrorMessage(err, 'Failed to load certifications.')))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/admin/catalog/certifications', {
        name: form.name,
        code: form.code,
        description: form.description || undefined,
      });
      setForm({ name: '', code: '', description: '' });
      load();
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to create certification.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      await apiClient.delete(`/admin/catalog/certifications/${id}`);
      load();
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to delete certification.'));
    }
  }

  return (
    <div>
      <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3 rounded-md border border-gray-200 p-4">
        <input
          aria-label="Certification name"
          required
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className={inputCls()}
        />
        <input
          aria-label="Certification code"
          required
          placeholder="Code"
          value={form.code}
          onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
          className={inputCls()}
        />
        <input
          aria-label="Certification description"
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          className={inputCls()}
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Add Certification
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="mt-4 text-sm text-gray-500">Loading certifications...</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">No certifications yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-md border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Code</th>
                <th className="px-4 py-2 font-medium">Description</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-2 font-medium text-gray-800">{c.name}</td>
                  <td className="px-4 py-2 text-gray-600">{c.code}</td>
                  <td className="px-4 py-2 text-gray-600">{c.description ?? '—'}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => handleDelete(c.id)} className="font-medium text-red-600 hover:underline">
                      Delete
                    </button>
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
