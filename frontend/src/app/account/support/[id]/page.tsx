'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api-client';

function formatEnumLabel(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

interface TicketMessage {
  id: string;
  message: string;
  attachmentUrl: string | null;
  isFromStaff: boolean;
  createdAt: string;
  sender: { id: string; fullName: string; role: string } | null;
}

interface TicketDetail {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  messages: TicketMessage[];
  assignee: { id: string; fullName: string } | null;
  order: { id: string; orderNumber: string; status: string } | null;
}

export default function SupportTicketDetailPage({ params }: { params: { id: string } }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [replyMessage, setReplyMessage] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/login?next=/account/support/${params.id}`);
    }
  }, [loading, user, router, params.id]);

  function load() {
    apiClient
      .get(`/support/${params.id}`)
      .then(({ data }) => setTicket(data))
      .catch((err) => {
        setLoadError(err?.response?.data?.message ?? 'Failed to load ticket.');
      });
  }

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, params.id]);

  async function submitReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyMessage.trim()) return;
    setReplySubmitting(true);
    setReplyError(null);
    try {
      await apiClient.post(`/support/${params.id}/messages`, { message: replyMessage });
      setReplyMessage('');
      load();
    } catch (err: any) {
      setReplyError(err?.response?.data?.message ?? 'Failed to send message.');
    } finally {
      setReplySubmitting(false);
    }
  }

  if (!user) return null;
  if (loadError) {
    return <p className="mx-auto max-w-3xl px-6 py-10 text-sm text-red-600">{loadError}</p>;
  }
  if (!ticket) {
    return <p className="mx-auto max-w-3xl px-6 py-10 text-sm text-gray-500">Loading ticket...</p>;
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <button onClick={() => router.push('/account/support')} className="text-sm text-gray-500 hover:underline">
        Back to my tickets
      </button>

      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{ticket.subject}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {ticket.ticketNumber} · {formatEnumLabel(ticket.category)}
            {ticket.order && ` · Order ${ticket.order.orderNumber}`}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
          {formatEnumLabel(ticket.status)}
        </span>
      </div>

      <section className="mt-6 space-y-3">
        {ticket.messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-md p-3 text-sm ${
              m.isFromStaff ? 'bg-brand-50 border border-brand-100' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-800">
                {m.isFromStaff ? `${m.sender?.fullName ?? 'Support'} (Support)` : m.sender?.fullName ?? 'You'}
              </span>
              <span className="text-xs text-gray-400">{new Date(m.createdAt).toLocaleString()}</span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-gray-700">{m.message}</p>
            {m.attachmentUrl && (
              <a
                href={m.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-xs text-brand-700 hover:underline"
              >
                Attachment
              </a>
            )}
          </div>
        ))}
      </section>

      <form onSubmit={submitReply} className="mt-6 flex gap-2">
        <label htmlFor="ticket-reply" className="sr-only">
          Reply
        </label>
        <textarea
          id="ticket-reply"
          placeholder="Write a reply..."
          value={replyMessage}
          onChange={(e) => setReplyMessage(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
          rows={3}
        />
        <button
          type="submit"
          disabled={replySubmitting}
          className="self-end rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Send
        </button>
      </form>
      {replyError && <p className="mt-2 text-sm text-red-600">{replyError}</p>}
    </div>
  );
}
