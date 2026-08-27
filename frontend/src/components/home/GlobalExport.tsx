import { getTranslations } from 'next-intl/server';

export async function GlobalExport() {
  const t = await getTranslations('home.globalExport');
  const capabilities = t.raw('capabilities') as string[];
  return (
    <section className="mx-auto max-w-7xl px-6 py-16 md:py-24">
      <div className="text-center">
        <p className="section-eyebrow">{t('eyebrow')}</p>
        <h2 className="mt-2 text-3xl font-bold text-gray-900">{t('title')}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-gray-600">{t('body')}</p>
      </div>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        {capabilities.map((m) => (
          <span
            key={m}
            className="rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700"
          >
            {m}
          </span>
        ))}
      </div>
    </section>
  );
}
