const MARKETS = ['USA', 'EU', 'Japan', 'South Korea', 'China', 'Middle East', 'ASEAN', 'Australia'];

export function GlobalExport() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <h2 className="text-center text-2xl font-bold text-gray-900">Global Export Markets</h2>
      <p className="mx-auto mt-2 max-w-2xl text-center text-gray-600">
        Exporting Vietnamese agricultural products to partners and distributors worldwide.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {MARKETS.map((m) => (
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
