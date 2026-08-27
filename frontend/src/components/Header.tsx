'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useCurrency } from '@/context/CurrencyContext';
import viMessages from '../../messages/vi.json';
import enMessages from '../../messages/en.json';

// Header is rendered once by the root layout (`app/layout.tsx`), which is shared by BOTH the
// locale-prefixed storefront (`/vi/**`, `/en/**`) and the untouched, unprefixed `/admin/**`
// tree — so it sits outside the NextIntlClientProvider boundary (that provider only wraps
// `app/[locale]/**`). Rather than depend on `useTranslations()` (which would throw on admin
// pages) this component detects locale from the URL itself and reads directly from the
// message JSON files. On admin routes it deliberately falls back to the exact original
// English labels/unprefixed hrefs so the admin panel's rendered output never changes.
const MESSAGES = { vi: viMessages, en: enMessages } as const;

type NavKey = 'products' | 'wholesale' | 'requestQuote' | 'oem' | 'logistics' | 'support' | 'about' | 'news' | 'contact';

const NAV_ITEMS: { key: NavKey; href: string }[] = [
  { key: 'products', href: '/products' },
  { key: 'wholesale', href: '/wholesale' },
  { key: 'requestQuote', href: '/rfq' },
  { key: 'oem', href: '/oem' },
  { key: 'logistics', href: '/logistics' },
  { key: 'support', href: '/account/support' },
  { key: 'about', href: '/about' },
  { key: 'news', href: '/blog' },
  { key: 'contact', href: '/contact' },
];

