import Link from 'next/link';
import Image from 'next/image';

export function CtaSection() {
  return (
    <section className="relative overflow-hidden py-20 text-center text-white">
      <div className="absolute inset-0">
        <Image
          src="/images/logistics/shipping-containers-dock.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-brand-900/85" />
      </div>
      <div className="relative mx-auto max-w-3xl px-6">
        <h2 className="text-3xl font-bold md:text-4xl">Ready to source from Vietnam?</h2>
        <p className="mt-4 text-brand-100">
          Request wholesale pricing, become a distributor, or ask for a product sample.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/rfq"
            className="rounded-lg bg-white px-7 py-3.5 font-semibold text-brand-900 shadow-lifted transition hover:-translate-y-0.5 hover:bg-brand-50"
          >
            Request Wholesale Price
          </Link>
          <Link
            href="/wholesale"
            className="rounded-lg border border-white/70 px-7 py-3.5 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
          >
            Become Our Distributor
          </Link>
        </div>
      </div>
    </section>
  );
}
