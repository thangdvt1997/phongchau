'use client';

import { useEffect, useState } from 'react';
import { BlogForm, BlogFormValues } from '@/components/admin/BlogForm';
import { apiClient } from '@/lib/api-client';

export default function AdminBlogEditPage({ params }: { params: { id: string } }) {
  const [initial, setInitial] = useState<Partial<BlogFormValues> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get(`/admin/cms/blogs/${params.id}`)
      .then(({ data }) => {
        setInitial({
          title: data.title,
          slug: data.slug,
          category: data.category,
          excerpt: data.excerpt ?? '',
          content: data.content,
          coverImageUrl: data.coverImageUrl ?? '',
          status: data.status,
          seoTitle: data.seoTitle ?? '',
          seoDescription: data.seoDescription ?? '',
        });
      })
      .catch((err) => setError(err?.response?.data?.message ?? 'Failed to load blog post.'));
  }, [params.id]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Edit Blog Post</h1>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {!initial && !error ? (
        <p className="mt-6 text-sm text-gray-500">Loading post...</p>
      ) : initial ? (
        <BlogForm mode="edit" blogId={params.id} initial={initial} />
      ) : null}
    </div>
  );
}
