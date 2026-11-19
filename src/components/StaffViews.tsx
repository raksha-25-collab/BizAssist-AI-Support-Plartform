import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  FileCode2,
  MessageSquare,
  Play,
  Search,
  Sparkles,
} from 'lucide-react';
import { Avatar } from './Avatar';
import {
  assignTicketSpecialist,
  postTicketMessage,
  resolveTicketWithNotes,
  toggleUserUrgentRouting,
  updateTicketStatusAction,
} from '../lib/seedData';
import type {
  NotificationItem,
  ScreenId,
  Ticket,
  TicketStatus,
  UserProfile,
} from '../types/bizassist';

interface StaffViewsProps {
  screen:
    | 'staff-dashboard'
    | 'staff-queue'
    | 'staff-ticket-detail'
    | 'staff-update-status'
    | 'staff-resolve'
    | 'staff-profile';
  uid: string;
  userProfile: UserProfile | null;
  tickets: Ticket[];
  notifications: NotificationItem[];
  selectedTicket: Ticket;
  onSelectTicket: (id: string) => void;
  onNavigate: (screen: ScreenId) => void;
}

export function StaffViews({
  screen,
  uid,
  userProfile,
  tickets,
  notifications,
  selectedTicket,
  onSelectTicket,
  onNavigate,
}: StaffViewsProps) {
  const [queueFilter, setQueueFilter] = useState<
    'All Assigned' | 'P1 Critical' | 'In Progress' | 'Waiting' | 'Unassigned'
  >('All Assigned');
  const [queueSearch, setQueueSearch] = useState('');
  const [runbookLogModal, setRunbookLogModal] = useState<string | null>(null);
  const [aiReplyPreview, setAiReplyPreview] = useState<{
    ticket: Ticket;
    draft: string;
  } | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);

  // Update Status form state
  const [nextStatus, setNextStatus] = useState<TicketStatus>(selectedTicket.status);
  const [transitionReason, setTransitionReason] = useState(
    selectedTicket.transitionReason || 'Canary Deployment Successful (Cluster v2.1)'
  );
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [statusSaving, setStatusSaving] = useState(false);

  // Resolution Notes form state
  const [rootCauseClass, setRootCauseClass] = useState(
    selectedTicket.rootCauseClass || 'Infrastructure -> IdP TLS Certificate Expiration'
  );
  const [remediationMethod, setRemediationMethod] = useState(
    selectedTicket.remediationMethod || 'Automated Runbook RB-402 (Zero-downtime hot swap)'
  );
  const [internalNotes, setInternalNotes] = useState(
    selectedTicket.internalNotes ||
      'Rotated expired wildcard IdP x.509 cert in cluster-east via KMS secret store. Staged synthetic payment probes across 8 regions with 0 error rate.'
  );
  const [customerSummary, setCustomerSummary] = useState(
    selectedTicket.customerSummary ||
      'The expired SSL cert on our IdP gateway has been hot-swapped and validated. All stalled webhook queues have drained successfully.'
  );
  const [resolving, setResolving] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  const assignedTickets = tickets.filter((t) => t.status !== 'Resolved & Closed');
  const p1Tickets = assignedTickets.filter((t) => t.severity === 'Critical P1');
  const unassignedTickets = tickets.filter((t) => t.assignedStaffName === 'Unassigned');
  const resolvedCount = tickets.filter((t) => t.status === 'Resolved & Closed').length + 7;

  const handleOpenAIDraft = async (ticket: Ticket) => {
    setDraftLoading(true);
    try {
      const res = await fetch('/api/ai/draft-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketTitle: ticket.title,
          ticketDescription: ticket.description,
          mode: 'reply',
        }),
      });
      const data = await res.json();
      setAiReplyPreview({
        ticket,
        draft:
          data.draft ||
          `Hi ${ticket.customerName.split(' ')[0]}, I am executing ${ticket.recommendedRunbook} on ${ticket.clusterName} right now and will confirm once error rates drop to zero.`,
      });
    } finally {
      setDraftLoading(false);
    }
  };

  // ===========================================================================
  // SCREEN: STAFF DASHBOARD & WORKLOAD
  // ===========================================================================
  if (screen === 'staff-dashboard') {
    const spotlight = p1Tickets[0] || assignedTickets[0] || tickets[0];
    return (
      <div className="space-y-6">
        {/* Top Specialist Banner */}
        <section className="bg-white border border-[#E5DDD5] rounded-2xl p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar person="sarah" name="Sarah Lin" size="lg" online />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-[#171412]">Sarah Lin</h1>
                <span className="text-xs font-semibold text-[#C23B0A]">Tier-2 Infra</span>
              </div>
              <p className="text-sm text-[#6B625B]">Shift: Active (05h 22m remaining) · On Shift · AI Active</p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#6B625B]">
              Gateway SLA Telemetry
            </p>
            <p className="text-2xl font-bold font-mono-tabular text-[#C23B0A]">99.98%</p>
          </div>
        </section>

        {/* 4-Card KPI Strip */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#E5DDD5] rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6B625B]">
              Assigned to Me
            </p>
            <p className="text-2xl font-bold font-mono-tabular text-[#171412] mt-2">
              {assignedTickets.length} <span className="text-sm font-medium text-[#6B625B]">Active</span>
            </p>
            <p className="text-xs text-[#C23B0A] mt-1 font-medium">
              {p1Tickets.length} P1 SLA Warning
            </p>
          </div>

          <div className="bg-white border border-[#E5DDD5] rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6B625B]">
              Queue Backlog
            </p>
            <p className="text-2xl font-bold font-mono-tabular text-[#171412] mt-2">
              {unassignedTickets.length + 12}{' '}
              <span className="text-sm font-medium text-[#6B625B]">Waiting</span>
            </p>
            <p className="text-xs text-[#6B625B] mt-1 font-mono-tabular">Avg wait 3.2m</p>
          </div>

          <div className="bg-white border border-[#E5DDD5] rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6B625B]">
              Today&apos;s Resolved
            </p>
            <p className="text-2xl font-bold font-mono-tabular text-[#171412] mt-2">
              {resolvedCount} <span className="text-sm font-medium text-[#6B625B]">Closed</span>
            </p>
            <p className="text-xs text-emerald-700 mt-1 font-semibold font-mono-tabular">
              CSAT 99.4%
            </p>
          </div>

          <div className="bg-white border border-[#E5DDD5] rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6B625B]">
              Avg Triage Time
            </p>
            <p className="text-2xl font-bold font-mono-tabular text-[#171412] mt-2">04m 12s</p>
            <p className="text-xs text-[#6B625B] mt-1">Target &lt; 10m</p>
          </div>
        </section>

        {/* Priority P1 Spotlight */}
        {spotlight && (
          <section className="bg-white border border-[#E5DDD5] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C23B0A]">
                <span className="font-mono-tabular">{spotlight.ticketNumber}</span>
                <span>·</span>
                <span>{spotlight.severity}</span>
              </div>
              <span className="px-3 py-1 rounded-lg bg-[#FDF2F0] text-[#9F2D06] text-xs font-bold font-mono-tabular">
                0{spotlight.slaMinutesRemaining}m 12s remaining
              </span>
            </div>

            <h2 className="text-xl font-bold text-[#171412]">{spotlight.title}</h2>

            <div className="p-4 rounded-xl bg-[#FAF8F6] border border-[#E5DDD5] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar person="elena" name={spotlight.customerName} />
                <div>
                  <p className="text-sm font-bold text-[#171412]">{spotlight.customerName}</p>
                  <p className="text-xs text-[#6B625B]">
                    {spotlight.organization} · Platinum Tier
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono-tabular text-[#6B625B]">
                {spotlight.clusterName}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  onSelectTicket(spotlight.id);
                  onNavigate('staff-ticket-detail');
                }}
                className="flex-1 py-3 px-5 rounded-xl bg-[#C23B0A] text-white text-sm font-semibold hover:bg-[#A63107] transition-colors"
              >
                Open Ticket Details
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectTicket(spotlight.id);
                  onNavigate('staff-chat');
                }}
                className="px-4 py-3 rounded-xl border border-[#E5DDD5] bg-white text-sm font-semibold text-[#171412] hover:border-[#C23B0A]"
              >
                Quick Reply
              </button>
              <button
                type="button"
                onClick={() => setRunbookLogModal(spotlight.recommendedRunbook)}
                className="px-4 py-3 rounded-xl border border-[#E5DDD5] bg-[#FAF8F6] text-sm font-semibold text-[#171412] hover:border-[#C23B0A] font-mono-tabular"
              >
                Runbook RB-402
              </button>
            </div>
          </section>
        )}

        {runbookLogModal && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white border border-[#E5DDD5] rounded-2xl max-w-md w-full p-6 space-y-4">
              <h3 className="text-base font-bold text-[#171412]">{runbookLogModal}</h3>
              <pre className="p-3.5 rounded-xl bg-[#171412] text-[#FAF8F6] text-xs font-mono-tabular overflow-x-auto">
{`[RB-402] Connecting to KMS secret store...
[RB-402] Rotating wildcard IdP x.509 cert
[RB-402] Canary probes: 8/8 regions green (0ms drops)`}
              </pre>
              <button
                type="button"
                onClick={() => setRunbookLogModal(null)}
                className="w-full py-2.5 rounded-xl bg-[#C23B0A] text-white text-xs font-semibold"
              >
                Close Execution Log
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===========================================================================
  // SCREEN: ASSIGNED TICKETS QUEUE & STAFF WORKSPACE
  // ===========================================================================
  if (screen === 'staff-queue') {
    const filtered = tickets.filter((t) => {
      const q = queueSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        t.ticketNumber.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.customerName.toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (queueFilter === 'P1 Critical') return t.severity === 'Critical P1';
      if (queueFilter === 'In Progress') return t.status === 'In Progress';
      if (queueFilter === 'Waiting') return t.status === 'Waiting on Customer';
      if (queueFilter === 'Unassigned') return t.assignedStaffName === 'Unassigned';
      return t.status !== 'Resolved & Closed';
    });

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#171412]">Assigned Tickets Queue</h1>
            <p className="text-sm text-[#6B625B]">
              Avg First Reply: 4m 12s · 98.4% SLA compliance
            </p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8C8278] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={queueSearch}
              onChange={(e) => setQueueSearch(e.target.value)}
              placeholder="Search ticket ID, customer, keyword..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[#E5DDD5] rounded-xl focus:outline-none focus:border-[#C23B0A]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1 p-1 bg-white border border-[#E5DDD5] rounded-xl">
            {(
              [
                'All Assigned',
                'P1 Critical',
                'In Progress',
                'Waiting',
                'Unassigned',
              ] as const
            ).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setQueueFilter(tab)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  queueFilter === tab
                    ? 'bg-[#C23B0A] text-white'
                    : 'text-[#6B625B] hover:text-[#171412]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((t) => (
            <article
              key={t.id}
              className="bg-white border border-[#E5DDD5] rounded-2xl p-5 shadow-sm flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-mono-tabular font-bold text-[#C23B0A]">
                    {t.ticketNumber} · {t.severity}
                  </span>
                  <span className="font-mono-tabular text-[#9F2D06] font-semibold">
                    {t.slaMinutesRemaining}m SLA
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  <Avatar person="elena" name={t.customerName} size="sm" />
                  <div>
                    <p className="text-xs text-[#6B625B]">
                      {t.organization} · {t.customerName}
                    </p>
                    <h2 className="text-base font-bold text-[#171412] mt-0.5">{t.title}</h2>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#FDF2F0] border border-[#F3C5BA] text-xs">
                  <div className="flex items-center justify-between font-semibold text-[#C23B0A] mb-0.5">
                    <span>AI Assistant Match</span>
                    <span className="font-mono-tabular">{t.aiConfidence}% Confidence</span>
                  </div>
                  <p className="text-[#574E47]">Suggested: {t.recommendedRunbook}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-[#EFE8E1] flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-[#6B625B]">Owner: {t.assignedStaffName}</span>
                <div className="flex flex-wrap items-center gap-2">
                  {t.assignedStaffName === 'Unassigned' ? (
                    <button
                      type="button"
                      onClick={() =>
                        assignTicketSpecialist(t.id, 'spec_sarah', 'Sarah Lin', 'Tier-2 Infra Queue')
                      }
                      className="px-3 py-1.5 rounded-lg bg-[#C23B0A] text-white text-xs font-semibold hover:bg-[#A63107]"
                    >
                      Quick Accept
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={draftLoading}
                    onClick={() => handleOpenAIDraft(t)}
                    className="px-3 py-1.5 rounded-lg border border-[#E5DDD5] text-xs font-semibold text-[#171412] hover:border-[#C23B0A]"
                  >
                    AI Draft Reply
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTicket(t.id);
                      onNavigate('staff-chat');
                    }}
                    className="px-3 py-1.5 rounded-lg border border-[#E5DDD5] text-xs font-semibold text-[#171412] hover:border-[#C23B0A]"
                  >
                    Chat
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTicket(t.id);
                      onNavigate('staff-ticket-detail');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#171412] text-white text-xs font-semibold hover:bg-[#2F2A26]"
                  >
                    Details
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {aiReplyPreview && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white border border-[#E5DDD5] rounded-2xl max-w-lg w-full p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[#171412]">
                  AI Draft Reply · {aiReplyPreview.ticket.ticketNumber}
                </h3>
                <Sparkles className="w-4 h-4 text-[#C23B0A]" />
              </div>
              <textarea
                rows={4}
                value={aiReplyPreview.draft}
                onChange={(e) =>
                  setAiReplyPreview({ ...aiReplyPreview, draft: e.target.value })
                }
                className="w-full p-3 text-sm bg-[#FAF8F6] border border-[#E5DDD5] rounded-xl"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAiReplyPreview(null)}
                  className="px-4 py-2 rounded-xl border border-[#E5DDD5] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await postTicketMessage({
                      workspaceOwnerId: uid,
                      ticketId: aiReplyPreview.ticket.id,
                      senderRole: 'staff',
                      senderName: 'Sarah Lin',
                      body: aiReplyPreview.draft,
                    });
                    const tId = aiReplyPreview.ticket.id;
                    setAiReplyPreview(null);
                    onSelectTicket(tId);
                    onNavigate('staff-chat');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#C23B0A] text-white text-xs font-semibold"
                >
                  Send to Customer Chat
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===========================================================================
  // SCREEN: STAFF TICKET DETAILS
  // ===========================================================================
  if (screen === 'staff-ticket-detail') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onNavigate('staff-queue')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6B625B] hover:text-[#171412]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Queue</span>
          </button>
          <span className="text-xs font-semibold text-[#C23B0A] font-mono-tabular">
            ACTIVE SESSION · {selectedTicket.status}
          </span>
        </div>

        <div className="bg-white border border-[#E5DDD5] rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#EFE8E1]">
            <div className="flex items-center gap-3">
              <Avatar person="elena" name={selectedTicket.customerName} size="lg" online />
              <div>
                <h2 className="text-lg font-bold text-[#171412]">{selectedTicket.customerName}</h2>
                <p className="text-xs text-[#6B625B]">
                  Lead DevOps Engineer · {selectedTicket.organization} · Tier-1 SLA
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold font-mono-tabular text-[#171412]">5.0 ★ (14 reviews)</p>
              <p className="text-xs text-[#6B625B]">Phone Verified</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#FAF8F6] border border-[#E5DDD5]">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6B625B]">
                Cluster Info
              </p>
              <p className="text-sm font-bold font-mono-tabular text-[#171412] mt-1">
                {selectedTicket.clusterName}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[#FAF8F6] border border-[#E5DDD5]">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6B625B]">
                AI Diagnosis Match
              </p>
              <p className="text-sm font-bold font-mono-tabular text-[#C23B0A] mt-1">
                {selectedTicket.aiConfidence}% · {selectedTicket.recommendedRunbook}
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-[#6B625B] mb-1">
              <span className="font-semibold text-[#C23B0A]">
                {selectedTicket.severity} · {selectedTicket.ticketNumber}
              </span>
              <span>{selectedTicket.category}</span>
            </div>
            <h1 className="text-2xl font-bold text-[#171412]">{selectedTicket.title}</h1>
          </div>

          <div className="p-4 rounded-xl bg-[#FDF2F0] border border-[#F3C5BA]">
            <p className="text-xs font-bold uppercase tracking-wider text-[#C23B0A] mb-1">
              Customer Payload Description
            </p>
            <p className="text-sm text-[#171412] leading-relaxed italic">
              &ldquo;{selectedTicket.description}&rdquo;
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-[#E5DDD5] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileCode2 className="w-5 h-5 text-[#C23B0A]" />
              <div>
                <p className="text-sm font-semibold font-mono-tabular text-[#171412]">
                  {selectedTicket.attachmentName}
                </p>
                <p className="text-xs text-[#6B625B]">48 KB · Attached by Client</p>
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('staff-chat')}
              className="flex-1 py-3 px-5 rounded-xl bg-[#C23B0A] text-white text-sm font-semibold hover:bg-[#A63107] flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Chat with Customer ({selectedTicket.customerName.split(' ')[0]})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setNextStatus(selectedTicket.status);
                onNavigate('staff-update-status');
              }}
              className="px-5 py-3 rounded-xl border border-[#E5DDD5] bg-white text-sm font-semibold text-[#171412] hover:border-[#C23B0A]"
            >
              Update Status
            </button>
            <button
              type="button"
              onClick={() => onNavigate('staff-resolve')}
              className="px-5 py-3 rounded-xl bg-[#171412] text-white text-sm font-semibold hover:bg-[#2F2A26]"
            >
              Resolve Ticket
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // SCREEN: UPDATE TICKET STATUS
  // ===========================================================================
  if (screen === 'staff-update-status') {
    const statuses: { value: TicketStatus; tag: string; desc: string }[] = [
      {
        value: 'Open / Triage',
        tag: 'Triage',
        desc: 'Unassigned or pending initial assessment and scope.',
      },
      {
        value: 'In Progress',
        tag: 'Active SLA',
        desc: 'Specialist actively executing remediation. SLA clock running.',
      },
      {
        value: 'Waiting on Customer',
        tag: 'Paused SLA',
        desc: `Awaiting ${selectedTicket.customerName.split(' ')[0]} verification of staging SSL.`,
      },
      {
        value: 'Escalate Tier-3',
        tag: 'Core Eng',
        desc: 'Handoff to distributed sync architects on-call.',
      },
      {
        value: 'Pending Verification',
        tag: 'Smoke Tests',
        desc: 'Patch applied; synthetic heartbeat monitor validating.',
      },
      {
        value: 'Resolved & Closed',
        tag: 'Final',
        desc: 'Mitigation verified, RCA logged, summary sent.',
      },
    ];

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigate('staff-ticket-detail')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6B625B] hover:text-[#171412]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <span className="text-xs font-mono-tabular font-semibold text-[#C23B0A]">
            {selectedTicket.ticketNumber}
          </span>
        </div>

        <div className="bg-white border border-[#E5DDD5] rounded-2xl p-6 shadow-sm space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#C23B0A]">
              Ticket Context · {selectedTicket.severity}
            </p>
            <h1 className="text-xl font-bold text-[#171412] mt-1">{selectedTicket.title}</h1>
            <p className="text-xs text-[#6B625B] mt-1">
              SLA Resolution: {selectedTicket.slaMinutesRemaining}m left · Tenant:{' '}
              {selectedTicket.organization}
            </p>
          </div>

          <div className="space-y-2.5">
            {statuses.map((st) => {
              const active = nextStatus === st.value;
              return (
                <button
                  key={st.value}
                  type="button"
                  onClick={() => setNextStatus(st.value)}
                  className={`w-full text-left p-4 rounded-xl border transition-colors ${
                    active
                      ? 'bg-[#FDF2F0] border-[#C23B0A]'
                      : 'bg-white border-[#E5DDD5] hover:border-[#C23B0A]/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-[#171412]">{st.value}</span>
                    <span className="text-xs font-semibold text-[#C23B0A]">{st.tag}</span>
                  </div>
                  <p className="text-xs text-[#6B625B] mt-1">{st.desc}</p>
                </button>
              );
            })}
          </div>

          <div>
            <label
              htmlFor="transition-reason"
              className="block text-xs font-semibold uppercase tracking-wide text-[#574E47] mb-1.5"
            >
              Reason for Transition (Required)
            </label>
            <input
              id="transition-reason"
              type="text"
              value={transitionReason}
              onChange={(e) => setTransitionReason(e.target.value)}
              className="w-full px-4 py-3 text-sm bg-[#FAF8F6] border border-[#E5DDD5] rounded-xl focus:outline-none focus:border-[#C23B0A]"
            />
          </div>

          <label className="flex items-center gap-3 text-sm text-[#171412] cursor-pointer">
            <input
              type="checkbox"
              checked={notifyCustomer}
              onChange={(e) => setNotifyCustomer(e.target.checked)}
              className="w-4 h-4 accent-[#C23B0A]"
            />
            <span>Notify {selectedTicket.customerName} via Enterprise Push &amp; Email</span>
          </label>

          <button
            type="button"
            disabled={statusSaving}
            onClick={async () => {
              setStatusSaving(true);
              try {
                await updateTicketStatusAction(
                  selectedTicket.id,
                  nextStatus,
                  transitionReason || 'Updated by specialist'
                );
                onNavigate('staff-ticket-detail');
              } finally {
                setStatusSaving(false);
              }
            }}
            className="w-full py-3.5 px-5 rounded-xl bg-[#C23B0A] text-white text-sm font-semibold hover:bg-[#A63107] disabled:opacity-60"
          >
            {statusSaving ? 'Updating State...' : 'Apply Status Transition'}
          </button>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // SCREEN: RESOLUTION NOTES & RESOLVE TICKET
  // ===========================================================================
  if (screen === 'staff-resolve') {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigate('staff-ticket-detail')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6B625B] hover:text-[#171412]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <span className="text-xs font-mono-tabular font-semibold text-[#C23B0A]">
            {selectedTicket.ticketNumber} · Resolution
          </span>
        </div>

        <div className="bg-white border border-[#E5DDD5] rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#EFE8E1]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#C23B0A]">
                {selectedTicket.severity} · {selectedTicket.organization}
              </p>
              <p className="text-xs text-[#6B625B] mt-1">Time to Resolution</p>
              <p className="text-3xl font-bold font-mono-tabular text-[#171412]">18m 42s</p>
            </div>
            <span className="px-3.5 py-2 rounded-xl bg-[#FDF2F0] text-[#9F2D06] text-xs font-semibold">
              Beat SLA by 06m 18s
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#574E47] mb-1.5">
                Root Cause Classification
              </label>
              <select
                value={rootCauseClass}
                onChange={(e) => setRootCauseClass(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#FAF8F6] border border-[#E5DDD5] rounded-xl"
              >
                <option>Infrastructure -&gt; IdP TLS Certificate Expiration</option>
                <option>Network -&gt; NGINX Ingress Connection Saturation</option>
                <option>Database -&gt; Replica I/O Lag</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#574E47] mb-1.5">
                Remediation Method
              </label>
              <select
                value={remediationMethod}
                onChange={(e) => setRemediationMethod(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#FAF8F6] border border-[#E5DDD5] rounded-xl"
              >
                <option>Automated Runbook RB-402 (Zero-downtime hot swap)</option>
                <option>Manual Edge Gateway Pool Expansion</option>
                <option>Customer DNS Record Re-validation</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#574E47]">
                Internal Staff Notes
              </label>
              <span className="text-xs text-[#C23B0A]">Specialist Only</span>
            </div>
            <textarea
              rows={3}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              className="w-full p-3.5 text-sm bg-[#FAF8F6] border border-[#E5DDD5] rounded-xl"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#574E47]">
                Customer-Facing Summary
              </label>
              <button
                type="button"
                disabled={generatingSummary}
                onClick={async () => {
                  setGeneratingSummary(true);
                  try {
                    const res = await fetch('/api/ai/draft-reply', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        ticketTitle: selectedTicket.title,
                        ticketDescription: selectedTicket.description,
                        recentMessages: internalNotes,
                        mode: 'summary',
                      }),
                    });
                    const data = await res.json();
                    if (res.ok && data.draft) setCustomerSummary(data.draft);
                  } finally {
                    setGeneratingSummary(false);
                  }
                }}
                className="text-xs font-semibold text-[#C23B0A] hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{generatingSummary ? 'Generating...' : 'Generate AI Summary'}</span>
              </button>
            </div>
            <textarea
              rows={3}
              value={customerSummary}
              onChange={(e) => setCustomerSummary(e.target.value)}
              className="w-full p-3.5 text-sm bg-[#FAF8F6] border border-[#E5DDD5] rounded-xl"
            />
          </div>

          <button
            type="button"
            disabled={resolving}
            onClick={async () => {
              setResolving(true);
              try {
                await resolveTicketWithNotes(selectedTicket.id, {
                  rootCauseClass,
                  remediationMethod,
                  internalNotes,
                  customerSummary,
                });
                onNavigate('staff-queue');
              } finally {
                setResolving(false);
              }
            }}
            className="w-full py-3.5 px-5 rounded-xl bg-[#C23B0A] text-white text-sm font-semibold hover:bg-[#A63107] flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{resolving ? 'Finalizing Resolution...' : 'Resolve & Dispatch Summary'}</span>
          </button>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // SCREEN: STAFF NOTIFICATIONS & PROFILE HUB
  // ===========================================================================
  const urgentEnabled = userProfile?.urgentRoutingEnabled ?? true;
  const openEscalations = tickets.filter((t) => t.status === 'Open / Triage');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <section className="bg-white border border-[#E5DDD5] rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar person="sarah" name="Sarah Lin" size="lg" online />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#C23B0A]">
                Support Portal · On-Call Active
              </p>
              <h1 className="text-2xl font-bold text-[#171412]">Staff Hub &amp; Profile</h1>
              <p className="text-sm text-[#6B625B]">
                Sarah Lin · Tier-2 Infrastructure Specialist · APAC/EMEA handoff (05h 18m left)
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#FAF8F6] border border-[#E5DDD5] text-center">
            <p className="text-2xl font-bold font-mono-tabular text-[#C23B0A]">99.4%</p>
            <p className="text-xs text-[#6B625B] mt-0.5">CSAT Score</p>
          </div>
          <div className="p-4 rounded-xl bg-[#FAF8F6] border border-[#E5DDD5] text-center">
            <p className="text-2xl font-bold font-mono-tabular text-[#171412]">18m</p>
            <p className="text-xs text-[#6B625B] mt-0.5">Avg Resolve</p>
          </div>
          <div className="p-4 rounded-xl bg-[#FAF8F6] border border-[#E5DDD5] text-center">
            <p className="text-2xl font-bold font-mono-tabular text-[#171412]">142</p>
            <p className="text-xs text-[#6B625B] mt-0.5">This Month</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#FAF8F6] border border-[#E5DDD5] flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-[#171412]">Urgent P1 Ticket Routing</p>
            <p className="text-xs text-[#6B625B]">Auto-accepting tier-1 escalations</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={urgentEnabled}
            onClick={() => toggleUserUrgentRouting(uid, !urgentEnabled)}
            className={`w-12 h-7 rounded-full p-1 transition-colors ${
              urgentEnabled ? 'bg-[#C23B0A]' : 'bg-[#D5C9BE]'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                urgentEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#171412]">Live Urgent Feed</h2>
          <span className="text-xs font-mono-tabular font-semibold text-[#C23B0A]">
            {notifications.filter((n) => !n.read).length} New Alerts
          </span>
        </div>

        {openEscalations.map((t) => (
          <article
            key={t.id}
            className="bg-white border border-[#E5DDD5] rounded-2xl p-5 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-[#C23B0A]">
                P1 Critical Escalation
              </span>
              <span className="font-mono-tabular text-[#6B625B]">{t.ticketNumber}</span>
            </div>
            <h3 className="text-base font-bold text-[#171412]">{t.title}</h3>
            <p className="text-sm text-[#574E47]">{t.description}</p>
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={async () => {
                  await assignTicketSpecialist(
                    t.id,
                    'spec_sarah',
                    'Sarah Lin',
                    'Tier-2 Infra Queue'
                  );
                  await updateTicketStatusAction(
                    t.id,
                    'In Progress',
                    'Accepted from Live Urgent Feed'
                  );
                  onSelectTicket(t.id);
                  onNavigate('staff-ticket-detail');
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#C23B0A] text-white text-xs font-semibold hover:bg-[#A63107]"
              >
                Accept Ticket
              </button>
              <button
                type="button"
                onClick={() => onNavigate('staff-queue')}
                className="px-4 py-2.5 rounded-xl border border-[#E5DDD5] text-xs font-semibold text-[#171412]"
              >
                Decline
              </button>
            </div>
          </article>
        ))}

        <div className="bg-white border border-[#E5DDD5] rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#C23B0A]">
              AI Co-Pilot Assistant
            </p>
            <p className="text-sm font-bold text-[#171412] mt-0.5">
              Runbook RB-402 Completed · Canary cluster provisioned with 0 errors
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRunbookLogModal('Runbook RB-402 Verification Log')}
            className="px-4 py-2 rounded-xl border border-[#E5DDD5] text-xs font-semibold text-[#171412] hover:border-[#C23B0A] flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 text-[#C23B0A]" />
            <span>Pass (28s) · View Logs</span>
          </button>
        </div>
      </section>

      {runbookLogModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5DDD5] rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-[#171412]">{runbookLogModal}</h3>
            <pre className="p-3.5 rounded-xl bg-[#171412] text-[#FAF8F6] text-xs font-mono-tabular overflow-x-auto">
{`[08:14:02] Canary cluster eu-west-2 provisioned
[08:14:19] TLS 1.3 handshake verified across 8 regions
[08:14:30] Benchmark clean: 99.98% delivery rate`}
            </pre>
            <button
              type="button"
              onClick={() => setRunbookLogModal(null)}
              className="w-full py-2.5 rounded-xl bg-[#C23B0A] text-white text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
