'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { formatRelativeTime } from '@/lib/format';

const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'QUOTATION', 'NEGOTIATION', 'WON', 'LOST'] as const;
const ACTIVITY_TYPES = ['NOTE', 'CALL', 'EMAIL', 'MEETING', 'TASK'] as const;

function formatEnumLabel(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const ACTIVITY_ICON: Record<string, string> = {
  NOTE: '📝',
  CALL: '📞',
  EMAIL: '✉️',
  MEETING: '🤝',
  STATUS_CHANGE: '🔄',
  TASK: '✅',
};

interface LeadActivity {
  id: string;
  type: string;
  content: string;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  author: { id: string; fullName: string } | null;
}

interface LeadDetail {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  source: string;
  status: string;
  message: string | null;
  createdAt: string;
  assignee: { id: string; fullName: string; email: string } | null;
  rfq: { id: string; rfqNumber: string; status: string } | null;
  activities: LeadActivity[];
}

export default function AdminLeadDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activityType, setActivityType] = useState<string>('NOTE');
  const [activityContent, setActivityContent] = useState('');
  const [activityDueAt, setActivityDueAt] = useState('');
  const [activitySubmitting, setActivitySubmitting] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);

  const [busyActivityId, setBusyActivityId] = useState<string | null>(null);

  function load() {
    apiClient
      .get(`/admin/leads/${params.id}`)
      .then(({ data }) => setLead(data))
      .catch((err) => {
        setLoadError(err?.response?.data?.message ?? 'Failed to load lead.');
      });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function submitActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!activityContent.trim()) return;
    setActivitySubmitting(true);
    setActivityError(null);
    try {
      await apiClient.post(`/admin/leads/${params.id}/activities`, {
        type: activityType,
        content: activityContent,
        dueAt: activityType === 'TASK' && activityDueAt ? activityDueAt : undefined,
      });
      setActivityContent('');
      setActivityDueAt('');
      setActivityType('NOTE');
      load();
    } catch (err: any) {
      setActivityError(err?.response?.data?.message ?? 'Failed to add activity.');
    } finally {
      setActivitySubmitting(false);
    }
  }

  async function completeTask(activityId: string) {
    setBusyActivityId(activityId);
    setActivityError(null);
    try {
      await apiClient.patch(`/admin/leads/activities/${activityId}/complete`);
      load();
    } catch (err: any) {
      setActivityError(err?.response?.data?.message ?? 'Failed to mark task complete.');
    } finally {
      setBusyActivityId(null);
    }
  }

  if (loadError) {
    return <div className="rounded-xl2 border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{loadError}</div>;
  }
  if (!lead) {
    return <p className="text-sm text-gray-500">Loading lead...</p>;
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{lead.fullName}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Status: <span className="font-semibold text-teal-700">{formatEnumLabel(lead.status)}</span>
            {' · '}
            Source: {formatEnumLabel(lead.source)}
          </p>
        </div>
        <button
          onClick={() => router.push('/admin/leads')}
          className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
        >
          Back to Leads
        </button>
      </div>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl2 border border-gray-200 bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold text-gray-900">Contact</h2>
          <dl className="mt-2 space-y-1 text-sm text-gray-700">
            <div>Email: {lead.email ?? '—'}</div>
            <div>Phone: {lead.phone ?? '—'}</div>
            <div>Company: {lead.companyName ?? '—'}</div>
            {lead.message && <div>Message: {lead.message}</div>}
          </dl>
        </div>
        <div className="rounded-xl2 border border-gray-200 bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold text-gray-900">Assignment</h2>
          <dl className="mt-2 space-y-1 text-sm text-gray-700">
            <div>Assignee: {lead.assignee ? `${lead.assignee.fullName} (${lead.assignee.email})` : 'Unassigned'}</div>
            <div>Created: {new Date(lead.createdAt).toLocaleString()}</div>
            {lead.rfq && <div>Linked RFQ: {lead.rfq.rfqNumber} ({lead.rfq.status})</div>}
          </dl>
        </div>
      </section>

      <section className="mt-6 rounded-xl2 border border-gray-200 bg-white p-6 shadow-card">
        <h2 className="text-lg font-semibold text-gray-900">Log Activity</h2>
        <form onSubmit={submitActivity} className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-3">
            <label htmlFor="activity-type" className="sr-only">
              Activity type
            </label>
            <select
              id="activity-type"
              value={activityType}
              onChange={(e) => setActivityType(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              {ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {formatEnumLabel(t)}
                </option>
              ))}
            </select>
            {activityType === 'TASK' && (
              <>
                <label htmlFor="activity-due-at" className="sr-only">
                  Due date
                </label>
                <input
                  id="activity-due-at"
                  type="date"
                  value={activityDueAt}
                  onChange={(e) => setActivityDueAt(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </>
            )}
          </div>
          <label htmlFor="activity-content" className="sr-only">
            Activity content
          </label>
          <textarea
            id="activity-content"
            placeholder={activityType === 'TASK' ? 'What needs to be done?' : 'What happened?'}
            value={activityContent}
            onChange={(e) => setActivityContent(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            rows={3}
          />
          {activityError && (
            <div className="rounded-xl2 border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{activityError}</div>
          )}
          <button
            type="submit"
            disabled={activitySubmitting || !activityContent.trim()}
            className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 disabled:opacity-50"
          >
            {activitySubmitting ? 'Saving...' : 'Add to Timeline'}
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-xl2 border border-gray-200 bg-white p-6 shadow-card">
        <h2 className="text-lg font-semibold text-gray-900">Timeline</h2>
        {lead.activities.length === 0 ? (
          <div className="mt-3 rounded-xl2 border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
            No activity logged yet.
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {lead.activities.map((a) => (
              <li key={a.id} className="rounded-lg border border-gray-200 bg-white p-4 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <span aria-hidden="true">{ACTIVITY_ICON[a.type] ?? '•'}</span>{' '}
                    {formatEnumLabel(a.type)}
                    {a.author && <span className="text-gray-400 normal-case"> — {a.author.fullName}</span>}
                  </span>
                  <span className="shrink-0 text-xs text-gray-400">{formatRelativeTime(a.createdAt)}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-gray-700">{a.content}</p>
                {a.type === 'TASK' && (
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    {a.dueAt && (
                      <span className="text-gray-500">Due {new Date(a.dueAt).toLocaleDateString()}</span>
                    )}
                    {a.completedAt ? (
                      <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Completed {new Date(a.completedAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <button
                        onClick={() => completeTask(a.id)}
                        disabled={busyActivityId === a.id}
                        className="rounded-lg border border-teal-300 px-2 py-1 font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-50"
                      >
                        Mark complete
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
