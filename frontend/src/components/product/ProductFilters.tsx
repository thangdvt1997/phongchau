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
        <label htmlFor="product-search" className="text-sm font-semibold text-gray-700">
          Search
        </label>
        <input
          id="product-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Product name, SKU..."
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </form>

      <div>
        <p className="text-sm font-semibold text-gray-700">Category</p>
        <div className="mt-2 space-y-1">
          <button
            onClick={() => updateParam('categorySlug', null)}
            className={`block w-full rounded-md px-2.5 py-1.5 text-left text-sm transition ${
              !searchParams.get('categorySlug')
                ? 'bg-brand-50 font-medium text-brand-700'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            All Categories
          </button>
          {flatCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => updateParam('categorySlug', cat.slug)}
              className={`block w-full rounded-md px-2.5 py-1.5 text-left text-sm transition ${
                searchParams.get('categorySlug') === cat.slug
                  ? 'bg-brand-50 font-medium text-brand-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 border-t border-gray-100 pt-5">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={searchParams.get('isOrganic') === 'true'}
            onChange={(e) => updateParam('isOrganic', e.target.checked ? 'true' : null)}
            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          Organic only
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={searchParams.get('inStock') === 'true'}
            onChange={(e) => updateParam('inStock', e.target.checked ? 'true' : null)}
            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          In stock only
        </label>
      </div>

      <div className="border-t border-gray-100 pt-5">
        <label htmlFor="product-sort" className="text-sm font-semibold text-gray-700">
          Sort by
        </label>
        <select
          id="product-sort"
          value={searchParams.get('sort') ?? 'newest'}
          onChange={(e) => updateParam('sort', e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
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
