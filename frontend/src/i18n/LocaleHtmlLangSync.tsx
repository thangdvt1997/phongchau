'use client';

import { useEffect } from 'react';

/**
 * The document's <html lang> attribute is owned by the top-level `app/layout.tsx` (it's the
 * only layout allowed to render <html>/<body> — /admin/** is a sibling route tree that also
 * depends on that same root layout for its providers, so we deliberately did NOT turn it into
 * a next-intl-style pass-through, which is the more commonly seen convention but would have
 * dropped AuthProvider/CartProvider/CurrencyProvider from every admin page). Since the root
 * layout has no access to the [locale] segment, it can't set `lang` correctly by itself.
 * This tiny client-side sync corrects it post-hydration so assistive tech and the rendered
 * DOM reflect the active locale; the pre-hydration static HTML still says lang="en".
 */
export function LocaleHtmlLangSync({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
