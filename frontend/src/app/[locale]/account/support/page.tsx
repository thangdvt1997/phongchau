'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/i18n/navigation';
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

export default function SupportListPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const t = useTranslations('accountSupportList');
  const tStatus = useTranslations('ticketStatus');
  const tCategory = useTranslations('ticketCategory');
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
        setError(err?.response?.data?.message ?? t('loadError'));
        setTickets([]);
      });
  }, [user, t]);

  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <Link
          href="/account/support/new"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {t('newTicket')}
        </Link>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {tickets === null ? (
        <p className="mt-6 text-sm text-gray-500">{t('loading')}</p>
      ) : tickets.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">
          {t('empty')}{' '}
          <Link href="/account/support/new" className="font-medium text-brand-700 hover:underline">
            {t('emptyLink')}
          </Link>
          .
        </p>
      ) : (
        <div className="mt-6 divide-y divide-gray-100 rounded-lg border border-gray-200">
          {tickets.map((tk) => (
            <Link
              key={tk.id}
              href={`/account/support/${tk.id}`}
              className="flex items-center justify-between gap-4 p-4 text-sm hover:bg-gray-50"
            >
              <div className="min-w-0">
                <p className="font-medium text-gray-800">{tk.subject}</p>
                <p className="text-gray-500">
                  {tk.ticketNumber} · {tCategory(tk.category as any)} · {new Date(tk.createdAt).toLocaleDateString()}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                  STATUS_STYLES[tk.status] ?? 'bg-gray-100 text-gray-600'
                }`}
              >
                {tStatus(tk.status as any)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
