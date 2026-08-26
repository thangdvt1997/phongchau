'use client';

import { useEffect, useState } from 'react';
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

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-gray-200 p-4">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-sm text-gray-500">{label}</p>
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
    return <p className="text-sm text-red-600">{error ?? 'Failed to load dashboard.'}</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile label="Revenue (last 30 days)" value={formatMoney(data.revenue)} />
        <StatTile label="Orders" value={data.ordersCount} />
        <StatTile label="Customers" value={data.customersCount} />
        <StatTile label="Products" value={data.productsCount} />
        <StatTile label="Avg. Order Value" value={formatMoney(data.averageOrderValue)} />
        <StatTile label="RFQs (last 30 days)" value={data.rfqsCount} />
        <StatTile label="Pending B2B Leads" value={data.b2bLeadsCount} />
      </div>

      <div className="mt-6 rounded-md border border-gray-200 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Inventory Health</h2>
        <div className="mt-3 grid grid-cols-3 gap-4">
          <div>
            <p className={`text-xl font-bold ${data.inventory.lowStockCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {data.inventory.lowStockCount}
            </p>
            <p className="text-sm text-gray-500">Low stock items</p>
          </div>
          <div>
            <p className={`text-xl font-bold ${data.inventory.expiredBatchCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {data.inventory.expiredBatchCount}
            </p>
            <p className="text-sm text-gray-500">Expired batches</p>
          </div>
          <div>
            <p className={`text-xl font-bold ${data.inventory.upcomingExpiryCount > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
              {data.inventory.upcomingExpiryCount}
            </p>
            <p className="text-sm text-gray-500">Expiring in 30 days</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <h2 className="text-lg font-semibold text-gray-900">Top Products</h2>
          {data.topProducts.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">No sales yet.</p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 font-medium">Qty Sold</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.topProducts.map((p) => (
                  <tr key={p.productVariantId}>
                    <td className="py-2 text-gray-800">{p.productName}</td>
                    <td className="py-2 text-gray-600">{p.quantitySold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">Orders by Country</h2>
          {data.countries.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">No order geography data yet.</p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-2 font-medium">Country</th>
                  <th className="pb-2 font-medium">Orders</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.countries.map((c) => (
                  <tr key={c.country}>
                    <td className="py-2 text-gray-800">{c.country}</td>
                    <td className="py-2 text-gray-600">{c.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
