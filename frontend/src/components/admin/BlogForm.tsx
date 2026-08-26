'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

const BLOG_CATEGORIES = [
  'BLOG',
  'NEWS',
  'MARKET_REPORT',
  'PRODUCT_GUIDE',
  'KNOWLEDGE',
  'EXPORT_GUIDE',
  'RECIPE',
  'CASE_STUDY',
  'COMPANY_NEWS',
  'INDUSTRY_REPORT',
  'LANDING_PAGE',
];

const CONTENT_STATUSES = ['DRAFT', 'PUBLISHED'];

export interface BlogFormValues {
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  status: string;
  seoTitle: string;
  seoDescription: string;
}

interface BlogFormProps {
  initial?: Partial<BlogFormValues>;
  mode: 'create' | 'edit';
  blogId?: string;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function BlogForm({ initial, mode, blogId }: BlogFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<BlogFormValues>({
    title: initial?.title ?? '',
    slug: initial?.slug ?? '',
    category: initial?.category ?? 'BLOG',
    excerpt: initial?.excerpt ?? '',
    content: initial?.content ?? '',
    coverImageUrl: initial?.coverImageUrl ?? '',
    status: initial?.status ?? 'DRAFT',
    seoTitle: initial?.seoTitle ?? '',
    seoDescription: initial?.seoDescription ?? '',
  });
  // Track whether the user has hand-edited the slug so title changes stop
  // auto-suggesting one over their edits — but keep auto-suggesting for a
  // brand new post whose slug is still untouched.
  const [slugEdited, setSlugEdited] = useState(mode === 'edit');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof BlogFormValues>(key: K, value: BlogFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function handleTitleChange(title: string) {
    update('title', title);
    if (!slugEdited) {
      update('slug', slugify(title));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const payload = {
      title: values.title,
      slug: values.slug || undefined,
      category: values.category,
      excerpt: values.excerpt || undefined,
      content: values.content,
      coverImageUrl: values.coverImageUrl || undefined,
      status: values.status,
      seoTitle: values.seoTitle || undefined,
      seoDescription: values.seoDescription || undefined,
    };
    try {
      if (mode === 'create') {
        await apiClient.post('/admin/cms/blogs', payload);
      } else {
        await apiClient.patch(`/admin/cms/blogs/${blogId}`, payload);
      }
      router.push('/admin/blog');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to save blog post.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 max-w-3xl space-y-4">
      <div>
        <label className="text-sm font-semibold text-gray-700">Title</label>
        <input
          required
          value={values.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="text-sm font-semibold text-gray-700">Slug</label>
        <input
          required
          value={values.slug}
          onChange={(e) => {
            setSlugEdited(true);
            update('slug', e.target.value);
          }}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-semibold text-gray-700">Category</label>
          <select
            value={values.category}
            onChange={(e) => update('category', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          >
            {BLOG_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-700">Status</label>
          <select
            value={values.status}
            onChange={(e) => update('status', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          >
            {CONTENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold text-gray-700">Excerpt</label>
        <textarea
          value={values.excerpt}
          onChange={(e) => update('excerpt', e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="text-sm font-semibold text-gray-700">Content (HTML)</label>
        <textarea
          required
          value={values.content}
          onChange={(e) => update('content', e.target.value)}
          rows={12}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm"
        />
      </div>

      <div>
        <label className="text-sm font-semibold text-gray-700">Cover Image URL</label>
        <input
          value={values.coverImageUrl}
          onChange={(e) => update('coverImageUrl', e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="text-sm font-semibold text-gray-700">SEO Title</label>
          <input
            value={values.seoTitle}
            onChange={(e) => update('seoTitle', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-700">SEO Description</label>
          <textarea
            value={values.seoDescription}
            onChange={(e) => update('seoDescription', e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-brand-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
      >
        {submitting ? 'Saving...' : mode === 'create' ? 'Create Post' : 'Save Changes'}
      </button>
    </form>
  );
}
