import Link from 'next/link';

export function CtaSection() {
  return (
    <section className="bg-brand-900 py-16 text-center text-white">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-2xl font-bold">Ready to source from Vietnam?</h2>
        <p className="mt-3 text-brand-100">
          Request wholesale pricing, become a distributor, or ask for a product sample.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <Link href="/rfq" className="rounded-md bg-white px-6 py-3 font-semibold text-brand-900">
            Request Wholesale Price
          </Link>
          <Link
            href="/wholesale"
            className="rounded-md border border-white px-6 py-3 font-semibold text-white hover:bg-white/10"
          >
            Become Our Distributor
          </Link>
        </div>
      </div>
    </section>
  );
}
