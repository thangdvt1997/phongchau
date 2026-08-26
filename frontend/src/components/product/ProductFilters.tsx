'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Category } from '@/lib/types';

export function ProductFilters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') ?? '');

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page');
    router.push(`/products?${params.toString()}`);
  }

  const flatCategories = categories.flatMap((c) => [c, ...(c.children ?? [])]);

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateParam('q', q || null);
        }}
      >
        <label className="text-sm font-semibold text-gray-700">Search</label>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Product name, SKU..."
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </form>

      <div>
        <p className="text-sm font-semibold text-gray-700">Category</p>
        <div className="mt-2 space-y-1">
          <button
            onClick={() => updateParam('categorySlug', null)}
            className={`block w-full rounded px-2 py-1 text-left text-sm ${
              !searchParams.get('categorySlug') ? 'bg-brand-50 text-brand-700' : 'text-gray-600'
            }`}
          >
            All Categories
          </button>
          {flatCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => updateParam('categorySlug', cat.slug)}
              className={`block w-full rounded px-2 py-1 text-left text-sm ${
                searchParams.get('categorySlug') === cat.slug
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={searchParams.get('isOrganic') === 'true'}
            onChange={(e) => updateParam('isOrganic', e.target.checked ? 'true' : null)}
          />
          Organic only
        </label>
        <label className="mt-2 flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={searchParams.get('inStock') === 'true'}
            onChange={(e) => updateParam('inStock', e.target.checked ? 'true' : null)}
          />
          In stock only
        </label>
      </div>

      <div>
        <label className="text-sm font-semibold text-gray-700">Sort by</label>
        <select
          value={searchParams.get('sort') ?? 'newest'}
          onChange={(e) => updateParam('sort', e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="newest">Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="popular">Best Selling</option>
        </select>
      </div>
    </div>
  );
}
