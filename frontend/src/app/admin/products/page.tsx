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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <Link
          href="/admin/products/new"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          New Product
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <input
          aria-label="Search products by name or SKU"
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          placeholder="Search by name or SKU..."
          className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <select
          aria-label="Filter by category"
          value={categoryId}
          onChange={(e) => {
            setPage(1);
            setCategoryId(e.target.value);
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="mt-6 text-sm text-gray-500">Loading products...</p>
      ) : items.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">No products yet.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-md border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">SKU</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium">Base Price</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Featured</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link href={`/admin/products/${p.id}/edit`} className="font-medium text-brand-700 hover:underline">
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-600">{p.sku}</td>
                  <td className="px-4 py-2 text-gray-600">{p.category?.name ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-600">{formatMoney(p.basePrice, p.currency)}</td>
                  <td className="px-4 py-2 text-gray-600">{p.status}</td>
                  <td className="px-4 py-2 text-gray-600">{p.isFeatured ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-md border border-gray-300 px-3 py-1.5 disabled:opacity-50"
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages} ({total} total)
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-md border border-gray-300 px-3 py-1.5 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
