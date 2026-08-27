import Image from 'next/image';
import { getTranslations } from 'next-intl/server';

export async function StatsStrip() {
  const t = await getTranslations('home.stats');
  const stats = t.raw('items') as { value: string; label: string }[];
  return (
    <section className="relative overflow-hidden bg-brand-800 py-16 text-white">
      <div className="absolute inset-0">
        <Image
          src="/images/facility/warehouse.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-900/95 via-brand-800/90 to-brand-800/95" />
      </div>
      <div className="relative mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 text-center sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="font-display text-4xl font-semibold">{stat.value}</p>
            <p className="mt-2 text-sm text-brand-100">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
