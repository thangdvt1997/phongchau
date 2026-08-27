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

const labelCls = 'text-sm font-semibold text-gray-700';
const inputCls =
  'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500';

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
    <form onSubmit={handleSubmit} className="mt-6 max-w-3xl space-y-4 rounded-xl2 border border-gray-200 bg-white p-6 shadow-card">
      <div>
        <label htmlFor="bf-title" className={labelCls}>Title</label>
        <input
          id="bf-title"
          required
          value={values.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className={inputCls}
        />
      </div>

      <div>
        <label htmlFor="bf-slug" className={labelCls}>Slug</label>
        <input
          id="bf-slug"
          required
          value={values.slug}
          onChange={(e) => {
            setSlugEdited(true);
            update('slug', e.target.value);
          }}
          className={inputCls}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="bf-category" className={labelCls}>Category</label>
          <select
            id="bf-category"
            value={values.category}
            onChange={(e) => update('category', e.target.value)}
            className={inputCls}
          >
            {BLOG_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="bf-status" className={labelCls}>Status</label>
          <select
            id="bf-status"
            value={values.status}
            onChange={(e) => update('status', e.target.value)}
            className={inputCls}
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
        <label htmlFor="bf-excerpt" className={labelCls}>Excerpt</label>
        <textarea
          id="bf-excerpt"
          value={values.excerpt}
          onChange={(e) => update('excerpt', e.target.value)}
          rows={2}
          className={inputCls}
        />
      </div>

      <div>
        <label htmlFor="bf-content" className={labelCls}>Content (HTML)</label>
        <textarea
          id="bf-content"
          required
          value={values.content}
          onChange={(e) => update('content', e.target.value)}
          rows={12}
          className={`${inputCls} font-mono text-sm`}
        />
      </div>

      <div>
        <label htmlFor="bf-cover-image" className={labelCls}>Cover Image URL</label>
        <input
          id="bf-cover-image"
          value={values.coverImageUrl}
          onChange={(e) => update('coverImageUrl', e.target.value)}
          className={inputCls}
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label htmlFor="bf-seo-title" className={labelCls}>SEO Title</label>
          <input
            id="bf-seo-title"
            value={values.seoTitle}
            onChange={(e) => update('seoTitle', e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="bf-seo-description" className={labelCls}>SEO Description</label>
          <textarea
            id="bf-seo-description"
            value={values.seoDescription}
            onChange={(e) => update('seoDescription', e.target.value)}
            rows={2}
            className={inputCls}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl2 border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 disabled:opacity-50"
        >
          {submitting ? 'Saving...' : mode === 'create' ? 'Create Post' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
