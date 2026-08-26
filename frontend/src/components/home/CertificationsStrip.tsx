interface Certification {
  id: string;
  name: string;
  code: string;
  iconUrl?: string | null;
}

export function CertificationsStrip({ certifications }: { certifications: Certification[] }) {
  if (certifications.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-6 py-16 md:py-24">
      <div className="text-center">
        <p className="section-eyebrow">Verified Standards</p>
        <h2 className="mt-2 text-3xl font-bold text-gray-900">Certifications</h2>
        <p className="mx-auto mt-3 max-w-2xl text-gray-600">
          Certified to international food safety and quality standards, verified per batch.
        </p>
      </div>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        {certifications.map((cert) => (
          <div
            key={cert.id}
            className="flex h-24 w-40 flex-col items-center justify-center gap-1.5 rounded-xl2 border border-gray-200 bg-white text-center shadow-card transition hover:-translate-y-1 hover:shadow-soft"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="h-6 w-6 text-brand-600"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.6}
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
              />
            </svg>
            <span className="px-2 text-sm font-semibold text-gray-800">{cert.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
