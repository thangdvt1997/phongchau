# Roadmap — beyond P0

This repo's P0 build covers a working B2C+B2B agriculture/food commerce platform: catalog with
full agronomic/export data, cart, checkout, orders, RFQ workflow, B2B tier/contract pricing,
reviews/wishlist, CMS blog, SEO (sitemap/robots/JSON-LD), notifications, and an admin panel with
RBAC — all backed by a schema designed to extend without breaking changes.

## P1 — Business — status
- **OEM/ODM workflow** ✅ done. `backend/src/modules/oem/` — full Request → Review → Sample →
  Pricing → Approval → Production → QC → Delivery pipeline mirroring the RFQ state machine
  (`ALLOWED_TRANSITIONS` in `oem.service.ts`), customer request form (`/oem`) + message thread +
  admin management UI (`/admin/oem`).
- **Full WMS** ✅ done (stock transfer + cycle count + damaged/expired write-off). Extended
  `InventoryModule`: `stock-transfer.service.ts` (atomic warehouse-to-warehouse moves via
  `$transaction`), `cycle-count.service.ts` (expected-vs-actual with auto-adjustment), and
  `DAMAGE`/`EXPIRE` added to the existing adjust-stock flow. UI lives on the existing
  `/admin/inventory` page. Picking/packing workflow (physical warehouse floor operations) is
  still not built — genuinely out of scope for a web admin panel without barcode/RF hardware.
- **Multi-currency** ✅ done, **display-only by design**. `backend/src/modules/currency/` —
  admin-managed `ExchangeRate` rows, `GET /currency/rates` + `/currency/convert`, a header
  currency switcher, and converted-price display on product cards/detail (VND stays visually
  primary). Orders/payments/cart still settle in VND only — actually charging in a foreign
  currency (payment gateway multi-currency support, FX rate locking at order time, accounting
  implications) is real scope and remains future work.
- **Live logistics/carrier integration**: `ShippingService.calculateShipping()` in
  `backend/src/modules/shipping/shipping.service.ts` uses a flat placeholder rate table. Swap in
  real carrier APIs (DHL, FedEx, GHN, GHTK, Viettel Post, J&T) behind the same method signature.
  Not started — needs real carrier API credentials.
- **Real payment gateways**: `VnpayPaymentProvider`/`StripePaymentProvider`
  (`backend/src/modules/payments/providers/`) are structurally complete but disabled — flip
  `PAYMENT_VNPAY_ENABLED`/`PAYMENT_STRIPE_ENABLED` once real sandbox/production keys exist. Not
  started — needs real gateway credentials.
- **VietQR bank transfer** ✅ done, real and enabled by default (no gateway keys needed).
  `backend/src/modules/payments/providers/vietqr.provider.ts` + `frontend/src/lib/vietqr.ts` build
  a scannable QR (`img.vietqr.io`) client-side from the bank BIN + account number
  (`VIETQR_BANK_BIN`/`VIETQR_ACCOUNT_NO`/`VIETQR_ACCOUNT_NAME` in `.env` — currently TPBank
  01294064001). No webhook exists for a bank-account QR, so payment confirmation is still manual
  (admin marks-paid, same as `BANK_TRANSFER`) — a real bank-API webhook remains future work.

## P2 — Growth
- **CRM pipeline UI** ✅ done. `backend/src/modules/crm/` — `board()`/`assignableStaff()`/`update()`
  endpoints (role/FK-validated) backing a native-HTML5-drag-and-drop Kanban at `/admin/leads`,
  covering all `LeadStatus` columns. `Lead` rows still originate from RFQ submissions as before.
  Extended with a full lead detail view (`/admin/leads/[id]`) showing a `LeadActivity` timeline
  (notes/calls/emails/meetings/tasks), auto-logging a `STATUS_CHANGE` entry whenever the board
  moves a lead, so the timeline is a complete audit trail without every caller remembering to
  log it.
