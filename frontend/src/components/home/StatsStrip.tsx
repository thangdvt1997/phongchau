const STATS = [
  { value: '15+', label: 'Years Experience' },
  { value: '30+', label: 'Countries Exported' },
  { value: '5,000+', label: 'Tons / Year' },
  { value: '200+', label: 'Partner Farms' },
  { value: '1,200+', label: 'Customers' },
  { value: '80+', label: 'Containers / Month' },
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