export function Header() {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const { selected, rates, setSelected } = useCurrency();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname() ?? '/';

  const isAdmin = pathname.startsWith('/admin');
  const locale: 'vi' | 'en' = pathname.startsWith('/en') ? 'en' : 'vi';
  const t = MESSAGES[locale].nav;

  // Admin keeps the original, unprefixed hrefs and English labels exactly as before.
  // Everywhere else, links carry the current locale prefix so navigation never drops the
  // visitor out of /vi/... or /en/....
  const prefix = isAdmin ? '' : `/${locale}`;
  const homeHref = isAdmin ? '/' : `/${locale}`;

  const navLinks = NAV_ITEMS.map((item) => ({
    href: `${prefix}${item.href}`,
    label: isAdmin ? ADMIN_FALLBACK_LABELS[item.key] : t[item.key],
  }));

  const restOfPath = pathname.replace(/^\/(vi|en)/, '') || '/';

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href={homeHref} className="flex items-center gap-2">
          <Image src="/logo-icon.png" alt="" width={36} height={27} priority className="h-9 w-auto" />
          <span className="text-xl font-bold text-brand-700">Phong Chau</span>
        </Link>
        <nav className="hidden gap-6 text-sm font-medium text-gray-700 lg:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-brand-600">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4 text-sm">
          {!isAdmin && (
            <div className="hidden items-center gap-1 sm:flex" role="group" aria-label={t.switchLanguage}>
              <Link
                href={`/vi${restOfPath}`}
                className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                  locale === 'vi' ? 'text-brand-700' : 'text-gray-400 hover:text-brand-600'
                }`}
              >
                {t.localeVi}
              </Link>
              <span className="text-gray-300">/</span>
              <Link
                href={`/en${restOfPath}`}
                className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                  locale === 'en' ? 'text-brand-700' : 'text-gray-400 hover:text-brand-600'
                }`}
              >
                {t.localeEn}
              </Link>
            </div>
          )}
          <label htmlFor="currency-switcher" className="sr-only">
            {isAdmin ? 'Display currency' : t.currencyLabel}
          </label>
          <select
            id="currency-switcher"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="hidden rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 sm:block"
          >
            {rates.map((r) => (
              <option key={r.targetCurrency} value={r.targetCurrency}>
                {r.targetCurrency}
              </option>
            ))}
          </select>
          <Link href={`${prefix}/cart`} className="relative font-medium text-gray-700 hover:text-brand-600">
            {isAdmin ? 'Cart' : t.cart}
            {cart && cart.itemCount > 0 && (
              <span className="ml-1 rounded-full bg-brand-600 px-2 py-0.5 text-xs text-white">
                {cart.itemCount}
              </span>
            )}
          </Link>
          <div className="hidden lg:block">
            {user ? (
              <div className="flex items-center gap-3">
                <Link href={`${prefix}/account`} className="font-medium text-gray-700 hover:text-brand-600">
                  {user.fullName}
                </Link>
                <button onClick={() => logout()} className="text-gray-500 hover:text-brand-600">
                  {isAdmin ? 'Sign out' : t.signOut}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link href={`${prefix}/login`} className="font-medium text-gray-700 hover:text-brand-600">
                  {isAdmin ? 'Sign in' : t.signIn}
                </Link>
                <Link
                  href={`${prefix}/register`}
                  className="rounded-md bg-brand-600 px-3 py-1.5 font-medium text-white hover:bg-brand-700"
                >
                  {isAdmin ? 'Register' : t.register}
                </Link>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? (isAdmin ? 'Close menu' : t.closeMenu) : isAdmin ? 'Open menu' : t.openMenu}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 text-gray-700 lg:hidden"
          >
            {mobileOpen ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav id="mobile-nav" className="border-t border-gray-200 bg-white px-6 py-4 lg:hidden">
          <ul className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-md px-2 py-2 hover:bg-gray-50 hover:text-brand-600"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          {!isAdmin && (
            <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3 text-sm sm:hidden">
              <span className="text-gray-400">{t.switchLanguage}:</span>
              <Link
                href={`/vi${restOfPath}`}
                className={`font-semibold ${locale === 'vi' ? 'text-brand-700' : 'text-gray-400'}`}
              >
                {t.localeVi}
              </Link>
              <span className="text-gray-300">/</span>
              <Link
                href={`/en${restOfPath}`}
                className={`font-semibold ${locale === 'en' ? 'text-brand-700' : 'text-gray-400'}`}
              >
                {t.localeEn}
              </Link>
            </div>
          )}
          <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
            <label htmlFor="currency-switcher-mobile" className="sr-only">
              {isAdmin ? 'Display currency' : t.currencyLabel}
            </label>
            <select
              id="currency-switcher-mobile"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 sm:hidden"
            >
              {rates.map((r) => (
                <option key={r.targetCurrency} value={r.targetCurrency}>
                  {r.targetCurrency}
                </option>
              ))}
            </select>
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  href={`${prefix}/account`}
                  onClick={() => setMobileOpen(false)}
                  className="font-medium text-gray-700 hover:text-brand-600"
                >
                  {user.fullName}
                </Link>
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    logout();
                  }}
                  className="text-gray-500 hover:text-brand-600"
                >
                  {isAdmin ? 'Sign out' : t.signOut}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href={`${prefix}/login`}
                  onClick={() => setMobileOpen(false)}
                  className="font-medium text-gray-700 hover:text-brand-600"
                >
                  {isAdmin ? 'Sign in' : t.signIn}
                </Link>
                <Link
                  href={`${prefix}/register`}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md bg-brand-600 px-3 py-1.5 font-medium text-white hover:bg-brand-700"
                >
                  {isAdmin ? 'Register' : t.register}
                </Link>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}

// Byte-identical to the pre-i18n English labels, used only when rendering on /admin/** so
// that panel's chrome never changes.
const ADMIN_FALLBACK_LABELS: Record<NavKey, string> = {
  products: 'Products',
  wholesale: 'Wholesale',
  requestQuote: 'Request Quote',
  oem: 'OEM / Private Label',
  logistics: 'Logistics',
  support: 'Support',
  about: 'About Us',
  news: 'News',
  contact: 'Contact',
};
