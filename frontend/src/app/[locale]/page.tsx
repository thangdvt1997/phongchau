import { setRequestLocale } from 'next-intl/server';
import { serverFetch } from '@/lib/server-api';
import { Category, Paginated, ProductListItem } from '@/lib/types';
import { Hero } from '@/components/home/Hero';
import { FeaturedCategories } from '@/components/home/FeaturedCategories';
import { FeaturedProducts } from '@/components/home/FeaturedProducts';
import { WhyChooseUs } from '@/components/home/WhyChooseUs';
import { StatsStrip } from '@/components/home/StatsStrip';
import { CertificationsStrip } from '@/components/home/CertificationsStrip';
import { SupplyChainFlow } from '@/components/home/SupplyChainFlow';
import { GlobalExport } from '@/components/home/GlobalExport';
import { CtaSection } from '@/components/home/CtaSection';

export const revalidate = 60;

export default async function HomePage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  setRequestLocale(locale);

  const [categories, featured, certifications] = await Promise.all([
    serverFetch<Category[]>('/catalog/categories'),
    serverFetch<Paginated<ProductListItem>>('/catalog/products?isFeatured=true&pageSize=8'),
    serverFetch<{ id: string; name: string; code: string }[]>('/catalog/certifications'),
  ]);

  return (
    <>
      <Hero />
      <FeaturedCategories categories={categories ?? []} />
      <FeaturedProducts products={featured?.items ?? []} />
      <WhyChooseUs />
      <StatsStrip />
      <CertificationsStrip certifications={certifications ?? []} />
      <SupplyChainFlow />
      <GlobalExport />
      <CtaSection />
    </>
  );
}
