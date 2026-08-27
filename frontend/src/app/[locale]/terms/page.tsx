import { getTranslations, setRequestLocale } from 'next-intl/server';

export async function generateMetadata({ params }: { params: { locale: string } }) {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: 'terms' });
  return { title: t('title') };
}

export default async function TermsPage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  setRequestLocale(locale);
  const t = await getTranslations('terms');
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
      </div>
    </div>
  );
}
