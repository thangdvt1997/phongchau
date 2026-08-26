import Link from 'next/link';
import { HeroBanner } from '@/components/marketing/HeroBanner';

export const metadata = { title: 'Wholesale / B2B' };

const TIERS = [
  { range: '1–99 kg', price: '$5.00 / kg' },
  { range: '100–499 kg', price: '$4.50 / kg' },
  { range: '500–999 kg', price: '$4.00 / kg' },
  { range: '1,000+ kg', price: 'Contact Sales' },
];

const STEPS = [
  'Register your business account with company and tax details.',
  'Our sales team reviews your application and approves the account.',
  'View wholesale tier pricing, plus any negotiated contract pricing, on your account.',
  'Submit an RFQ for custom quantity, packaging, or export requirements — sales reviews it and issues a formal quotation.',
];

export default function WholesalePage() {
  return (
    <div>
      <HeroBanner
        image="/images/business/handshake-deal.jpg"
        alt="Business partners shaking hands to close a deal"
        eyebrow="Distributors & Wholesale Buyers"
        size="md"
      >
        <h1 className="text-4xl font-bold md:text-5xl">Wholesale &amp; B2B</h1>
        <p className="mt-5 text-brand-50 md:text-lg">
          We serve distributors, wholesalers, supermarkets, restaurants, factories, and
          international importers with tiered volume pricing, negotiated contract pricing, an
          RFQ-based quotation process, purchase orders, invoicing, and flexible payment terms
          (Net 7/15/30, L/C, T/T, 30/70).
        </p>
      </HeroBanner>

      <div className="mx-auto max-w-5xl px-6 py-16 md:py-24">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
          <div className="rounded-xl2 border border-gray-100 bg-white p-8 shadow-card">
            <p className="section-eyebrow">Illustrative Pricing</p>
            <h2 className="mt-2 text-xl font-semibold text-gray-900">Example Tier Pricing</h2>
            <table className="mt-5 w-full text-sm">
              <tbody>
                {TIERS.map((t) => (
                  <tr key={t.range} className="border-b border-gray-100 last:border-0">
                    <td className="py-3 text-gray-600">{t.range}</td>
                    <td className="py-3 text-right font-semibold text-gray-900">{t.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-gray-400">
              Illustrative — actual pricing is quoted per product and account.
            </p>
          </div>

          <div>
            <p className="section-eyebrow">Onboarding</p>
            <h2 className="mt-2 text-xl font-semibold text-gray-900">How It Works</h2>
            <ol className="mt-5 space-y-4">
              {STEPS.map((step, idx) => (
                <li key={step} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                    {idx + 1}
                  </span>
                  <p className="pt-1 text-sm text-gray-600">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="mt-14 flex flex-wrap gap-4 border-t border-gray-100 pt-10">
          <Link
            href="/register/b2b"
            className="rounded-lg bg-brand-600 px-7 py-3.5 font-semibold text-white shadow-card transition hover:-translate-y-0.5 hover:bg-brand-700"
          >
            Apply for a B2B Account
          </Link>
          <Link
            href="/rfq"
            className="rounded-lg border border-brand-600 px-7 py-3.5 font-semibold text-brand-700 transition hover:-translate-y-0.5 hover:bg-brand-50"
          >
            Request a Quote
          </Link>
        </div>
      </div>
    </div>
  );
}
