import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export async function CtaSection() {
  const t = await getTranslations('home.cta');
  return (
    <section className="relative overflow-hidden py-20 text-center text-white">
      <div className="absolute inset-0">
        <Image
          src="/images/logistics/shipping-containers-dock.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-brand-900/85" />
      </div>
      <div className="relative mx-auto max-w-3xl px-6">
        <h2 className="text-3xl font-bold md:text-4xl">{t('title')}</h2>
        <p className="mt-4 text-brand-100">{t('body')}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/rfq"
            className="rounded-lg bg-white px-7 py-3.5 font-semibold text-brand-900 shadow-lifted transition hover:-translate-y-0.5 hover:bg-brand-50"
          >
            {t('requestPrice')}
          </Link>
          <Link
            href="/wholesale"
            className="rounded-lg border border-white/70 px-7 py-3.5 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
          >
            {t('becomeDistributor')}
          </Link>
        </div>
      </div>
    </section>
  );
}
