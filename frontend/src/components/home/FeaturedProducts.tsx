import Link from 'next/link';
import { ProductListItem } from '@/lib/types';
import { ProductCard } from '@/components/product/ProductCard';

export function FeaturedProducts({ products }: { products: ProductListItem[] }) {
  if (products.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Featured Products</h2>
        <Link href="/products" className="text-sm font-medium text-brand-700 hover:underline">
          View all products &rarr;
        </Link>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
