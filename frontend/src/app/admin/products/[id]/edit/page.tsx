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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
        <Link href="/admin/products" className="text-sm text-gray-500 hover:underline">
          Back to products
        </Link>
      </div>
      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-gray-500">Loading product...</p>
        ) : error || !product ? (
          <p className="text-sm text-red-600">{error ?? 'Product not found.'}</p>
        ) : (
          <ProductForm productId={productId} initialProduct={product} />
        )}
      </div>
    </div>
  );
}
