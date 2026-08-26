export const metadata = { title: 'Privacy Policy' };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-gray-500">Last updated: 2026</p>

      <div className="prose prose-brand mt-8 max-w-none space-y-6 text-gray-700">
        <section>
          <h2 className="text-lg font-semibold text-gray-900">What we collect</h2>
          <p>
            When you create an account, request a quote, register as a B2B partner, or place an
            order, we collect the information you provide directly: name, email, phone, company
            details, shipping/billing address, and order history. We do not store raw payment
            card data — payments are handled through the payment method you select at checkout.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-gray-900">How we use it</h2>
          <p>
            We use your information to process orders and RFQs, manage your account, calculate
            wholesale/contract pricing, communicate order and shipment status, and respond to
            support requests. We do not sell your personal data to third parties.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-gray-900">Cookies &amp; local storage</h2>
          <p>
            We use browser storage to keep you signed in and to remember your shopping cart
            (including for guest checkout, via a cart session identifier). This is essential to
            the site functioning and is not used for third-party advertising tracking.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-gray-900">Your rights</h2>
          <p>
            You can request access to, correction of, or deletion of your personal data at any
            time by contacting us through the <a href="/contact" className="text-brand-700 underline">Contact page</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
