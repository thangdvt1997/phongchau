export const metadata = { title: 'About Us' };

const REGIONS = [
  {
    region: 'Dak Lak Highlands',
    province: 'Dak Lak',
    partner: 'Dak Lak Coffee Cooperative',
    products: 'Roasted robusta & washed arabica coffee',
  },
  {
    region: 'Binh Phuoc',
    province: 'Binh Phuoc',
    partner: 'Binh Phuoc Cashew Farms',
    products: 'Roasted & raw cashew (W320, W240)',
  },
  {
    region: 'Phu Quoc',
    province: 'Kien Giang',
    partner: 'Phu Quoc Pepper Cooperative',
    products: 'Black & white pepper',
  },
  {
    region: 'Ben Tre Delta',
    province: 'Ben Tre',
    partner: 'Ben Tre Coconut Farms',
    products: 'Desiccated coconut',
  },
  {
    region: 'An Giang',
    province: 'An Giang',
    partner: 'An Giang Rice Cooperative',
    products: 'Jasmine rice',
  },
];

const CARDS = [
  {
    title: 'Sourcing',
    desc: 'Direct partnerships with farm cooperatives across five regions — Dak Lak, Binh Phuoc, Phu Quoc, Ben Tre, and An Giang.',
  },
  {
    title: 'Processing',
    desc: 'Processing and packaging under HACCP and ISO 22000, with product-specific certifications including GlobalG.A.P, Organic, BRC, Halal, FDA, and VietGAP.',
  },
  {
    title: 'Export',
    desc: 'Export documentation, HS coding, and shipping under FOB, CIF, EXW, CFR, and DDP terms, loaded from Cat Lai Port, Ho Chi Minh City.',
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-3xl font-bold text-gray-900">About Phong Chau</h1>

      <section className="mt-6">
        <p className="text-gray-600">
          Phong Chau is a Vietnamese agriculture, food processing, and export company connecting
          certified farms and cooperatives to global buyers — from individual retail customers to
          international distributors and importers. Our range covers cashew, coffee, pepper, rice,
          and coconut products, each tied to a specific growing region and origin partner.
        </p>
        <p className="mt-4 text-gray-600">
          We operate across the full value chain: sourcing from partner farms, in-house processing
          and quality control, packaging to export specification, warehousing in Ho Chi Minh City
          and Da Nang, and international logistics — with a batch/lot number behind every product,
          traceable from farm to customer.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="text-xl font-bold text-gray-900">Our Regions</h2>
        <p className="mt-2 text-sm text-gray-600">
          Each product in our catalog is sourced from a named region and origin partner.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {REGIONS.map((r) => (
            <div key={r.region} className="rounded-lg border border-gray-200 p-5">
              <h3 className="font-semibold text-brand-700">{r.region}</h3>
              <p className="mt-1 text-xs uppercase tracking-wide text-gray-400">{r.province} Province</p>
              <p className="mt-2 text-sm text-gray-600">{r.products}</p>
              <p className="mt-1 text-xs text-gray-400">Origin partner: {r.partner}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-xl font-bold text-gray-900">How We Work</h2>
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {CARDS.map((item) => (
            <div key={item.title} className="rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-brand-700">{item.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
