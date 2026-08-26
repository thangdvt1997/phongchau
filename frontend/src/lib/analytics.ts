// Thin, typed wrappers around GA4 (gtag), Meta Pixel (fbq), and TikTok Pixel (ttq) —
// spec section 34 (Analytics). Every exported function here is safe to call
// unconditionally from anywhere in the app: each platform-specific call is guarded and
// silently no-ops if the corresponding global was never installed, which only happens
// when frontend/src/components/Analytics.tsx decided not to render that platform's
// loader script, which only happens when the matching NEXT_PUBLIC_*_ID env var is unset.
// No real tracking IDs exist in this test deployment — these become live the moment a
// real ID is set and the app is rebuilt, with zero code changes required.

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: ((...args: unknown[]) => void) & { callMethod?: unknown };
    ttq?: {
      track: (event: string, params?: Record<string, unknown>) => void;
      page: () => void;
      load: (pixelId: string) => void;
      [key: string]: unknown;
    };
  }
}

interface ViewItemInput {
  id: string;
  name: string;
  price: number;
  currency: string;
}

interface AddToCartInput {
  productId: string;
  name: string;
  price: number;
  currency: string;
  quantity: number;
}

interface BeginCheckoutInput {
  subtotal: number;
  currency: string;
  itemCount: number;
}

interface PurchaseInput {
  orderNumber: string;
  grandTotal: number;
  currency: string;
}

function gtagEvent(name: string, params: Record<string, unknown>): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', name, params);
}

function fbqTrack(name: string, params: Record<string, unknown>): void {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
  window.fbq('track', name, params);
}

function ttqTrack(name: string, params: Record<string, unknown>): void {
  if (typeof window === 'undefined' || !window.ttq || typeof window.ttq.track !== 'function') return;
  window.ttq.track(name, params);
}

/** GA4 `view_item` / Meta `ViewContent` / TikTok `ViewContent`. */
export function trackViewItem(product: ViewItemInput): void {
  gtagEvent('view_item', {
    currency: product.currency,
    value: product.price,
    items: [{ item_id: product.id, item_name: product.name, price: product.price }],
  });
  fbqTrack('ViewContent', {
    content_ids: [product.id],
    content_name: product.name,
    content_type: 'product',
    currency: product.currency,
    value: product.price,
  });
  ttqTrack('ViewContent', {
    contents: [{ content_id: product.id, content_name: product.name, price: product.price }],
    currency: product.currency,
    value: product.price,
  });
}

/** GA4 `add_to_cart` / Meta `AddToCart` / TikTok `AddToCart`. */
export function trackAddToCart(item: AddToCartInput): void {
  const value = item.price * item.quantity;
  gtagEvent('add_to_cart', {
    currency: item.currency,
    value,
    items: [
      {
        item_id: item.productId,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
      },
    ],
  });
  fbqTrack('AddToCart', {
    content_ids: [item.productId],
    content_name: item.name,
    content_type: 'product',
    currency: item.currency,
    value,
  });
  ttqTrack('AddToCart', {
    contents: [
      { content_id: item.productId, content_name: item.name, price: item.price, quantity: item.quantity },
    ],
    currency: item.currency,
    value,
  });
}

/** GA4 `begin_checkout` / Meta `InitiateCheckout` / TikTok `InitiateCheckout`. */
export function trackBeginCheckout(cart: BeginCheckoutInput): void {
  gtagEvent('begin_checkout', {
    currency: cart.currency,
    value: cart.subtotal,
  });
  fbqTrack('InitiateCheckout', {
    currency: cart.currency,
    value: cart.subtotal,
    num_items: cart.itemCount,
  });
  ttqTrack('InitiateCheckout', {
    currency: cart.currency,
    value: cart.subtotal,
  });
}

/**
 * GA4 `purchase` / Meta `Purchase` / TikTok `CompletePayment` (TikTok's standard-event
 * name for a completed order — deliberately not "Purchase", which is not one of TikTok's
 * current standard events).
 */
export function trackPurchase(order: PurchaseInput): void {
  gtagEvent('purchase', {
    transaction_id: order.orderNumber,
    currency: order.currency,
    value: order.grandTotal,
  });
  fbqTrack('Purchase', {
    currency: order.currency,
    value: order.grandTotal,
  });
  ttqTrack('CompletePayment', {
    currency: order.currency,
    value: order.grandTotal,
  });
}
