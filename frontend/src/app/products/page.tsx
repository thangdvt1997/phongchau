import Link from 'next/link';
import { serverFetch } from '@/lib/server-api';
import { Category, Paginated, ProductListItem } from '@/lib/types';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductFilters } from '@/components/product/ProductFilters';

export const metadata = { title: 'Products' };

const ALLOWED_PARAMS = [
  'page',
  'pageSize',
  'categorySlug',
  'originId',
  'certificationId',
  'brandId',
  'priceMin',
  'priceMax',
  'packaging',
  'moq',
  'grade',
  'isOrganic',
  'isFeatured',
  'inStock',
  'q',
  'sort',
];

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const query = new URLSearchParams();
  for (const key of ALLOWED_PARAMS) {
    if (searchParams[key]) query.set(key, searchParams[key] as string);
  }

  const [result, categories] = await Promise.all([
    serverFetch<Paginated<ProductListItem>>(`/catalog/products?${query.toString()}`, {
      cache: 'no-store',
    }),
    serverFetch<Category[]>('/catalog/categories'),
  ]);

  const items = result?.items ?? [];
  const total = result?.total ?? 0;
  const page = result?.page ?? 1;
  const pageSize = result?.pageSize ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900">Products</h1>
      <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-4">
        <aside className="md:col-span-1">
          <ProductFilters categories={categories ?? []} />
        </aside>
        <div className="md:col-span-3">
          {items.length === 0 ? (
            <p className="text-gray-500">No products match these filters.</p>
          ) : (
            <div className="grid grid-cols-2 gap-6 lg:grid-cols-3">
              {items.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                const params = new URLSearchParams(query);
                params.set('page', String(p));
                return (
                  <Link
                    key={p}
                    href={`/products?${params.toString()}`}
                    className={`rounded-md px-3 py-1.5 text-sm ${
                      p === page ? 'bg-brand-600 text-white' : 'border border-gray-300 text-gray-700'
                    }`}
                  >
                    {p}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
