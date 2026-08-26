const ITEMS = [
  {
    title: 'Batch-Level Traceability',
    desc: 'Every product carries a batch/lot number tracing harvest, processing, and packaging dates back to its origin cooperative.',
  },
  {
    title: 'Tiered Wholesale Pricing',
    desc: 'Volume-based tier pricing for every product, plus negotiated contract pricing for approved B2B accounts.',
  },
  {
    title: 'RFQ-Based Export Quotation',
    desc: 'Submit an RFQ for a specific quantity, packaging, or spec — our sales team reviews it and issues a formal quotation.',
  },
  {
    title: 'Certified Processing Facilities',
    desc: 'Processing and packaging under HACCP and ISO 22000, with product-specific certifications such as GlobalG.A.P, Organic, BRC, Halal, FDA, and VietGAP.',
  },
  {
    title: 'Flexible Export Terms',
    desc: 'Shipping under FOB, CIF, EXW, CFR, or DDP Incoterms, with HS codes and MOQ defined per product.',
  },
  {
    title: 'Multi-Warehouse Fulfillment',
    desc: 'Stock held across our Ho Chi Minh City and Da Nang warehouses for faster regional order fulfillment.',
  },
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
