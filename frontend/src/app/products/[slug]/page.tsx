import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { serverFetch } from '@/lib/server-api';
import { ProductDetail } from '@/lib/types';
import { AddToCartPanel } from '@/components/product/AddToCartPanel';
import { ProductCard } from '@/components/product/ProductCard';

export const revalidate = 60;

async function getProduct(slug: string) {
  return serverFetch<ProductDetail>(`/catalog/products/${slug}`);
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProduct(params.slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.shortDescription ?? undefined,
    openGraph: {
      title: product.name,
      description: product.shortDescription ?? undefined,
      images: product.images?.[0]?.url ? [product.images[0].url] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const product = await getProduct(params.slug);
  if (!product) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription,
    sku: product.sku,
    image: product.images?.map((i) => i.url),
    brand: product.brand ? { '@type': 'Brand', name: product.brand.name } : undefined,
    offers: {
      '@type': 'Offer',
      price: product.basePrice,
      priceCurrency: product.currency,
      availability: 'https://schema.org/InStock',
    },
  };

  const specs = ([
    ['Scientific Name', product.scientificName],
    ['Variety', product.variety],
    ['Harvest Season', product.harvestSeason],
    ['Grade', product.grade],
    ['Moisture', product.moisture],
    ['Shelf Life', product.shelfLife],
    ['Storage Temperature', product.storageTemperature],
    ['HS Code', product.hsCode],
    ['Country of Origin', product.countryOfOrigin],
    ['MOQ', product.moq],
    ['Supply Ability', product.supplyAbility],
    ['Lead Time', product.leadTime],
    ['Port of Loading', product.portOfLoading],
    ['Incoterms', product.incoterms?.join(', ')],
    ['Net Weight', product.netWeight],
    ['Gross Weight', product.grossWeight],
  ] as [string, string | null | undefined][]).filter(([, v]) => v);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="text-sm text-gray-500">
        <Link href="/products" className="hover:text-brand-700">
          Products
        </Link>
        {product.category && (
          <>
            {' / '}
            <Link href={`/products?categorySlug=${product.category.slug}`} className="hover:text-brand-700">
              {product.category.name}
            </Link>
          </>
        )}
        {' / '}
        <span className="text-gray-800">{product.name}</span>
      </nav>

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <div className="relative aspect-square w-full overflow-hidden rounded-xl2 bg-gray-100 shadow-card">
            <Image
              src={product.images?.[0]?.url ?? '/placeholder-product.svg'}
              alt={product.name}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          </div>
          {product.images && product.images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {product.images.slice(1, 5).map((img, idx) => (
                <div
                  key={idx}
                  className="relative h-16 w-16 overflow-hidden rounded-lg border border-gray-200 bg-gray-100"
                >
                  <Image src={img.url} alt="" fill sizes="64px" className="object-cover" />
                </div>
              ))}
            </div>
          )}

          {product.certifications && product.certifications.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {product.certifications.map((c) => (
                <span
                  key={c.id}
                  className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700"
                >
                  {c.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          {product.isOrganic && (
            <span className="mb-2 inline-block rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-semibold text-white">
              Organic
            </span>
          )}
          <h1 className="text-3xl font-bold text-gray-900 md:text-4xl">{product.name}</h1>
          <p className="mt-1 text-sm text-gray-500">SKU: {product.sku}</p>
          {product.shortDescription && (
            <p className="mt-4 text-gray-600">{product.shortDescription}</p>
          )}

          <div className="mt-6">
            <AddToCartPanel
              variants={product.variants}
              productSlug={product.slug}
              productId={product.id}
              productName={product.name}
              currency={product.currency}
            />
          </div>
        </div>
      </div>

      {product.fullDescription && (
        <section className="mt-14 border-t border-gray-100 pt-10">
          <h2 className="text-xl font-bold text-gray-900">Description</h2>
          <p className="mt-3 whitespace-pre-line text-gray-600">{product.fullDescription}</p>
        </section>
      )}

      {specs.length > 0 && (
        <section className="mt-14 border-t border-gray-100 pt-10">
          <h2 className="text-xl font-bold text-gray-900">Specifications</h2>
          <dl className="mt-5 grid grid-cols-1 gap-x-8 gap-y-1 rounded-xl2 border border-gray-100 bg-white p-2 shadow-card sm:grid-cols-2">
            {specs.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 border-b border-gray-100 px-4 py-3 text-sm last:border-0">
                <dt className="text-gray-500">{label}</dt>
                <dd className="text-right font-medium text-gray-800">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {product.documents && product.documents.length > 0 && (
        <section className="mt-14 border-t border-gray-100 pt-10">
          <h2 className="text-xl font-bold text-gray-900">Documents</h2>
          <ul className="mt-4 space-y-2">
            {product.documents.map((doc) => (
              <li key={doc.id}>
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-brand-700 hover:underline"
                >
                  {doc.title} ({doc.type})
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {product.relatedProducts && product.relatedProducts.length > 0 && (
        <section className="mt-14 border-t border-gray-100 pt-10">
          <h2 className="text-xl font-bold text-gray-900">Related Products</h2>
          <div className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-4">
            {product.relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
