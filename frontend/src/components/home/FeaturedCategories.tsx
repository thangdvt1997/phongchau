import Link from 'next/link';
import Image from 'next/image';
import { Category } from '@/lib/types';

export function FeaturedCategories({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <h2 className="text-2xl font-bold text-gray-900">Shop by Category</h2>
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
        {categories.slice(0, 6).map((cat) => (
          <Link
            key={cat.id}
            href={`/products?categorySlug=${cat.slug}`}
            className="group flex flex-col items-center gap-3 rounded-lg border border-gray-200 p-4 text-center transition hover:shadow-md"
          >
            <div className="relative h-20 w-20 overflow-hidden rounded-full bg-brand-50">
              <Image
                src={cat.imageUrl ?? '/placeholder-product.svg'}
                alt={cat.name}
                fill
                sizes="80px"
                className="object-cover"
              />
            </div>
            <span className="font-medium text-gray-800 group-hover:text-brand-700">{cat.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
