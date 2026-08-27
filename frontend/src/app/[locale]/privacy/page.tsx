import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export async function generateMetadata({ params }: { params: { locale: string } }) {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: 'privacy' });
  return { title: t('title') };
}

export default async function PrivacyPage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  setRequestLocale(locale);
  const t = await getTranslations('privacy');
  const sections = t.raw('sections') as { heading: string; body: string }[];

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
      <p className="mt-2 text-sm text-gray-500">{t('lastUpdated')}</p>

      <div className="prose prose-brand mt-8 max-w-none space-y-6 text-gray-700">
        {sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-lg font-semibold text-gray-900">{s.heading}</h2>
            <p>{s.body}</p>
          </section>
        ))}
        <section>
          <h2 className="text-lg font-semibold text-gray-900">{t('rightsHeading')}</h2>
          <p>
            {t('rightsBodyPrefix')}{' '}
            <Link href="/contact" className="text-brand-700 underline">
              {t('rightsLinkText')}
            </Link>
            {t('rightsBodySuffix')}
          </p>
        </section>
      </div>
    </div>
  );
}
