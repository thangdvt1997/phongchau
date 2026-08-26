export const metadata = { title: 'Terms of Service' };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
      <p className="mt-2 text-sm text-gray-500">Last updated: 2026</p>

      <div className="prose prose-brand mt-8 max-w-none space-y-6 text-gray-700">
        <section>
          <h2 className="text-lg font-semibold text-gray-900">Orders &amp; pricing</h2>
          <p>
            Retail prices shown are per the listed unit/packaging. Wholesale (B2B) pricing is
            tiered by quantity or set per contract for approved accounts and may differ from the
            listed retail price. Prices are subject to change without notice until an order is
            confirmed.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-gray-900">RFQ &amp; quotations</h2>
          <p>
            A quotation issued in response to a Request for Quotation is valid until the date
            stated on the quotation. Accepting a quotation does not itself constitute a binding
            contract until a purchase order and, where applicable, deposit or payment terms are
            confirmed in writing.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-gray-900">Shipping &amp; delivery</h2>
          <p>
            Estimated delivery times are indicative and depend on destination, Incoterm, customs
            clearance, and carrier schedules. Title and risk transfer according to the agreed
            Incoterm for each order.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-gray-900">B2B accounts</h2>
          <p>
            Business accounts are subject to review and approval before wholesale pricing and
            credit terms are activated. We reserve the right to suspend an account for
            non-payment or breach of agreed terms.
          </p>
        </section>
      </div>
    </div>
  );
}
