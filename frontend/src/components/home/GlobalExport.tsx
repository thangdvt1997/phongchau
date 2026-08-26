const EXPORT_CAPABILITIES = [
  'FOB',
  'CIF',
  'EXW',
  'CFR',
  'DDP',
  'HS-Coded Documentation',
  'Cat Lai Port, Ho Chi Minh City',
  'FCL / LCL Shipping',
];

export function GlobalExport() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16 md:py-24">
      <div className="text-center">
        <p className="section-eyebrow">Worldwide Shipping</p>
        <h2 className="mt-2 text-3xl font-bold text-gray-900">Export-Ready, Worldwide</h2>
        <p className="mx-auto mt-3 max-w-2xl text-gray-600">
          Every product ships with an HS code, a defined MOQ, and export documentation —
          ready to move under the Incoterms and shipping method your business requires.
        </p>
      </div>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        {EXPORT_CAPABILITIES.map((m) => (
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
