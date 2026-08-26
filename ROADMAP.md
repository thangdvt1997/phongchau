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
