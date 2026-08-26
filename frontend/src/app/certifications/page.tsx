import { serverFetch } from '@/lib/server-api';
import { HeroBanner } from '@/components/marketing/HeroBanner';

export const metadata = { title: 'Certifications' };
export const revalidate = 300;

interface Certification {
  id: string;
  name: string;
  description: string | null;
}

export default async function CertificationsPage() {
  const certs = (await serverFetch<Certification[]>('/catalog/certifications')) ?? [];

  return (
    <div>
      <HeroBanner
        image="/images/facility/quality-control-lab.jpg"
        alt="Laboratory quality control equipment"
        eyebrow="Trust & Compliance"
        size="md"
      >
        <h1 className="text-4xl font-bold md:text-5xl">Certifications</h1>
        <p className="mt-5 text-brand-50 md:text-lg">
          Our products and facilities are certified to international food safety and quality
          standards, verified per batch and available for buyer due-diligence.
        </p>
      </HeroBanner>

      <div className="mx-auto max-w-4xl px-6 py-16 md:py-24">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {certs.map((c) => (
            <div
              key={c.id}
              className="flex gap-4 rounded-xl2 border border-gray-100 bg-white p-6 shadow-card transition hover:-translate-y-1 hover:shadow-soft"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-6 w-6" aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.6}
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-brand-700">{c.name}</h2>
                {c.description && <p className="mt-2 text-sm text-gray-600">{c.description}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
