'use client';

import Link from 'next/link';
import { ProductForm } from '@/components/admin/ProductForm';

export default function NewProductPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">New Product</h1>
        <Link href="/admin/products" className="text-sm text-gray-500 hover:underline">
          Back to products
        </Link>
      </div>
      <div className="mt-6">
        <ProductForm />
      </div>
    </div>
  );
}
