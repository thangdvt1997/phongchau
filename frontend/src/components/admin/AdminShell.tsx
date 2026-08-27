'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'SALES', 'WAREHOUSE_STAFF', 'CUSTOMER_SERVICE', 'MARKETING_SEO'];

interface NavItem {
  href: string;
  label: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

/**
 * Grouped sidebar nav. Sections mirror how the business actually thinks about this panel —
 * Catalog vs. Sales & Operations vs. CRM vs. Customer Service vs. Content — instead of one
 * flat undifferentiated list.
 */
const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Overview',
    items: [{ href: '/admin', label: 'Dashboard' }],
  },
  {
    label: 'Catalog',
    items: [
      { href: '/admin/products', label: 'Products' },
      { href: '/admin/products/import', label: 'Import Products' },
      { href: '/admin/categories', label: 'Categories' },
    ],
  },
  {
    label: 'Sales & Operations',
    items: [
      { href: '/admin/orders', label: 'Orders' },
      { href: '/admin/rfq', label: 'RFQs' },
      { href: '/admin/oem', label: 'OEM/ODM Requests' },
      { href: '/admin/b2b', label: 'B2B Companies' },
      { href: '/admin/inventory', label: 'Inventory' },
      { href: '/admin/currency', label: 'Currency' },
    ],
  },
  {
    label: 'CRM',
    items: [{ href: '/admin/leads', label: 'Leads' }],
  },
  {
    label: 'Customer Service',
    items: [{ href: '/admin/support', label: 'Support Tickets' }],
  },
  {
    label: 'Content (CMS)',
    items: [{ href: '/admin/blog', label: 'Blog / Articles' }],
  },
];

const ALL_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);

/** Longest-prefix match against the nav so nested routes (e.g. /admin/orders/123) inherit their list page's title. */
function pageTitleFor(pathname: string): string {
  if (pathname === '/admin') return 'Dashboard';
  const candidates = ALL_ITEMS.filter((i) => i.href !== '/admin' && pathname.startsWith(i.href));
  const match = candidates.sort((a, b) => b.href.length - a.href.length)[0];
  return match?.label ?? 'Admin Panel';
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Wraps every /admin/* page: redirects non-staff away, renders the grouped sidebar + top bar shell. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && (!user || !ADMIN_ROLES.includes(user.role))) {
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading || !user || !ADMIN_ROLES.includes(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-400">
        Loading admin panel...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col bg-slate-900">
        <div className="flex items-center gap-2.5 border-b border-slate-800 px-5 py-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-500 text-sm font-bold text-slate-900">
            PC
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">Phong Chau</p>
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Admin Panel</p>
          </div>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="mb-2 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block rounded-lg border-l-2 px-3 py-2 text-sm font-medium transition-colors ${
                        active
                          ? 'border-teal-400 bg-slate-800 text-white'
                          : 'border-transparent text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-800 px-4 py-4">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-slate-200">
              {(user.fullName || user.email || 'A').slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-200">{user.fullName}</p>
              <p className="truncate text-xs uppercase tracking-wide text-slate-500">
                {user.role.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="w-full rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col pl-64">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-8 py-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Admin — {user.role.replace(/_/g, ' ')}</p>
            <h1 className="text-lg font-semibold text-gray-900">{pageTitleFor(pathname)}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-400 sm:flex">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
              </svg>
              <span>Search...</span>
            </div>
            <button
              type="button"
              aria-label="Notifications"
              className="relative rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </button>
          </div>
        </header>

        <main className="flex-1 px-8 py-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
