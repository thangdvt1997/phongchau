'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

interface BlogRow {
  id: string;
  title: string;
  category: string;
  status: string;
  publishedAt: string | null;
  createdAt: string;
}

export default function AdminBlogListPage() {
  const [blogs, setBlogs] = useState<BlogRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get('/admin/cms/blogs', { params: { pageSize: 100 } })
      .then(({ data }) => setBlogs(data.items))
      .catch((err) => {
        setError(err?.response?.data?.message ?? 'Failed to load blog posts.');
        setBlogs([]);
      });
  }, []);

  function statusBadgeClass(s: string): string {
    const lower = s.toLowerCase();
    if (lower === 'published' || lower === 'approved') return 'bg-emerald-50 text-emerald-700';
    if (lower === 'draft' || lower === 'pending') return 'bg-amber-50 text-amber-700';
    return 'bg-gray-100 text-gray-700';
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Blog / CMS</h1>
        <Link
          href="/admin/blog/new"
          className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700"
        >
          New Post
        </Link>
      </div>

      {error && (
        <div className="mt-4 rounded-xl2 border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      )}

      {blogs === null ? (
        <p className="mt-6 text-sm text-gray-500">Loading posts...</p>
      ) : blogs.length === 0 ? (
        <div className="mt-6 rounded-xl2 border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
          No blog posts yet.
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl2 border border-gray-200 bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Title</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Category</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Published</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {blogs.map((b) => (
                  <tr key={b.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <Link href={`/admin/blog/${b.id}/edit`} className="font-medium text-teal-700 hover:text-teal-800 hover:underline">
                        {b.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">{b.category}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(b.status)}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {b.publishedAt ? new Date(b.publishedAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
