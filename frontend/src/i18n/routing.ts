import { defineRouting } from 'next-intl/routing';

// Vietnamese is the default locale — this is fundamentally a Vietnamese business's site.
// English is a secondary, fully supported locale. `localePrefix: 'always'` means even the
// default locale is prefixed (`/vi/...`), which is the simplest, most predictable scheme to
// implement and reason about (no special-cased unprefixed routes to keep in sync).
export const routing = defineRouting({
  locales: ['vi', 'en'],
  defaultLocale: 'vi',
  localePrefix: 'always',
});

export type AppLocale = (typeof routing.locales)[number];

// next-intl v3.x (this project is pinned to next@14.2.15, which v4's `hasLocale`/
// `next/root-params`-based API doesn't support) has no exported `hasLocale` helper — that
// was added in v4. This is the equivalent type-narrowing check for v3.
export function isValidLocale(value: string | undefined): value is AppLocale {
  return !!value && (routing.locales as readonly string[]).includes(value);
}
