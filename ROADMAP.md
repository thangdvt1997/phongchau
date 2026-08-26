# Roadmap — beyond P0

This repo's P0 build covers a working B2C+B2B agriculture/food commerce platform: catalog with
full agronomic/export data, cart, checkout, orders, RFQ workflow, B2B tier/contract pricing,
reviews/wishlist, CMS blog, SEO (sitemap/robots/JSON-LD), notifications, and an admin panel with
RBAC — all backed by a schema designed to extend without breaking changes.

Everything below is intentionally **not** built yet. It maps to the source spec
(`docs/Pormt.docx`) sections and to the P1/P2/P3 tiers that document explicitly asks for so the
MVP doesn't get over-engineered up front.

## P1 — Business
- **OEM/ODM workflow**: `OemRequest` table exists (spec section 8) but has no admin
  review/sample/pricing/approval/production/QC pipeline yet — model it after the RFQ state
  machine in `backend/src/modules/rfq/rfq.service.ts`.
- **Live logistics/carrier integration**: `ShippingService.calculateShipping()` in
  `backend/src/modules/shipping/shipping.service.ts` uses a flat placeholder rate table. Swap in
  real carrier APIs (DHL, FedEx, GHN, GHTK, Viettel Post, J&T) behind the same method signature.
- **Full WMS**: `InventoryModule` covers stock/reserve/release only. Picking, packing, cycle
  count, damaged/expired goods handling, and stock transfer between warehouses are not built.
- **Multi-currency/exchange rates**: schema stores a `currency` string per price-bearing row: wire
  up an exchange-rate provider and currency switcher instead of the current single-currency-per-
  record assumption.
- **Real payment gateways**: `VnpayPaymentProvider`/`StripePaymentProvider`
  (`backend/src/modules/payments/providers/`) are structurally complete but disabled — flip
  `PAYMENT_VNPAY_ENABLED`/`PAYMENT_STRIPE_ENABLED` once real sandbox/production keys exist.

## P2 — Growth
- **CRM pipeline UI**: `Lead` rows are created automatically from RFQ submissions
  (`backend/src/modules/rfq/rfq.service.ts`), but there's no admin lead board/kanban yet.
- **Marketing automation**: abandoned cart, back-in-stock, price-drop, and win-back emails —
  `NotificationsService.notify()` (`backend/src/modules/notifications/`) is the hook point; needs
  a scheduler (BullMQ is already a dependency) to trigger these on a cadence.
- **Advanced analytics**: `AdminService.getDashboardOverview()` covers revenue/AOV/top
  products/countries. GA4/GSC/GTM/Meta/TikTok Pixel wiring and cart/checkout funnel analytics are
  not implemented.
- **Elasticsearch/OpenSearch**: catalog search in `CatalogModule` is plain Postgres `contains`
  filtering — fine at P0 volume, swap in real search once the catalog grows.

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
