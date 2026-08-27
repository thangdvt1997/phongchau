import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { ProductListItem } from '@/lib/types';
import { ProductCard } from '@/components/product/ProductCard';

export async function FeaturedProducts({ products }: { products: ProductListItem[] }) {
  if (products.length === 0) return null;
  const t = await getTranslations('home.featuredProducts');
  return (
    <section className="bg-gray-50 py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="section-eyebrow">{t('eyebrow')}</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">{t('title')}</h2>
          </div>
          <Link
            href="/products"
            className="text-sm font-semibold text-brand-700 hover:text-brand-800 hover:underline"
          >
            {t('viewAll')}
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
