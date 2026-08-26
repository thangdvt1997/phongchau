import Image from 'next/image';
import { HeroBanner } from '@/components/marketing/HeroBanner';

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
    image: '/images/about/farmer-rice-field.jpg',
    alt: 'Farmer working in a Vietnamese rice field',
  },
  {
    title: 'Processing',
    desc: 'Processing and packaging under HACCP and ISO 22000, with product-specific certifications including GlobalG.A.P, Organic, BRC, Halal, FDA, and VietGAP.',
    image: '/images/facility/processing-floor.jpg',
    alt: 'Food processing facility floor',
  },
  {
    title: 'Export',
    desc: 'Export documentation, HS coding, and shipping under FOB, CIF, EXW, CFR, and DDP terms, loaded from Cat Lai Port, Ho Chi Minh City.',
    image: '/images/logistics/shipping-containers-dock.jpg',
    alt: 'Shipping containers stacked at a port',
  },
];

export default function AboutPage() {
  return (
    <div>
      <HeroBanner
        image="/images/about/farmer-rice-field.jpg"
        alt="Farmer working in a Vietnamese rice field"
        eyebrow="Our Story"
        size="md"
      >
        <h1 className="text-4xl font-bold md:text-5xl">About Phong Chau</h1>
        <p className="mt-5 text-brand-50 md:text-lg">
          Connecting certified Vietnamese farms and cooperatives to global buyers — from
          individual retail customers to international distributors and importers.
        </p>
      </HeroBanner>

      <div className="mx-auto max-w-5xl px-6 py-16 md:py-24">
        <section className="grid grid-cols-1 gap-10 md:grid-cols-2 md:items-center">
          <div>
            <p className="section-eyebrow">Who We Are</p>
            <h2 className="mt-2 text-2xl font-bold text-gray-900">
              A full value-chain agriculture and export company
            </h2>
            <p className="mt-4 text-gray-600">
              Phong Chau is a Vietnamese agriculture, food processing, and export company connecting
              certified farms and cooperatives to global buyers. Our range covers cashew, coffee,
              pepper, rice, and coconut products, each tied to a specific growing region and origin
              partner.
            </p>
            <p className="mt-4 text-gray-600">
              We operate across the full value chain: sourcing from partner farms, in-house
              processing and quality control, packaging to export specification, warehousing in Ho
              Chi Minh City and Da Nang, and international logistics — with a batch/lot number
              behind every product, traceable from farm to customer.
            </p>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-xl2 shadow-lifted">
            <Image
              src="/images/facility/warehouse.jpg"
              alt="Warehouse storage filled with export-ready pallets"
              fill
              sizes="(max-width: 768px) 100vw, 40vw"
              className="object-cover"
            />
          </div>
        </section>

        <section className="mt-20">
          <p className="section-eyebrow">Origin Partners</p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900">Our Regions</h2>
          <p className="mt-2 text-gray-600">
            Each product in our catalog is sourced from a named region and origin partner.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {REGIONS.map((r) => (
              <div
                key={r.region}
                className="rounded-xl2 border border-gray-100 bg-white p-6 shadow-card transition hover:-translate-y-1 hover:shadow-soft"
              >
                <h3 className="font-semibold text-brand-700">{r.region}</h3>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-400">
                  {r.province} Province
                </p>
                <p className="mt-3 text-sm text-gray-600">{r.products}</p>
                <p className="mt-2 text-xs text-gray-400">Origin partner: {r.partner}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20">
          <p className="section-eyebrow">Our Process</p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900">How We Work</h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {CARDS.map((item) => (
              <div
                key={item.title}
                className="overflow-hidden rounded-xl2 border border-gray-100 bg-white shadow-card transition hover:-translate-y-1 hover:shadow-soft"
              >
                <div className="relative aspect-[4/3] w-full">
                  <Image
                    src={item.image}
                    alt={item.alt}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-semibold text-brand-700">{item.title}</h3>
                  <p className="mt-2 text-sm text-gray-600">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
