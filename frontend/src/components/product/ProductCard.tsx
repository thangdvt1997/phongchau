import Link from 'next/link';
import Image from 'next/image';
import { ProductListItem } from '@/lib/types';
import { formatMoney } from '@/lib/format';

export function ProductCard({ product }: { product: ProductListItem }) {
  const image = product.image?.url ?? '/placeholder-product.svg';
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white transition hover:shadow-md"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
        <Image
          src={image}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover transition group-hover:scale-105"
        />
        {product.isOrganic && (
          <span className="absolute left-2 top-2 rounded bg-brand-600 px-2 py-0.5 text-xs font-medium text-white">
            Organic
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        {product.category && (
          <span className="text-xs uppercase tracking-wide text-gray-500">{product.category}</span>
        )}
        <h3 className="line-clamp-2 font-medium text-gray-900">{product.name}</h3>
        {product.origin && <p className="text-xs text-gray-500">Origin: {product.origin}</p>}
        <p className="mt-auto pt-2 font-semibold text-brand-700">
          {formatMoney(product.basePrice, product.currency)}
        </p>
      </div>
    </Link>
  );
}
