import Link from 'next/link';
import { serverFetch } from '@/lib/server-api';
import { Paginated } from '@/lib/types';

export const metadata = { title: 'News & Knowledge' };
export const revalidate = 60;

interface BlogListItem {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  publishedAt: string | null;
}

export default async function BlogListPage() {
  const result = await serverFetch<Paginated<BlogListItem>>('/cms/blogs?pageSize=20');
  const items = result?.items ?? [];

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-3xl font-bold text-gray-900">News &amp; Knowledge</h1>
      <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
        {items.map((post) => (
          <Link
            key={post.id}
            href={`/blog/${post.slug}`}
            className="rounded-lg border border-gray-200 p-6 transition hover:shadow-md"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">
              {post.category.replace('_', ' ')}
            </span>
            <h2 className="mt-2 text-lg font-semibold text-gray-900">{post.title}</h2>
            {post.excerpt && <p className="mt-2 text-sm text-gray-600">{post.excerpt}</p>}
            {post.publishedAt && (
              <p className="mt-3 text-xs text-gray-400">
                {new Date(post.publishedAt).toLocaleDateString()}
              </p>
            )}
          </Link>
        ))}
        {items.length === 0 && <p className="text-gray-500">No articles yet.</p>}
      </div>
    </div>
  );
}
