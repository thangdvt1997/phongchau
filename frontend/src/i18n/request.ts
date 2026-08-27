import { getRequestConfig } from 'next-intl/server';
import { routing, isValidLocale } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  // `requestLocale` is populated by the [locale] segment via the middleware. Next.js 14
  // doesn't have `next/root-params`, so this "requestLocale" pattern (next-intl's
  // pre-Next-16 API) is the correct one here — see routing.ts / middleware.ts.
  const requested = await requestLocale;
  const locale = isValidLocale(requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
