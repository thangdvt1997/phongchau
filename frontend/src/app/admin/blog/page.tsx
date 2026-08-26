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

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Blog / CMS</h1>
        <Link
          href="/admin/blog/new"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
        >
          New Post
        </Link>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {blogs === null ? (
        <p className="mt-6 text-sm text-gray-500">Loading posts...</p>
      ) : blogs.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">No blog posts yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-md border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Title</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Category</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Status</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Published</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {blogs.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link href={`/admin/blog/${b.id}/edit`} className="font-medium text-brand-700 hover:underline">
                      {b.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-700">{b.category}</td>
                  <td className="px-4 py-2 text-gray-700">{b.status}</td>
                  <td className="px-4 py-2 text-gray-500">
                    {b.publishedAt ? new Date(b.publishedAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
