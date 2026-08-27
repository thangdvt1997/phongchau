import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { HeroBanner } from '@/components/marketing/HeroBanner';

const CARD_IMAGES = [
  { image: '/images/about/farmer-rice-field.jpg' },
  { image: '/images/facility/processing-floor.jpg' },
  { image: '/images/logistics/shipping-containers-dock.jpg' },
];

export async function generateMetadata({ params }: { params: { locale: string } }) {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: 'about' });
  return { title: t('heroTitle') };
}

export default async function AboutPage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  setRequestLocale(locale);
  const t = await getTranslations('about');
  const regions = t.raw('regions') as { region: string; province: string; partner: string; products: string }[];
  const cards = t.raw('cards') as { title: string; desc: string; alt: string }[];
  const provinceSuffix = t('provinceSuffix');

  return (
    <div>
      <HeroBanner
        image="/images/about/farmer-rice-field.jpg"
        alt="Farmer working in a Vietnamese rice field"
        eyebrow={t('heroEyebrow')}
        size="md"
      >
        <h1 className="text-4xl font-bold md:text-5xl">{t('heroTitle')}</h1>
        <p className="mt-5 text-brand-50 md:text-lg">{t('heroBody')}</p>
      </HeroBanner>

      <div className="mx-auto max-w-5xl px-6 py-16 md:py-24">
        <section className="grid grid-cols-1 gap-10 md:grid-cols-2 md:items-center">
          <div>
            <p className="section-eyebrow">{t('whoWeAreEyebrow')}</p>
            <h2 className="mt-2 text-2xl font-bold text-gray-900">{t('whoWeAreTitle')}</h2>
            <p className="mt-4 text-gray-600">{t('whoWeAreBody1')}</p>
            <p className="mt-4 text-gray-600">{t('whoWeAreBody2')}</p>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-xl2 shadow-lifted">
            <Image
              src="/images/facility/warehouse.jpg"
              alt={t('warehouseAlt')}
              fill
              sizes="(max-width: 768px) 100vw, 40vw"
              className="object-cover"
            />
          </div>
        </section>

        <section className="mt-20">
          <p className="section-eyebrow">{t('regionsEyebrow')}</p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900">{t('regionsTitle')}</h2>
          <p className="mt-2 text-gray-600">{t('regionsBody')}</p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {regions.map((r) => (
              <div
                key={r.region}
                className="rounded-xl2 border border-gray-100 bg-white p-6 shadow-card transition hover:-translate-y-1 hover:shadow-soft"
              >
                <h3 className="font-semibold text-brand-700">{r.region}</h3>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-400">
                  {provinceSuffix ? `${r.province} ${provinceSuffix}` : r.province}
                </p>
                <p className="mt-3 text-sm text-gray-600">{r.products}</p>
                <p className="mt-2 text-xs text-gray-400">
                  {t('originPartnerLabel')}: {r.partner}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20">
          <p className="section-eyebrow">{t('processEyebrow')}</p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900">{t('processTitle')}</h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {cards.map((item, idx) => (
              <div
                key={item.title}
                className="overflow-hidden rounded-xl2 border border-gray-100 bg-white shadow-card transition hover:-translate-y-1 hover:shadow-soft"
              >
                <div className="relative aspect-[4/3] w-full">
                  <Image
                    src={CARD_IMAGES[idx].image}
                    alt={item.alt}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-semibold text-brand-700">{item.title}</h3>
                  <p className="mt-2 text-sm text-gray-600">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
