'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { formatMoney } from '@/lib/format';

interface AdminProductListItem {
  id: string;
  sku: string;
  name: string;
  basePrice: number;
  currency: string;
  status: string;
  isFeatured: boolean;
  category: { name: string } | null;
  brand: { name: string } | null;
}

interface CategoryOption {
  id: string;
  name: string;
}

const PAGE_SIZE = 20;

export default function AdminProductsPage() {
  const [items, setItems] = useState<AdminProductListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get('/admin/catalog/categories')
      .then(({ data }) => setCategories(data))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setLoading(true);
    apiClient
      .get('/admin/catalog/products', {
        params: {
          page,
          pageSize: PAGE_SIZE,
          q: q || undefined,
          categoryId: categoryId || undefined,
        },
      })
      .then(({ data }) => {
        setItems(data.items);
        setTotal(data.total);
      })
      .catch((err) => setError(err?.response?.data?.message ?? 'Failed to load products.'))
      .finally(() => setLoading(false));
  }, [page, q, categoryId]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products/import"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Import Products
          </Link>
          <Link
            href="/admin/products/new"
            className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700"
          >
            New Product
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          aria-label="Search products by name or SKU"
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          placeholder="Search by name or SKU..."
          className="w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        <select
          aria-label="Filter by category"
          value={categoryId}
          onChange={(e) => {
            setPage(1);
            setCategoryId(e.target.value);
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mt-4 rounded-xl2 border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-gray-500">Loading products...</p>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-xl2 border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
          No products yet.
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl2 border border-gray-200 bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-2.5">Name</th>
                  <th className="px-4 py-2.5">SKU</th>
                  <th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5">Base Price</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Featured</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <Link href={`/admin/products/${p.id}/edit`} className="font-medium text-teal-700 hover:text-teal-800 hover:underline">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{p.sku}</td>
                    <td className="px-4 py-2.5 text-gray-600">{p.category?.name ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{formatMoney(p.basePrice, p.currency)}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{p.isFeatured ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages} ({total} total)
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
