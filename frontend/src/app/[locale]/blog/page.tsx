import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { serverFetch } from '@/lib/server-api';
import { Paginated } from '@/lib/types';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: { locale: string } }) {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: 'blog' });
  return { title: t('title') };
}

interface BlogListItem {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  publishedAt: string | null;
}

// coverImageUrl isn't populated in seed data — fall back to an illustrative photo keyed by
// the post's CMS category so cards never look empty. Self-hosted, see frontend/public/images.
const CATEGORY_FALLBACK_IMAGE: Record<string, string> = {
  EXPORT_GUIDE: '/images/logistics/shipping-containers-dock.jpg',
  MARKET_REPORT: '/images/categories/pepper.jpg',
  COMPANY_NEWS: '/images/facility/quality-control-lab.jpg',
};
const DEFAULT_FALLBACK_IMAGE = '/images/facility/processing-floor.jpg';

export default async function BlogListPage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  setRequestLocale(locale);
  const t = await getTranslations('blog');
  const result = await serverFetch<Paginated<BlogListItem>>('/cms/blogs?pageSize=20');
  const items = result?.items ?? [];

  return (
    <div className="mx-auto max-w-5xl px-6 py-16 md:py-24">
      <p className="section-eyebrow">{t('eyebrow')}</p>
      <h1 className="mt-2 text-3xl font-bold text-gray-900">{t('title')}</h1>
      <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2">
        {items.map((post) => (
          <Link
            key={post.id}
            href={`/blog/${post.slug}`}
            className="group overflow-hidden rounded-xl2 border border-gray-100 bg-white shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-soft"
          >
            <div className="relative aspect-video w-full overflow-hidden bg-gray-100">
              <Image
                src={post.coverImageUrl ?? CATEGORY_FALLBACK_IMAGE[post.category] ?? DEFAULT_FALLBACK_IMAGE}
                alt={post.title}
                fill
                sizes="(max-width: 640px) 100vw, 50vw"
                className="object-cover transition duration-500 group-hover:scale-105"
              />
            </div>
            <div className="p-6">
              <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                {post.category.replace('_', ' ')}
              </span>
              <h2 className="mt-2 text-lg font-semibold text-gray-900">{post.title}</h2>
              {post.excerpt && <p className="mt-2 text-sm text-gray-600">{post.excerpt}</p>}
              {post.publishedAt && (
                <p className="mt-3 text-xs text-gray-400">
                  {new Date(post.publishedAt).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US')}
                </p>
              )}
            </div>
          </Link>
        ))}
        {items.length === 0 && <p className="text-gray-500">{t('noArticles')}</p>}
      </div>
    </div>
  );
}
