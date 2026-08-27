import { getTranslations } from 'next-intl/server';

export async function SupplyChainFlow() {
  const t = await getTranslations('home.supplyChain');
  const steps = t.raw('steps') as string[];
  return (
    <section className="bg-gray-50 py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <p className="section-eyebrow">{t('eyebrow')}</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{t('title')}</h2>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-2 gap-y-4">
          {steps.map((step, idx) => (
            <div key={step} className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-full border border-brand-100 bg-white px-4 py-2.5 text-sm font-medium text-brand-800 shadow-card">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
                  {idx + 1}
                </span>
                {step}
              </div>
              {idx < steps.length - 1 && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4 text-brand-300" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
