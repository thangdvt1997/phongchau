export const metadata = { title: 'About Us' };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-3xl font-bold text-gray-900">About Phong Chau</h1>
      <p className="mt-6 text-gray-600">
        Phong Chau is a Vietnamese agriculture, food processing, and export company connecting
        certified farms and factories to global buyers — from individual retail customers to
        international distributors and importers.
      </p>
      <p className="mt-4 text-gray-600">
        We operate across the full value chain: sourcing from partner farms, in-house processing
        and quality control, packaging to export specification, warehousing, and international
        logistics — with full batch-level traceability from farm to customer.
      </p>
      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {[
          { title: 'Sourcing', desc: 'Direct partnerships with certified farms across Vietnam.' },
          { title: 'Processing', desc: 'HACCP/ISO-certified processing and packaging facilities.' },
          { title: 'Export', desc: 'FCL/LCL shipping experience across FOB, CIF, and DDP terms.' },
        ].map((item) => (
          <div key={item.title} className="rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-brand-700">{item.title}</h3>
            <p className="mt-2 text-sm text-gray-600">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
