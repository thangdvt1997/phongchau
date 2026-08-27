'use client';

import { BlogForm } from '@/components/admin/BlogForm';

export default function AdminBlogNewPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Blog Post</h1>
      </div>
      <BlogForm mode="create" />
    </div>
  );
}
