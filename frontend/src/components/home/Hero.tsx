import Link from 'next/link';

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-700 to-brand-600 text-white">
      <div className="mx-auto max-w-7xl px-6 py-24 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-100">
          Sourced by Region, Exported to Spec
        </p>
        <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
          Dak Lak Coffee, Binh Phuoc Cashew,
          <br />
          Phu Quoc Pepper, Ben Tre Coconut, An Giang Rice
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-brand-50">
          We work directly with farm cooperatives across five growing regions of Vietnam,
          process under HACCP and ISO 22000-controlled facilities, and export under FOB,
          CIF, EXW, CFR, and DDP terms — with a batch/lot number behind every shipment.
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
