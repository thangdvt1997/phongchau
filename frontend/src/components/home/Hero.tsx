import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { HeroBanner } from '@/components/marketing/HeroBanner';

export async function Hero() {
  const t = await getTranslations('home.hero');
  return (
    <HeroBanner
      image="/images/hero/home-rice-terraces.jpg"
      alt="Terraced rice fields in the Vietnamese highlands at golden hour"
      eyebrow={t('eyebrow')}
    >
      <h1 className="text-4xl font-bold leading-[1.1] md:text-6xl">
        {t('titleLine1')}
        <br className="hidden md:block" />
        {t('titleLine2')}
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-base text-brand-50 md:text-lg">{t('body')}</p>
      <div className="mt-10 flex flex-wrap justify-center gap-4">
        <Link
          href="/products"
          className="rounded-lg bg-white px-7 py-3.5 font-semibold text-brand-700 shadow-lifted transition hover:-translate-y-0.5 hover:bg-brand-50"
        >
          {t('shopNow')}
        </Link>
        <Link
          href="/rfq"
          className="rounded-lg border border-white/70 px-7 py-3.5 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
        >
          {t('requestQuote')}
        </Link>
        <Link
          href="/wholesale"
          className="rounded-lg border border-white/70 px-7 py-3.5 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
        >
          {t('becomeDistributor')}
        </Link>
      </div>
    </HeroBanner>
  );
}
