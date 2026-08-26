import Link from 'next/link';
import { ProductListItem } from '@/lib/types';
import { ProductCard } from '@/components/product/ProductCard';

export function FeaturedProducts({ products }: { products: ProductListItem[] }) {
  if (products.length === 0) return null;
  return (
    <section className="bg-gray-50 py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="section-eyebrow">Best Selling</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">Featured Products</h2>
          </div>
          <Link
            href="/products"
            className="text-sm font-semibold text-brand-700 hover:text-brand-800 hover:underline"
          >
            View all products &rarr;
          </Link>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}
