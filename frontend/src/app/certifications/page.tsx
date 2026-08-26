import { serverFetch } from '@/lib/server-api';

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
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-3xl font-bold text-gray-900">Certifications</h1>
      <p className="mt-4 text-gray-600">
        Our products and facilities are certified to international food safety and quality
        standards, verified per batch and available for buyer due-diligence.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {certs.map((c) => (
          <div key={c.id} className="rounded-lg border border-gray-200 p-6">
            <h2 className="font-semibold text-brand-700">{c.name}</h2>
            {c.description && <p className="mt-2 text-sm text-gray-600">{c.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
