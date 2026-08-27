'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { ProductForm, AdminProductDetail } from '@/components/admin/ProductForm';

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const productId = params.id;
  const [product, setProduct] = useState<AdminProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) return;
    apiClient
      .get(`/admin/catalog/products/${productId}`)
      .then(({ data }) => setProduct(data))
      .catch((err) => setError(err?.response?.data?.message ?? 'Failed to load product.'))
      .finally(() => setLoading(false));
  }, [productId]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
        <Link href="/admin/products" className="text-sm font-medium text-gray-500 hover:text-gray-700 hover:underline">
          Back to products
        </Link>
      </div>
      <div>
        {loading ? (
          <p className="text-sm text-gray-500">Loading product...</p>
        ) : error || !product ? (
          <div className="rounded-xl2 border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error ?? 'Product not found.'}
          </div>
        ) : (
          <div className="rounded-xl2 border border-gray-200 bg-white p-6 shadow-card">
            <ProductForm productId={productId} initialProduct={product} />
          </div>
        )}
      </div>
    </div>
  );
}
