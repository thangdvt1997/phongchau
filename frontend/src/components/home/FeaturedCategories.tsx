import Link from 'next/link';
import Image from 'next/image';
import { Category } from '@/lib/types';
import { categoryImage, categoryFallbackGradient } from '@/lib/category-images';

export function FeaturedCategories({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-6 py-16 md:py-24">
      <div className="max-w-xl">
        <p className="section-eyebrow">Our Catalog</p>
        <h2 className="mt-2 text-3xl font-bold text-gray-900">Shop by Category</h2>
        <p className="mt-3 text-gray-600">
          Every category is tied to a named growing region and export-ready specification sheet.
        </p>
      </div>
      <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {categories.slice(0, 6).map((cat) => {
          const img = categoryImage(cat.slug);
          return (
            <Link
              key={cat.id}
              href={`/products?categorySlug=${cat.slug}`}
              className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-xl2 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-lifted"
            >
              {img ? (
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  sizes="(max-width: 768px) 50vw, 16vw"
                  className="object-cover transition duration-500 group-hover:scale-110"
                />
              ) : (
                <div className={`absolute inset-0 bg-gradient-to-br ${categoryFallbackGradient(cat.slug)}`} />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-brand-900/90 via-brand-900/10 to-transparent" />
              <span className="relative p-3 text-sm font-semibold text-white">{cat.name}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
