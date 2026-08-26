'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api-client';

interface TicketSummary {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  assignee: { id: string; fullName: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-blue-50 text-blue-700',
  IN_PROGRESS: 'bg-amber-50 text-amber-700',
  WAITING_ON_CUSTOMER: 'bg-purple-50 text-purple-700',
  RESOLVED: 'bg-green-50 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-600',
};

function formatEnumLabel(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function SupportListPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?next=/account/support');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    apiClient
      .get('/support')
      .then(({ data }) => setTickets(data))
      .catch((err) => {
        setError(err?.response?.data?.message ?? 'Failed to load your support tickets.');
        setTickets([]);
      });
  }, [user]);

  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
        <Link
          href="/account/support/new"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          New Ticket
        </Link>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {tickets === null ? (
        <p className="mt-6 text-sm text-gray-500">Loading tickets...</p>
      ) : tickets.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">
          You have not opened any support tickets yet.{' '}
          <Link href="/account/support/new" className="font-medium text-brand-700 hover:underline">
            Open one
          </Link>
          .
        </p>
      ) : (
        <div className="mt-6 divide-y divide-gray-100 rounded-lg border border-gray-200">
          {tickets.map((t) => (
            <Link
              key={t.id}
              href={`/account/support/${t.id}`}
              className="flex items-center justify-between gap-4 p-4 text-sm hover:bg-gray-50"
            >
              <div className="min-w-0">
                <p className="font-medium text-gray-800">{t.subject}</p>
                <p className="text-gray-500">
                  {t.ticketNumber} · {formatEnumLabel(t.category)} · {new Date(t.createdAt).toLocaleDateString()}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                  STATUS_STYLES[t.status] ?? 'bg-gray-100 text-gray-600'
                }`}
              >
                {formatEnumLabel(t.status)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
