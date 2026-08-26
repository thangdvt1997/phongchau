const STATS = [
  { value: '5', label: 'Sourcing Regions' },
  { value: '8', label: 'Product Lines' },
  { value: '8', label: 'Certifications Supported' },
  { value: '2', label: 'Warehouses' },
  { value: '5', label: 'Incoterms Supported' },
  { value: '100%', label: 'Batch Traceability' },
];

export function StatsStrip() {
  return (
    <section className="bg-brand-700 py-12 text-white">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 text-center sm:grid-cols-3 lg:grid-cols-6">
        {STATS.map((stat) => (
          <div key={stat.label}>
            <p className="text-3xl font-bold">{stat.value}</p>
            <p className="mt-1 text-sm text-brand-100">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
