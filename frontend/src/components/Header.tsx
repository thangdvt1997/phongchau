'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';

const NAV_LINKS = [
  { href: '/products', label: 'Products' },
  { href: '/wholesale', label: 'Wholesale' },
  { href: '/rfq', label: 'Request Quote' },
  { href: '/logistics', label: 'Logistics' },
  { href: '/about', label: 'About Us' },
  { href: '/blog', label: 'News' },
  { href: '/contact', label: 'Contact' },
];

export function Header() {
  const { user, logout } = useAuth();
  const { cart } = useCart();

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
          <Link href="/cart" className="relative font-medium text-gray-700 hover:text-brand-600">
            Cart
            {cart && cart.itemCount > 0 && (
              <span className="ml-1 rounded-full bg-brand-600 px-2 py-0.5 text-xs text-white">
                {cart.itemCount}
              </span>
            )}
          </Link>
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
      </div>
    </header>
  );
}
