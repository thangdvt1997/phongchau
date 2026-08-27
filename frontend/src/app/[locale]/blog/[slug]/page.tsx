import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { serverFetch } from '@/lib/server-api';
import { sanitizeBlogContent } from '@/lib/sanitize-html';

export const revalidate = 60;

interface BlogDetail {
  title: string;
  content: string;
  category: string;
  publishedAt: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

async function getPost(slug: string) {
  return serverFetch<BlogDetail>(`/cms/blogs/${slug}`);
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string; locale: string };
}): Promise<Metadata> {
  const { slug } = params;
  const post = await getPost(slug);
  if (!post) return {};
  return { title: post.seoTitle ?? post.title, description: post.seoDescription ?? undefined };
}

export default async function BlogDetailPage({
  params,
}: {
  params: { slug: string; locale: string };
}) {
  const { slug, locale } = params;
  setRequestLocale(locale);
  const t = await getTranslations('blogPost');
  const post = await getPost(slug);
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <Link href="/blog" className="text-sm font-medium text-gray-500 hover:text-brand-700">
        {t('backLink')}
      </Link>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-brand-600">
        {post.category.replace('_', ' ')}
      </p>
      <h1 className="mt-2 text-3xl font-bold text-gray-900 md:text-4xl">{post.title}</h1>
      {post.publishedAt && (
        <p className="mt-3 text-sm text-gray-400">
          {new Date(post.publishedAt).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US')}
        </p>
      )}
      <div
        className="prose prose-brand mt-10 max-w-none"
        dangerouslySetInnerHTML={{ __html: sanitizeBlogContent(post.content) }}
      />
    </article>
  );
}
