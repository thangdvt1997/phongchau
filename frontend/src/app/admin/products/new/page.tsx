'use client';

import Link from 'next/link';
import { ProductForm } from '@/components/admin/ProductForm';

export default function NewProductPage() {
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">New Product</h1>
        <Link href="/admin/products" className="text-sm font-medium text-gray-500 hover:text-gray-700 hover:underline">
          Back to products
        </Link>
      </div>
      <div className="rounded-xl2 border border-gray-200 bg-white p-6 shadow-card">
        <ProductForm />
      </div>
    </div>
  );
}
