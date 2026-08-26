import Link from 'next/link';

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-700 to-brand-600 text-white">
      <div className="mx-auto max-w-7xl px-6 py-24 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-100">
          Farm to Global Market
        </p>
        <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
          Vietnamese Agricultural Products,
          <br />
          Wholesale, OEM/ODM &amp; Export Logistics
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-brand-50">
          Cashew, coffee, pepper, rice, and coconut products — sourced directly from
          certified Vietnamese farms, processed to international standards, and shipped
          worldwide.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/products"
            className="rounded-md bg-white px-6 py-3 font-semibold text-brand-700 hover:bg-brand-50"
          >
            Shop Now
          </Link>
          <Link
            href="/rfq"
            className="rounded-md border border-white px-6 py-3 font-semibold text-white hover:bg-white/10"
          >
            Request a Quote
          </Link>
          <Link
            href="/wholesale"
            className="rounded-md border border-white px-6 py-3 font-semibold text-white hover:bg-white/10"
          >
            Become a Distributor
          </Link>
        </div>
      </div>
    </section>
  );
}
