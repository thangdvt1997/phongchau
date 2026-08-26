const ITEMS = [
  { title: 'Direct from Farm', desc: 'Sourced directly from certified Vietnamese farms and cooperatives.' },
  { title: 'Factory Processing', desc: 'In-house processing under HACCP/ISO-controlled facilities.' },
  { title: 'International Standards', desc: 'HACCP, ISO 22000, GlobalG.A.P, BRC, Halal, FDA, VietGAP.' },
  { title: 'Full Traceability', desc: 'Every lot is QR-traceable from farm to warehouse.' },
  { title: 'Competitive Wholesale Pricing', desc: 'Tiered volume pricing and contract pricing for B2B partners.' },
  { title: 'Global Logistics', desc: 'FCL/LCL export experience to ASEAN, Asia, Europe, and North America.' },
];

export function WhyChooseUs() {
  return (
    <section className="bg-gray-50 py-16">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="text-2xl font-bold text-gray-900">Why Choose Phong Chau</h2>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((item) => (
            <div key={item.title} className="rounded-lg bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-brand-700">{item.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
