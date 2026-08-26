'use client';

import { BlogForm } from '@/components/admin/BlogForm';

export default function AdminBlogNewPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">New Blog Post</h1>
      <BlogForm mode="create" />
    </div>
  );
}
