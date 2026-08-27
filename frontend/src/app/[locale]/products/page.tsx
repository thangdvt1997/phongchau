import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { serverFetch } from '@/lib/server-api';
import { Category, Paginated, ProductListItem } from '@/lib/types';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductFilters } from '@/components/product/ProductFilters';
import { categoryImage, categoryFallbackGradient } from '@/lib/category-images';

export async function generateMetadata({ params }: { params: { locale: string } }) {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: 'products' });
  return { title: t('title') };
}

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
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: Record<string, string | undefined>;
}) {
  const { locale } = params;
  setRequestLocale(locale);
  const t = await getTranslations('products');

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

  const flatCategories = (categories ?? []).flatMap((c) => [c, ...(c.children ?? [])]);
  const activeCategory = searchParams.categorySlug
    ? flatCategories.find((c) => c.slug === searchParams.categorySlug)
    : undefined;
  const bannerImg = activeCategory ? categoryImage(activeCategory.slug) : null;

  return (
    <div>
      {activeCategory ? (
        <section className="relative overflow-hidden bg-brand-800 text-white">
          <div className="absolute inset-0">
            {bannerImg ? (
              <Image src={bannerImg.src} alt={bannerImg.alt} fill sizes="100vw" className="object-cover" />
            ) : (
              <div className={`absolute inset-0 bg-gradient-to-br ${categoryFallbackGradient(activeCategory.slug)}`} />
            )}
            <div className="absolute inset-0 bg-brand-900/70" />
          </div>
          <div className="relative mx-auto max-w-7xl px-6 py-14">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-100">{t('categoryEyebrow')}</p>
            <h1 className="mt-2 text-3xl font-bold md:text-4xl">{activeCategory.name}</h1>
          </div>
        </section>
      ) : (
        <div className="mx-auto max-w-7xl px-6 pt-10">
          <p className="section-eyebrow">{t('catalogEyebrow')}</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">{t('title')}</h1>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <aside className="md:col-span-1">
            <div className="rounded-xl2 border border-gray-100 bg-white p-5 shadow-card">
              <ProductFilters categories={categories ?? []} />
            </div>
          </aside>
          <div className="md:col-span-3">
            {items.length === 0 ? (
              <p className="rounded-xl2 border border-dashed border-gray-200 py-16 text-center text-gray-500">
                {t('noProducts')}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-6 lg:grid-cols-3">
                {items.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-10 flex justify-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                  const params = new URLSearchParams(query);
                  params.set('page', String(p));
                  return (
                    <Link
                      key={p}
                      href={`/products?${params.toString()}`}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                        p === page
                          ? 'bg-brand-600 text-white shadow-card'
                          : 'border border-gray-300 text-gray-700 hover:border-brand-300 hover:text-brand-700'
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
    </div>
  );
}
