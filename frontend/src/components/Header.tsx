'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useCurrency } from '@/context/CurrencyContext';

const NAV_LINKS = [
  { href: '/products', label: 'Products' },
  { href: '/wholesale', label: 'Wholesale' },
  { href: '/rfq', label: 'Request Quote' },
  { href: '/oem', label: 'OEM / Private Label' },
  { href: '/logistics', label: 'Logistics' },
  { href: '/account/support', label: 'Support' },
  { href: '/about', label: 'About Us' },
  { href: '/blog', label: 'News' },
  { href: '/contact', label: 'Contact' },
];

export function Header() {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const { selected, rates, setSelected } = useCurrency();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo-icon.png" alt="" width={36} height={27} priority className="h-9 w-auto" />
          <span className="text-xl font-bold text-brand-700">Phong Chau</span>
        </Link>
        <nav className="hidden gap-6 text-sm font-medium text-gray-700 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-brand-600">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4 text-sm">
          <label htmlFor="currency-switcher" className="sr-only">
            Display currency
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
          <Link href="/cart" className="relative font-medium text-gray-700 hover:text-brand-600">
            Cart
            {cart && cart.itemCount > 0 && (
              <span className="ml-1 rounded-full bg-brand-600 px-2 py-0.5 text-xs text-white">
                {cart.itemCount}
              </span>
            )}
          </Link>
          <div className="hidden lg:block">
            {user ? (
              <div className="flex items-center gap-3">
                <Link href="/account" className="font-medium text-gray-700 hover:text-brand-600">
                  {user.fullName}
                </Link>
                <button onClick={() => logout()} className="text-gray-500 hover:text-brand-600">
                  Sign out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/login" className="font-medium text-gray-700 hover:text-brand-600">
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="rounded-md bg-brand-600 px-3 py-1.5 font-medium text-white hover:bg-brand-700"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
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
            {NAV_LINKS.map((link) => (
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
          <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
            <label htmlFor="currency-switcher-mobile" className="sr-only">
              Display currency
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
                  href="/account"
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
                  Sign out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="font-medium text-gray-700 hover:text-brand-600"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md bg-brand-600 px-3 py-1.5 font-medium text-white hover:bg-brand-700"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
