import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { HeroBanner } from '@/components/marketing/HeroBanner';

export async function generateMetadata({ params }: { params: { locale: string } }) {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: 'wholesale' });
  return { title: t('heroTitle') };
}

export default async function WholesalePage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  setRequestLocale(locale);
  const t = await getTranslations('wholesale');
  const tiers = t.raw('tiers') as { range: string; price: string }[];
  const steps = t.raw('steps') as string[];

  return (
    <div>
      <HeroBanner
        image="/images/business/handshake-deal.jpg"
        alt="Business partners shaking hands to close a deal"
        eyebrow={t('heroEyebrow')}
        size="md"
      >
        <h1 className="text-4xl font-bold md:text-5xl">{t('heroTitle')}</h1>
        <p className="mt-5 text-brand-50 md:text-lg">{t('heroBody')}</p>
      </HeroBanner>

      <div className="mx-auto max-w-5xl px-6 py-16 md:py-24">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
          <div className="rounded-xl2 border border-gray-100 bg-white p-8 shadow-card">
            <p className="section-eyebrow">{t('pricingEyebrow')}</p>
            <h2 className="mt-2 text-xl font-semibold text-gray-900">{t('pricingTitle')}</h2>
            <table className="mt-5 w-full text-sm">
              <tbody>
                {tiers.map((tier) => (
                  <tr key={tier.range} className="border-b border-gray-100 last:border-0">
                    <td className="py-3 text-gray-600">{tier.range}</td>
                    <td className="py-3 text-right font-semibold text-gray-900">{tier.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-gray-400">{t('pricingNote')}</p>
          </div>

          <div>
            <p className="section-eyebrow">{t('onboardingEyebrow')}</p>
            <h2 className="mt-2 text-xl font-semibold text-gray-900">{t('onboardingTitle')}</h2>
            <ol className="mt-5 space-y-4">
              {steps.map((step, idx) => (
                <li key={step} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                    {idx + 1}
                  </span>
                  <p className="pt-1 text-sm text-gray-600">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="mt-14 flex flex-wrap gap-4 border-t border-gray-100 pt-10">
          <Link
            href="/register/b2b"
            className="rounded-lg bg-brand-600 px-7 py-3.5 font-semibold text-white shadow-card transition hover:-translate-y-0.5 hover:bg-brand-700"
          >
            {t('applyBtn')}
          </Link>
          <Link
            href="/rfq"
            className="rounded-lg border border-brand-600 px-7 py-3.5 font-semibold text-brand-700 transition hover:-translate-y-0.5 hover:bg-brand-50"
          >
            {t('requestQuoteBtn')}
          </Link>
        </div>
      </div>
    </div>
  );
}
