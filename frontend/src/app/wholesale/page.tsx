import Link from 'next/link';

export const metadata = { title: 'Wholesale / B2B' };

const TIERS = [
  { range: '1–99 kg', price: '$5.00 / kg' },
  { range: '100–499 kg', price: '$4.50 / kg' },
  { range: '500–999 kg', price: '$4.00 / kg' },
  { range: '1,000+ kg', price: 'Contact Sales' },
];

export default function WholesalePage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-3xl font-bold text-gray-900">Wholesale &amp; B2B</h1>
      <p className="mt-4 max-w-3xl text-gray-600">
        We serve distributors, wholesalers, supermarkets, restaurants, factories, and
        international importers with tiered volume pricing, contract pricing, RFQ/quotation
        workflows, purchase orders, invoicing, and flexible payment terms (Net 7/15/30, L/C,
        T/T, 30/70).
      </p>

      <div className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Example Tier Pricing</h2>
          <table className="mt-4 w-full text-sm">
            <tbody>
              {TIERS.map((t) => (
                <tr key={t.range} className="border-b border-gray-100">
                  <td className="py-2 text-gray-600">{t.range}</td>
                  <td className="py-2 text-right font-medium text-gray-900">{t.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-gray-400">
            Illustrative — actual pricing is quoted per product and account.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900">How It Works</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-gray-600">
            <li>Register your business account with company details.</li>
            <li>Our sales team reviews and approves your account.</li>
            <li>Unlock wholesale/tier pricing, contract pricing, and quick reorder.</li>
            <li>Submit RFQs for custom quantity, packaging, or export requirements.</li>
          </ol>
        </div>
      </div>

      <div className="mt-12 flex gap-4">
        <Link href="/register/b2b" className="rounded-md bg-brand-600 px-6 py-3 font-semibold text-white">
          Apply for a B2B Account
        </Link>
        <Link href="/rfq" className="rounded-md border border-brand-600 px-6 py-3 font-semibold text-brand-700">
          Request a Quote
        </Link>
      </div>
    </div>
  );
}
