'use client';

import { useEffect } from 'react';
import { trackPurchase } from '@/lib/analytics';

interface PurchaseTrackerProps {
  orderNumber: string;
  grandTotal: number;
  currency: string;
}

const STORAGE_PREFIX = 'pc_purchase_tracked_';

/**
 * Fires the `purchase` / `Purchase` / `CompletePayment` analytics event exactly once per
 * order (spec section 34).
 *
 * order-confirmation/[orderNumber]/page.tsx is a server component, so it can't call
 * gtag/fbq/ttq directly — this is the client-component "island" that mounts alongside the
 * confirmation UI just to fire that one event. The order-confirmation route is reachable
 * by more than just the post-checkout redirect (a bookmarked link, "Track Order", a
 * browser refresh), and none of those re-runs should double-count a purchase, so firing
 * is guarded by a sessionStorage flag keyed by orderNumber rather than firing unguarded on
 * every mount. sessionStorage (not localStorage) is intentional: it's scoped to the tab
 * that placed the order and clears when that tab closes, which is close enough to
 * "once per completed checkout" without needing any new backend state (e.g. an
 * order.analyticsTrackedAt column) for what is a best-effort client-side pixel fire.
 */
export function PurchaseTracker({ orderNumber, grandTotal, currency }: PurchaseTrackerProps) {
  useEffect(() => {
    const key = `${STORAGE_PREFIX}${orderNumber}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      // sessionStorage unavailable (privacy mode / disabled storage) — fall through and
      // track anyway; a rare duplicate event is preferable to silently dropping it.
    }
    trackPurchase({ orderNumber, grandTotal, currency });
  }, [orderNumber, grandTotal, currency]);

  return null;
}
