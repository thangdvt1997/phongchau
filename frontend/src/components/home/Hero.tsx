import Link from 'next/link';
import { HeroBanner } from '@/components/marketing/HeroBanner';

export function Hero() {
  return (
    <HeroBanner
      image="/images/hero/home-rice-terraces.jpg"
      alt="Terraced rice fields in the Vietnamese highlands at golden hour"
      eyebrow="Sourced by Region, Exported to Spec"
    >
      <h1 className="text-4xl font-bold leading-[1.1] md:text-6xl">
        Dak Lak Coffee, Binh Phuoc Cashew,
        <br className="hidden md:block" />
        Phu Quoc Pepper, Ben Tre Coconut, An Giang Rice
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-base text-brand-50 md:text-lg">
        We work directly with farm cooperatives across five growing regions of Vietnam,
        process under HACCP and ISO 22000-controlled facilities, and export under FOB,
        CIF, EXW, CFR, and DDP terms — with a batch/lot number behind every shipment.
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-4">
        <Link
          href="/products"
          className="rounded-lg bg-white px-7 py-3.5 font-semibold text-brand-700 shadow-lifted transition hover:-translate-y-0.5 hover:bg-brand-50"
        >
          Shop Now
        </Link>
        <Link
          href="/rfq"
          className="rounded-lg border border-white/70 px-7 py-3.5 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
        >
          Request a Quote
        </Link>
        <Link
          href="/wholesale"
          className="rounded-lg border border-white/70 px-7 py-3.5 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
        >
          Become a Distributor
        </Link>
      </div>
    </HeroBanner>
  );
}
