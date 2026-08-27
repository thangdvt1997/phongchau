import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing, isValidLocale } from '@/i18n/routing';
import { LocaleHtmlLangSync } from '@/i18n/LocaleHtmlLangSync';

/**
 * NOTE on architecture: this is intentionally NOT the html/body-owning root layout that
 * next-intl's own docs show (they assume [locale] is the only top-level tree). Here,
 * `app/admin/**` is a sibling tree owned by a different, concurrently-running workstream and
 * must keep working completely unprefixed and untouched — it relies on the real root layout
 * (`app/layout.tsx`) for <html>/<body> and for AuthProvider/CartProvider/CurrencyProvider.
 * Turning the root layout into a bare pass-through (the usual next-intl convention) would have
 * silently broken admin auth. So this layout nests *inside* the unchanged root layout and only
 * adds what's locale-specific: message context, static-rendering opt-in, and (via
 * LocaleHtmlLangSync) a corrected <html lang>. Header/Footer keep rendering once, from the root
 * layout, and are translated via a pathname-based check rather than this provider — see
 * src/components/Header.tsx and Footer.tsx for why.
 */

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const { locale } = params;
  if (!isValidLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: 'meta' });
  const title = t('siteTitle');
  const description = t('siteDescription');
  return {
    title: { default: title, template: `%s | Phong Chau` },
    description,
    openGraph: { title, description },
    twitter: { title, description },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = params;
  if (!isValidLocale(locale)) notFound();

  // Enables static rendering for this locale's subtree (next-intl App Router convention).
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <LocaleHtmlLangSync locale={locale} />
      {children}
    </NextIntlClientProvider>
  );
}
