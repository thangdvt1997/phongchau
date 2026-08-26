interface Certification {
  id: string;
  name: string;
  code: string;
  iconUrl?: string | null;
}

export function CertificationsStrip({ certifications }: { certifications: Certification[] }) {
  if (certifications.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <h2 className="text-center text-2xl font-bold text-gray-900">Certifications</h2>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
        {certifications.map((cert) => (
          <div
            key={cert.id}
            className="flex h-20 w-32 items-center justify-center rounded-lg border border-gray-200 text-center text-sm font-semibold text-gray-700"
          >
            {cert.name}
          </div>
        ))}
      </div>
    </section>
  );
}
