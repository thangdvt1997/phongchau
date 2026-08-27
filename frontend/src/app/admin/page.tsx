'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { formatMoney } from '@/lib/format';

interface TopProduct {
  productVariantId: string;
  productName: string;
  productSlug: string | null;
  quantitySold: number;
}

interface CountryCount {
  country: string;
  count: number;
}

interface DashboardOverview {
  revenue: number;
  ordersCount: number;
  customersCount: number;
  productsCount: number;
  averageOrderValue: number;
  rfqsCount: number;
  b2bLeadsCount: number;
  topProducts: TopProduct[];
  countries: CountryCount[];
  inventory: {
    lowStockCount: number;
    expiredBatchCount: number;
    upcomingExpiryCount: number;
  };
}

const QUICK_LINKS = [
  {
    section: 'Catalog',
    description: 'Products, variants and category lookups',
    href: '/admin/products',
    accent: 'bg-teal-50 text-teal-700',
  },
  {
    section: 'Sales & Operations',
    description: 'Orders, RFQs, OEM/ODM, B2B accounts, inventory',
    href: '/admin/orders',
    accent: 'bg-indigo-50 text-indigo-700',
  },
  {
    section: 'CRM',
    description: 'Lead pipeline and activity timeline',
    href: '/admin/leads',
    accent: 'bg-amber-50 text-amber-700',
  },
  {
    section: 'Customer Service',
    description: 'Support ticket queue',
    href: '/admin/support',
    accent: 'bg-rose-50 text-rose-700',
  },
  {
    section: 'Content (CMS)',
    description: 'Blog and article management',
    href: '/admin/blog',
    accent: 'bg-violet-50 text-violet-700',
  },
] as const;

function StatCard({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  tone?: 'default' | 'danger' | 'warning';
}) {
  const valueColor =
    tone === 'danger' ? 'text-rose-600' : tone === 'warning' ? 'text-amber-600' : 'text-gray-900';
  return (
    <div className="rounded-xl2 border border-gray-200 bg-white p-5 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${valueColor}`}>{value}</p>
    </div>
  );
}

function DataTable({
  columns,
  rows,
  emptyLabel,
}: {
  columns: string[];
  rows: [string, React.ReactNode][];
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="mt-3 rounded-xl2 border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
        {emptyLabel}
      </div>
    );
  }
  return (
    <div className="mt-3 overflow-hidden rounded-xl2 border border-gray-200 bg-white shadow-card">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            {columns.map((c) => (
              <th key={c} className="px-4 py-2.5">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(([key, row]) => (
            <tr key={key} className="transition-colors hover:bg-gray-50">
              {row}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get('/admin/dashboard/overview')
      .then(({ data }) => setData(data))
      .catch((err) => setError(err?.response?.data?.message ?? 'Failed to load dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-gray-500">Loading dashboard...</p>;
  }

  if (error || !data) {
    return (
      <div className="rounded-xl2 border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        {error ?? 'Failed to load dashboard.'}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Business snapshot across the last 30 days.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <StatCard label="Revenue (30d)" value={formatMoney(data.revenue)} />
        <StatCard label="Orders" value={data.ordersCount} />
        <StatCard label="Customers" value={data.customersCount} />
        <StatCard label="Products" value={data.productsCount} />
        <StatCard label="Avg. Order Value" value={formatMoney(data.averageOrderValue)} />
        <StatCard label="RFQs (30d)" value={data.rfqsCount} />
        <StatCard label="Pending B2B Leads" value={data.b2bLeadsCount} />
      </div>

      <div className="mt-6 rounded-xl2 border border-gray-200 bg-white p-6 shadow-card">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Inventory Health</h2>
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div>
            <p
              className={`text-2xl font-bold ${
                data.inventory.lowStockCount > 0 ? 'text-rose-600' : 'text-gray-900'
              }`}
            >
              {data.inventory.lowStockCount}
            </p>
            <p className="mt-1 text-sm text-gray-500">Low stock items</p>
          </div>
          <div>
            <p
              className={`text-2xl font-bold ${
                data.inventory.expiredBatchCount > 0 ? 'text-rose-600' : 'text-gray-900'
              }`}
            >
              {data.inventory.expiredBatchCount}
            </p>
            <p className="mt-1 text-sm text-gray-500">Expired batches</p>
          </div>
          <div>
            <p
              className={`text-2xl font-bold ${
                data.inventory.upcomingExpiryCount > 0 ? 'text-amber-600' : 'text-gray-900'
              }`}
            >
              {data.inventory.upcomingExpiryCount}
            </p>
            <p className="mt-1 text-sm text-gray-500">Expiring in 30 days</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <h2 className="text-lg font-semibold text-gray-900">Top Products</h2>
          <DataTable
            columns={['Product', 'Qty Sold']}
            emptyLabel="No sales yet."
            rows={data.topProducts.map((p) => [
              p.productVariantId,
              <>
                <td className="px-4 py-2.5 text-gray-800">{p.productName}</td>
                <td className="px-4 py-2.5 text-gray-600">{p.quantitySold}</td>
              </>,
            ])}
          />
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">Orders by Country</h2>
          <DataTable
            columns={['Country', 'Orders']}
            emptyLabel="No order geography data yet."
            rows={data.countries.map((c) => [
              c.country,
              <>
                <td className="px-4 py-2.5 text-gray-800">{c.country}</td>
                <td className="px-4 py-2.5 text-gray-600">{c.count}</td>
              </>,
            ])}
          />
        </section>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Jump to a section</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.section}
              href={link.href}
              className="group rounded-xl2 border border-gray-200 bg-white p-5 shadow-card transition-shadow hover:shadow-lifted"
            >
              <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${link.accent}`}>
                {link.section}
              </span>
              <p className="mt-3 text-sm text-gray-500">{link.description}</p>
              <p className="mt-3 text-sm font-medium text-teal-700 group-hover:text-teal-800">
                Open {link.section} →
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
