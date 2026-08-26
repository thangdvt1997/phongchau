const STEPS = ['Farm', 'Collection', 'Processing', 'Quality Control', 'Packaging', 'Warehouse', 'Logistics', 'Customer'];

export function SupplyChainFlow() {
  return (
    <section className="bg-gray-50 py-16">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="text-center text-2xl font-bold text-gray-900">Our Supply Chain</h2>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          {STEPS.map((step, idx) => (
            <div key={step} className="flex items-center gap-2">
              <div className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white">
                {step}
              </div>
              {idx < STEPS.length - 1 && <span className="text-gray-400">&rarr;</span>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