- **Customer service (CSM) ticketing** ✅ done. `backend/src/modules/support/` — `SupportTicket`
  + `TicketMessage`, a status machine (OPEN/IN_PROGRESS/WAITING_ON_CUSTOMER/RESOLVED/CLOSED) that
  auto-flips on reply, customer-facing pages under `/account/support` (guests can also open a
  ticket with just an email), and an admin queue at `/admin/support`. Cross-user ticket access
  returns 404, not 403, so a ticket's existence is never leaked by ID guessing.
- **Marketing automation** ✅ done. `backend/src/modules/marketing/marketing-automation.service.ts`
  — welcome email, abandoned cart, back-in-stock, price-drop, review request, and win-back
  triggers, `@Cron()`-scheduled via `@nestjs/schedule`. Dedup reuses the existing `Notification`
  log table (no new schema) via exact `event` + time-window + JSON-path matching — see
  `hasRecentNotification()` if adding a new trigger. Stock-transfer/cycle-count completions do not
  fire back-in-stock (only `InventoryService.adjust()`'s IN/ADJUST path does); revisit if that gap
  matters.
- **Advanced analytics** ✅ done, display/tracking layer only. `AdminService.getDashboardOverview()`
  still covers revenue/AOV/top products/countries server-side. `frontend/src/components/Analytics.tsx`
  + `frontend/src/lib/analytics.ts` add env-gated GA4/GTM/Meta Pixel/TikTok Pixel loaders and
  view_item/add_to_cart/begin_checkout/purchase funnel events — fully inert with no IDs configured
  (`NEXT_PUBLIC_GA4_MEASUREMENT_ID` etc. in `.env`), same pattern as the disabled payment providers.
- **OpenSearch product search** ✅ done. `backend/src/modules/search/` wraps the
  `@opensearch-project/opensearch` client; `ProductsService` fire-and-forget indexes on
  create/update/delete, `CatalogService`'s `?q=` search tries OpenSearch first and falls back
  unconditionally to the original Postgres `contains` filtering whenever OpenSearch is disabled,
  unreachable, or returns an error — that fallback is permanent, not a migration shim. Runs as a
  single-node `opensearchproject/opensearch:2` container with a 256MB heap (shared test server);
  reindex via `POST /admin/search/reindex`. `backend`'s `depends_on: opensearch` is intentionally
  NOT health-gated, so a crashed/OOM'd/slow-starting OpenSearch never blocks the backend/storefront
  from starting.

## P3 — Enterprise
- **ERP / accounting / POS integrations**: `docs/Pormt.docx` section 41 calls for
  adapter interfaces so vendors are never hard-coded into business logic — the `PaymentProvider`,
  `NotificationChannelProvider`, and `StorageService` interfaces in `backend/src/common/interfaces/`
  are the pattern to extend for these.
- **Marketplace integrations** (Shopee, Lazada, TikTok Shop, Amazon, eBay).
- **AI features**: recommendation engine, AI search, AI chatbot/support, AI-generated product/SEO
  copy, demand forecasting, dynamic pricing, fraud detection.
- **Full i18n**: only `vi`/`en` are wired; the spec calls for `ja`/`ko`/`zh` too. Category/product
  slugs already support per-locale routing conventions (`/en/products/...`, `/vi/san-pham/...`) —
  extend the dictionary set, not the routing shape.

## Smaller deliberate simplifications worth knowing about
- `SeoMetadata` is not a separate polymorphic table — SEO fields are embedded directly on
  `Product`/`Category`/`Blog` for type safety and simpler queries.
- Compare-products is frontend-only (localStorage), no `Compare` table.
- Tax is hardcoded to 0 in checkout (`OrdersService.checkout`) — no tax engine yet.
- Shipment weight at checkout is a placeholder heuristic (1kg per unit ordered), since
  `ProductVariant.weightLabel` is a descriptive string, not a parsed numeric weight.
