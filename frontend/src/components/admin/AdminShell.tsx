'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'SALES', 'WAREHOUSE_STAFF', 'CUSTOMER_SERVICE', 'MARKETING_SEO'];

const NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/inventory', label: 'Inventory' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/rfq', label: 'RFQs' },
  { href: '/admin/b2b', label: 'B2B Companies' },
  { href: '/admin/leads', label: 'Leads' },
  { href: '/admin/blog', label: 'Blog / CMS' },
];

/** Wraps every /admin/* page: redirects non-staff away, renders the sidebar shell. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && (!user || !ADMIN_ROLES.includes(user.role))) {
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading || !user || !ADMIN_ROLES.includes(user.role)) {
    return <div className="flex min-h-[60vh] items-center justify-center text-gray-500">Loading admin panel...</div>;
  }

  return (
    <div className="mx-auto flex max-w-7xl gap-8 px-6 py-8">
      <aside className="w-56 shrink-0">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Admin — {user.role.replace('_', ' ')}
        </p>
        <nav className="space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-md px-3 py-2 text-sm font-medium ${
                pathname === item.href
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
