'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { formatRelativeTime } from '@/lib/format';

const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'QUOTATION', 'NEGOTIATION', 'WON', 'LOST'] as const;
type LeadStatusValue = (typeof LEAD_STATUSES)[number];

function formatEnumLabel(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const STATUS_LABELS = LEAD_STATUSES.reduce((acc, status) => {
  acc[status] = formatEnumLabel(status);
  return acc;
}, {} as Record<LeadStatusValue, string>);

interface BoardLead {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  source: string;
  createdAt: string;
  assignee: { id: string; fullName: string } | null;
}

interface BoardColumn {
  total: number;
  leads: BoardLead[];
}

type Board = Record<LeadStatusValue, BoardColumn>;

interface StaffOption {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

function emptyBoard(): Board {
  return LEAD_STATUSES.reduce((acc, status) => {
    acc[status] = { total: 0, leads: [] };
    return acc;
  }, {} as Board);
}

function findLeadStatus(board: Board | null, leadId: string): LeadStatusValue | null {
  if (!board) return null;
  for (const status of LEAD_STATUSES) {
    if (board[status].leads.some((lead) => lead.id === leadId)) return status;
  }
  return null;
}

/** Moves a lead card between two columns in local state, adjusting each column's total. */
function applyMove(board: Board, leadId: string, fromStatus: LeadStatusValue, toStatus: LeadStatusValue): Board {
  const fromColumn = board[fromStatus];
  const lead = fromColumn.leads.find((l) => l.id === leadId);
  if (!lead) return board;
  const toColumn = board[toStatus];
  return {
    ...board,
    [fromStatus]: {
      total: Math.max(0, fromColumn.total - 1),
      leads: fromColumn.leads.filter((l) => l.id !== leadId),
    },
    [toStatus]: {
      total: toColumn.total + 1,
      leads: [lead, ...toColumn.leads],
    },
  };
}

function applyAssignee(
  board: Board,
  status: LeadStatusValue,
  leadId: string,
  assignee: { id: string; fullName: string } | null,
): Board {
  const column = board[status];
  return {
    ...board,
    [status]: {
      ...column,
      leads: column.leads.map((l) => (l.id === leadId ? { ...l, assignee } : l)),
    },
  };
}

export default function AdminLeadsPage() {
  const [board, setBoard] = useState<Board | null>(null);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busyLeadId, setBusyLeadId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<LeadStatusValue | null>(null);

  useEffect(() => {
    let cancelled = false;
    setBoard(null);
    Promise.all([apiClient.get('/admin/leads/board'), apiClient.get('/admin/leads/assignable-staff')])
      .then(([boardRes, staffRes]) => {
        if (cancelled) return;
        setBoard(boardRes.data);
        setStaff(staffRes.data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.response?.data?.message ?? 'Failed to load leads.');
        setBoard(emptyBoard());
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function moveLead(leadId: string, fromStatus: LeadStatusValue, toStatus: LeadStatusValue) {
    if (fromStatus === toStatus) return;
    setBoard((prev) => (prev ? applyMove(prev, leadId, fromStatus, toStatus) : prev));
    setBusyLeadId(leadId);
    setError(null);
    try {
      await apiClient.patch(`/admin/leads/${leadId}`, { status: toStatus });
    } catch (err: any) {
      // Revert: the lead currently sits in toStatus (optimistic move already applied),
      // so moving it back is just the same operation run in reverse.
      setBoard((prev) => (prev ? applyMove(prev, leadId, toStatus, fromStatus) : prev));
      setError(err?.response?.data?.message ?? 'Failed to move lead.');
    } finally {
      setBusyLeadId(null);
    }
  }

  async function assignLead(leadId: string, status: LeadStatusValue, assigneeId: string) {
    if (!board) return;
    const previousAssignee = board[status].leads.find((l) => l.id === leadId)?.assignee ?? null;
    const nextAssignee = assigneeId ? staff.find((s) => s.id === assigneeId) ?? null : null;
    setBoard((prev) =>
      prev
        ? applyAssignee(
            prev,
            status,
            leadId,
            nextAssignee ? { id: nextAssignee.id, fullName: nextAssignee.fullName } : null,
          )
        : prev,
    );
    setBusyLeadId(leadId);
    setError(null);
    try {
      await apiClient.patch(`/admin/leads/${leadId}`, { assigneeId: assigneeId || null });
    } catch (err: any) {
      setBoard((prev) => (prev ? applyAssignee(prev, status, leadId, previousAssignee) : prev));
      setError(err?.response?.data?.message ?? 'Failed to update assignee.');
    } finally {
      setBusyLeadId(null);
    }
  }

  const normalizedSearch = search.trim().toLowerCase();
  function visibleLeads(column: BoardColumn): BoardLead[] {
    if (!normalizedSearch) return column.leads;
    return column.leads.filter(
      (lead) =>
        lead.fullName.toLowerCase().includes(normalizedSearch) ||
        (lead.email ?? '').toLowerCase().includes(normalizedSearch),
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
      <p className="mt-1 text-sm text-gray-500">
        Drag a card to a new column to change its status, or use the &quot;Move to&quot; control on the card.
      </p>

      <div className="mt-4 flex items-center gap-3">
        <label htmlFor="lead-search" className="text-sm font-medium text-gray-700">
          Search
        </label>
        <input
          id="lead-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-72 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      {error && (
        <div className="mt-4 rounded-xl2 border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      )}

      {board === null ? (
        <p className="mt-6 text-sm text-gray-500">Loading leads...</p>
      ) : (
        <div className="mt-6 flex gap-4 overflow-x-auto pb-4">
          {LEAD_STATUSES.map((status) => {
            const column = board[status];
            const visible = visibleLeads(column);
            return (
              <section
                key={status}
                aria-labelledby={`lead-column-${status}`}
                className={`w-72 shrink-0 rounded-xl2 border border-gray-200 bg-gray-50 p-3 ${
                  dragOverStatus === status ? 'ring-2 ring-teal-400 bg-teal-50/40' : ''
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragOverStatus(status);
                }}
                onDragLeave={(e) => {
                  const related = e.relatedTarget as Node | null;
                  if (!related || !e.currentTarget.contains(related)) {
                    setDragOverStatus((s) => (s === status ? null : s));
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverStatus(null);
                  const leadId = e.dataTransfer.getData('text/plain');
                  if (!leadId) return;
                  const fromStatus = findLeadStatus(board, leadId);
                  if (fromStatus && fromStatus !== status) {
                    moveLead(leadId, fromStatus, status);
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <h2 id={`lead-column-${status}`} className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {STATUS_LABELS[status]}
                  </h2>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-500 ring-1 ring-gray-200">
                    {normalizedSearch ? `${visible.length} / ${column.total}` : column.total}
                  </span>
                </div>

                <ul className="mt-3 max-h-[65vh] space-y-2 overflow-y-auto">
                  {visible.length === 0 ? (
                    <li className="rounded-lg border border-dashed border-gray-300 p-3 text-center text-xs text-gray-400">
                      {normalizedSearch ? 'No matches' : 'No leads'}
                    </li>
                  ) : (
                    visible.map((lead) => (
                      <li
                        key={lead.id}
                        draggable={busyLeadId !== lead.id}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', lead.id);
                          e.dataTransfer.effectAllowed = 'move';
                          setDraggingId(lead.id);
                        }}
                        onDragEnd={() => setDraggingId(null)}
                        className={`cursor-grab rounded-lg border border-gray-200 bg-white p-3 shadow-card transition-shadow hover:shadow-lifted active:cursor-grabbing ${
                          draggingId === lead.id ? 'opacity-50' : ''
                        } ${busyLeadId === lead.id ? 'opacity-60' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/admin/leads/${lead.id}`}
                            className="text-sm font-medium text-gray-900 hover:text-teal-700 hover:underline"
                          >
                            {lead.fullName}
                          </Link>
                          <span className="shrink-0 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-700">
                            {formatEnumLabel(lead.source)}
                          </span>
                        </div>
                        {lead.companyName && <p className="mt-0.5 text-xs text-gray-600">{lead.companyName}</p>}
                        <p className="mt-0.5 text-xs text-gray-500">{lead.email ?? lead.phone ?? '—'}</p>
                        <p className="mt-1 text-[11px] text-gray-400">{formatRelativeTime(lead.createdAt)}</p>

                        <div className="mt-2">
                          <label htmlFor={`assignee-${lead.id}`} className="sr-only">
                            Assignee for {lead.fullName}
                          </label>
                          <select
                            id={`assignee-${lead.id}`}
                            value={lead.assignee?.id ?? ''}
                            disabled={busyLeadId === lead.id}
                            onChange={(e) => assignLead(lead.id, status, e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-2 py-1 text-xs focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-50"
                          >
                            <option value="">Unassigned</option>
                            {staff.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.fullName}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="mt-2">
                          <label htmlFor={`move-${lead.id}`} className="sr-only">
                            Move {lead.fullName} to a different status (keyboard alternative to drag and drop)
                          </label>
                          <select
                            id={`move-${lead.id}`}
                            value={status}
                            disabled={busyLeadId === lead.id}
                            onChange={(e) => moveLead(lead.id, status, e.target.value as LeadStatusValue)}
                            className="w-full rounded-lg border border-gray-300 px-2 py-1 text-xs focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-50"
                          >
                            {LEAD_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s === status ? `${STATUS_LABELS[s]} (current)` : `Move to ${STATUS_LABELS[s]}`}
                              </option>
                            ))}
                          </select>
                        </div>
                      </li>
                    ))
                  )}
                </ul>

                {!normalizedSearch && column.total > column.leads.length && (
                  <p className="mt-2 text-center text-xs text-gray-400">
                    +{column.total - column.leads.length} more not shown
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
