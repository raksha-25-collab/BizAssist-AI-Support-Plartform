import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  Copy,
  FileCode2,
  FileUp,
  KeyRound,
  MessageSquare,
  PhoneCall,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Users,
} from 'lucide-react';
import { Avatar } from './Avatar';
import type {
  NotificationItem,
  ScreenId,
  Ticket,
  TicketCategory,
  TicketSeverity,
} from '../types/bizassist';
import {
  createSupportTicket,
  markAllNotificationsRead,
  markNotificationRead,
  reopenResolvedTicket,
} from '../lib/seedData';

interface CustomerViewsProps {
  screen:
    | 'customer-portal'
    | 'customer-submit'
    | 'customer-tickets'
    | 'customer-ticket-detail'
    | 'customer-notifications';
  uid: string;
  userName: string;
  tickets: Ticket[];
  notifications: NotificationItem[];
  selectedTicket: Ticket;
  onSelectTicket: (ticketId: string) => void;
  onNavigate: (screen: ScreenId) => void;
}

export function CustomerViews({
  screen,
  uid,
  userName,
  tickets,
  notifications,
  selectedTicket,
  onSelectTicket,
  onNavigate,
}: CustomerViewsProps) {
  // Priority Concierge state
  const [conciergeQuery, setConciergeQuery] = useState('');
  const [conciergeAnswer, setConciergeAnswer] = useState<string | null>(null);
  const [conciergeLoading, setConciergeLoading] = useState(false);
  const [conciergeError, setConciergeError] = useState<string | null>(null);
  const [instantActionModal, setInstantActionModal] = useState<
    null | 'mfa' | 'billing' | 'seats' | 'callback' | 'cert'
  >(null);
  const [actionToast, setActionToast] = useState<string | null>(null);

  // Submit Ticket 3-step wizard state
  const [submitStep, setSubmitStep] = useState<1 | 2 | 3>(1);
  const [category, setCategory] = useState<TicketCategory>('API Integration');
  const [title, setTitle] = useState('Webhook payload latency exceeding 4500ms');
  const [severity, setSeverity] = useState<TicketSeverity>('Critical P1');
  const [description, setDescription] = useState(
    'Starting 14:15 UTC, webhook listener endpoint latency is 4200ms-5100ms with HTTP 504 timeouts from upstream edge proxies.'
  );
  const [attachmentName, setAttachmentName] = useState('webhook_timeout_logs_2025.json');
  const [aiDiagnosis, setAiDiagnosis] = useState({
    confidence: 94,
    predictedRootCause: 'IdP x.509 handshake latency spike on Tier-2 proxy (US-East-1 routing tables).',
    recommendedRunbook: 'Runbook RB-402: Webhook Latency Guide',
    routingDestination: 'Tier-2 Esc. Infrastructure Queue',
    estimatedResolution: '< 15 mins',
  });
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnoseError, setDiagnoseError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdRef, setCreatedRef] = useState<{ id: string; ticketNumber: string } | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);
  const [showTraceModal, setShowTraceModal] = useState(false);

  // Ticket Tracker state
  const [trackerSearch, setTrackerSearch] = useState('');
  const [trackerTab, setTrackerTab] = useState<'Active' | 'Resolved' | 'All'>('Active');

  // Ticket Detail tab
  const [detailTab, setDetailTab] = useState<'Timeline' | 'Runbooks' | 'Notes'>('Timeline');

  // Notifications state
  const [notifFilter, setNotifFilter] = useState<'All' | 'Urgent P1' | 'AI Updates' | 'SLA'>('All');

  const activeTickets = tickets.filter((t) => t.status !== 'Resolved & Closed');
  const resolvedTickets = tickets.filter((t) => t.status === 'Resolved & Closed');
  const firstName = userName.split(' ')[0] || 'Elena';

  const triggerToast = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 4000);
  };

  const handleConciergeAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conciergeQuery.trim()) return;
    setConciergeLoading(true);
    setConciergeError(null);
    try {
      const summary = activeTickets
        .map((t) => `${t.ticketNumber}: ${t.title} (${t.status}, ${t.severity})`)
        .join('; ');
      const res = await fetch('/api/ai/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: conciergeQuery, ticketsSummary: summary }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to query concierge');
      setConciergeAnswer(data.answer);
    } catch (err) {
      setConciergeError(err instanceof Error ? err.message : 'Concierge unavailable');
    } finally {
      setConciergeLoading(false);
    }
  };

  const handleRunAIDiagnosis = async () => {
    setDiagnosing(true);
    setDiagnoseError(null);
    try {
      const res = await fetch('/api/ai/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, category, severity }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI diagnosis failed');
      setAiDiagnosis(data);
    } catch (err) {
      setDiagnoseError(err instanceof Error ? err.message : 'Unable to diagnose');
    } finally {
      setDiagnosing(false);
    }
  };

  const handleConfirmSubmitTicket = async () => {
    setSubmitting(true);
    try {
      const created = await createSupportTicket({
        workspaceOwnerId: uid,
        title,
        description,
        category,
        severity,
        customerName: userName,
        organization: 'Acme Enterprise',
        clusterName: 'auth-cluster-east',
        attachmentName,
        aiConfidence: aiDiagnosis.confidence,
        predictedRootCause: aiDiagnosis.predictedRootCause,
        recommendedRunbook: aiDiagnosis.recommendedRunbook,
        routingDestination: aiDiagnosis.routingDestination,
      });
      setCreatedRef(created);
      onSelectTicket(created.id);
      setSubmitStep(3);
    } finally {
      setSubmitting(false);
    }
  };

  // ===========================================================================
  // SCREEN: CUSTOMER PORTAL & OVERVIEW
  // ===========================================================================
  if (screen === 'customer-portal') {
    const heroTicket = activeTickets[0] || tickets[0];
    return (
      <div className="space-y-6">
        {actionToast && (
          <div className="p-3.5 rounded-xl bg-[#171412] text-white text-xs font-medium flex items-center justify-between">
            <span>{actionToast}</span>
            <button type="button" onClick={() => setActionToast(null)} className="text-[#E87C56]">
              Dismiss
            </button>
          </div>
        )}

        {/* Active Incident Top Progress Strip */}
        {heroTicket && (
          <button
            type="button"
            onClick={() => {
              onSelectTicket(heroTicket.id);
              onNavigate('customer-ticket-detail');
            }}
            className="w-full text-left bg-white border border-[#E5DDD5] rounded-2xl p-4 hover:border-[#C23B0A]/50 transition-colors"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#171412]">
                <span className="font-mono-tabular text-[#C23B0A]">{heroTicket.ticketNumber}</span>
                <span>{heroTicket.title}</span>
              </div>
              <span className="text-xs font-semibold text-[#C23B0A] font-mono-tabular">
                AI Step {heroTicket.stageIndex}/4 · {heroTicket.aiConfidence}% Match
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#F2ECE6] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#C23B0A] rounded-full transition-all"
                style={{ width: `${(heroTicket.stageIndex / 4) * 100}%` }}
              />
            </div>
            <p className="text-xs text-[#6B625B] mt-2">
              Correlating cluster failover logs · {heroTicket.recommendedRunbook}
            </p>
          </button>
        )}

        {/* Desktop 2-column split: Priority Concierge + Active Inquiries */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Priority Concierge Card */}
          <section className="lg:col-span-7 bg-white border border-[#E5DDD5] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider text-[#C23B0A] mb-2">
              <span>Priority Concierge · Live Fleet</span>
              <span className="text-[#6B625B] normal-case font-medium">12 Specialists Online</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#171412] tracking-tight">
              Good morning, {firstName}
            </h1>
            <p className="text-sm text-[#6B625B] mt-1 mb-5">
              All 3 production clusters running nominal · 99.98% uptime · 24ms gateway latency
            </p>

            <form onSubmit={handleConciergeAsk} className="flex items-center gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#8C8278] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={conciergeQuery}
                  onChange={(e) => setConciergeQuery(e.target.value)}
                  placeholder="Ask BizAssist AI about cluster health, SSL certs, or ticket status..."
                  className="w-full pl-10 pr-4 py-3 text-sm bg-[#FAF8F6] border border-[#E5DDD5] rounded-xl focus:outline-none focus:border-[#C23B0A]"
                />
              </div>
              <button
                type="submit"
                disabled={conciergeLoading}
                className="px-4 py-3 rounded-xl bg-[#171412] text-white text-xs font-semibold hover:bg-[#2F2A26] transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-60"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#E87C56]" />
                <span>{conciergeLoading ? 'Running...' : 'Run'}</span>
              </button>
            </form>

            {conciergeError && (
              <div className="mb-4 p-3 rounded-xl bg-[#FDF2F0] border border-[#F3C5BA] text-xs text-[#9F2D06]">
                {conciergeError}
              </div>
            )}

            {conciergeAnswer && (
              <div className="mb-4 p-4 rounded-xl bg-[#FAF8F6] border border-[#E5DDD5] text-sm text-[#171412] leading-relaxed">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#C23B0A] mb-1">
                  BizAssist Concierge Response
                </p>
                <p>{conciergeAnswer}</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setSubmitStep(1);
                onNavigate('customer-submit');
              }}
              className="w-full py-3.5 px-5 rounded-xl bg-[#C23B0A] text-white text-sm font-semibold hover:bg-[#A63107] transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Start New Request</span>
            </button>
          </section>

          {/* Active Inquiries */}
          <section className="lg:col-span-5 bg-white border border-[#E5DDD5] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-[#171412]">Active Inquiries</h2>
                <p className="text-xs text-[#6B625B] font-mono-tabular">
                  {activeTickets.length} Active · {resolvedTickets.length} Closed
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('customer-tickets')}
                className="text-xs font-semibold text-[#C23B0A] hover:underline flex items-center gap-1"
              >
                <span>History</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-[#EFE8E1]">
              {tickets.slice(0, 3).map((t) => (
                <div key={t.id} className="py-3.5 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTicket(t.id);
                        onNavigate('customer-ticket-detail');
                      }}
                      className="text-left group"
                    >
                      <p className="text-xs font-mono-tabular text-[#6B625B]">
                        {t.ticketNumber} · {t.severity}
                      </p>
                      <p className="text-sm font-semibold text-[#171412] group-hover:text-[#C23B0A] transition-colors mt-0.5">
                        {t.title}
                      </p>
                    </button>
                    <span className="text-xs font-medium text-[#C23B0A] whitespace-nowrap">
                      {t.assignedStaffName}
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <span className="text-xs text-[#6B625B]">{t.status}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectTicket(t.id);
                          onNavigate('customer-chat');
                        }}
                        className="px-3 py-1.5 rounded-lg border border-[#E5DDD5] text-xs font-semibold text-[#171412] hover:border-[#C23B0A] transition-colors"
                      >
                        Open Chat
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectTicket(t.id);
                          onNavigate('customer-ticket-detail');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#C23B0A] text-white text-xs font-semibold hover:bg-[#A63107] transition-colors"
                      >
                        Review
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Instant AI Actions */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-[#171412]">Instant Self-Service Actions</h2>
            <span className="text-xs text-[#6B625B]">Zero wait automation</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => setInstantActionModal('mfa')}
              className="text-left bg-white border border-[#E5DDD5] rounded-2xl p-5 hover:border-[#C23B0A] transition-colors"
            >
              <KeyRound className="w-5 h-5 text-[#C23B0A] mb-3" />
              <p className="text-sm font-bold text-[#171412]">Reset MFA</p>
              <p className="text-xs text-[#6B625B] mt-1">Rotate hardware token or FIDO2 passkey</p>
              <p className="text-xs font-semibold text-[#C23B0A] mt-3 flex items-center gap-1">
                <span>Execute</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </p>
            </button>

            <button
              type="button"
              onClick={() => setInstantActionModal('billing')}
              className="text-left bg-white border border-[#E5DDD5] rounded-2xl p-5 hover:border-[#C23B0A] transition-colors"
            >
              <Receipt className="w-5 h-5 text-[#C23B0A] mb-3" />
              <p className="text-sm font-bold text-[#171412]">Billing &amp; Tax</p>
              <p className="text-xs text-[#6B625B] mt-1">Download enterprise VAT &amp; usage receipts</p>
              <p className="text-xs font-semibold text-[#C23B0A] mt-3 flex items-center gap-1">
                <span>Receipt</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </p>
            </button>

            <button
              type="button"
              onClick={() => setInstantActionModal('seats')}
              className="text-left bg-white border border-[#E5DDD5] rounded-2xl p-5 hover:border-[#C23B0A] transition-colors"
            >
              <Users className="w-5 h-5 text-[#C23B0A] mb-3" />
              <p className="text-sm font-bold text-[#171412]">Org Seats</p>
              <p className="text-xs text-[#6B625B] mt-1">Manage Acme DevOps SSO seats (18 / 25)</p>
              <p className="text-xs font-semibold text-[#C23B0A] mt-3 flex items-center gap-1">
                <span>Manage</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </p>
            </button>
          </div>
        </section>

        {instantActionModal && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white border border-[#E5DDD5] rounded-2xl max-w-md w-full p-6 shadow-xl">
              <h3 className="text-lg font-bold text-[#171412] mb-2">
                {instantActionModal === 'mfa'
                  ? 'Reset Hardware MFA Token'
                  : instantActionModal === 'billing'
                    ? 'Enterprise Billing & Tax Summary'
                    : 'Acme Enterprise Seat Allocation'}
              </h3>
              <p className="text-sm text-[#6B625B] mb-5">
                {instantActionModal === 'mfa'
                  ? 'A temporary FIDO2 re-enrollment link will be dispatched to your verified work email.'
                  : instantActionModal === 'billing'
                    ? 'Current cycle: $4,200.00 Platinum SLA · Paid on Nov 01 · Invoice #INV-2026-11.'
                    : '18 of 25 DevOps & SRE seats active under Acme Tenant Isolation.'}
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setInstantActionModal(null)}
                  className="px-4 py-2 rounded-xl border border-[#E5DDD5] text-xs font-semibold text-[#171412]"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const label =
                      instantActionModal === 'mfa'
                        ? 'MFA reset link sent to verified email.'
                        : instantActionModal === 'billing'
                          ? 'Invoice #INV-2026-11 receipt prepared.'
                          : 'Organization seat roster synced.';
                    setInstantActionModal(null);
                    triggerToast(label);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#C23B0A] text-white text-xs font-semibold hover:bg-[#A63107]"
                >
                  Confirm Action
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===========================================================================
  // SCREEN: SUBMIT TICKET & AI DIAGNOSIS -> REVIEW -> SUBMISSION SUCCESS
  // ===========================================================================
  if (screen === 'customer-submit') {
    if (submitStep === 3 && createdRef) {
      return (
        <div className="max-w-2xl mx-auto bg-white border border-[#E5DDD5] rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#C23B0A] text-white flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-[#171412]">Ticket Submitted Successfully!</h1>
            <p className="text-sm text-[#6B625B] mt-1">
              Your query is being processed by BizAssist Autonomous Auto-Triage.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF8F6] border border-[#E5DDD5] flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#6B625B]">
                Reference Code
              </p>
              <p className="text-2xl font-bold font-mono-tabular text-[#171412] mt-0.5">
                {createdRef.ticketNumber}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(createdRef.ticketNumber);
                setCopiedRef(true);
                setTimeout(() => setCopiedRef(false), 2000);
              }}
              className="px-4 py-2 rounded-xl bg-white border border-[#E5DDD5] text-xs font-semibold text-[#C23B0A] flex items-center gap-1.5 hover:border-[#C23B0A]"
            >
              {copiedRef ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedRef ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-2xl bg-[#FAF8F6] border border-[#E5DDD5]">
              <p className="text-xs text-[#6B625B]">Est. Pickup</p>
              <p className="text-lg font-bold font-mono-tabular text-[#171412] mt-0.5">
                00:30 mins
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#FAF8F6] border border-[#E5DDD5]">
              <p className="text-xs text-[#6B625B]">Triage Agent</p>
              <p className="text-lg font-bold text-[#171412] mt-0.5">BizAssist Copilot</p>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-[#171412]">Auto-Dispatch Pipeline</h2>
              <span className="text-xs font-semibold text-[#C23B0A]">Live Sync</span>
            </div>
            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-[#C23B0A] mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-[#171412]">Ticket Recorded &amp; Tokenized</p>
                  <p className="text-xs text-[#6B625B]">
                    Parsed payload &amp; created persistent cloud ledger entry
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <RefreshCw className="w-4 h-4 text-[#C23B0A] mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-[#171412]">Telemetry &amp; Log Correlator</p>
                  <p className="text-xs text-[#6B625B]">
                    {aiDiagnosis.predictedRootCause}
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Users className="w-4 h-4 text-[#8C8278] mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-[#171412]">Specialist Handover Routing</p>
                  <p className="text-xs text-[#6B625B]">
                    Queued to Sarah Lin · {aiDiagnosis.routingDestination}
                  </p>
                </div>
              </li>
            </ol>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => onNavigate('customer-ticket-detail')}
              className="w-full py-3.5 px-5 rounded-xl bg-[#C23B0A] text-white text-sm font-semibold hover:bg-[#A63107] transition-colors"
            >
              Track Ticket Status
            </button>
            <button
              type="button"
              onClick={() => onNavigate('customer-portal')}
              className="w-full py-3 px-5 rounded-xl border border-[#E5DDD5] text-sm font-semibold text-[#171412] hover:bg-[#FAF8F6] transition-colors"
            >
              Return to Customer Dashboard
            </button>
          </div>
        </div>
      );
    }

    if (submitStep === 2) {
      return (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setSubmitStep(1)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6B625B] hover:text-[#171412]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Edit Details</span>
            </button>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="text-[#8C8278]">1. Details</span>
              <span className="text-[#C23B0A]">2. Review</span>
              <span className="text-[#8C8278]">3. Triage</span>
            </div>
          </div>

          <div className="bg-white border border-[#E5DDD5] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-[#6B625B]">
              <span>
                {category} · <strong className="text-[#C23B0A]">{severity}</strong>
              </span>
              <span className="font-mono-tabular">Draft Ready</span>
            </div>
            <h1 className="text-xl font-bold text-[#171412]">{title}</h1>
            <p className="text-xs text-[#6B625B]">Acme Enterprise · auth-cluster-east</p>

            <div className="p-4 rounded-xl bg-[#FAF8F6] border border-[#E5DDD5]">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B625B] mb-1">
                Customer Query Payload
              </p>
              <p className="text-sm text-[#171412] leading-relaxed">{description}</p>
            </div>

            <div className="p-3.5 rounded-xl border border-[#E5DDD5] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <FileCode2 className="w-5 h-5 text-[#C23B0A]" />
                <div>
                  <p className="text-sm font-semibold text-[#171412] font-mono-tabular">
                    {attachmentName}
                  </p>
                  <p className="text-xs text-[#6B625B]">240 KB · JSON Trace Log</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTraceModal(!showTraceModal)}
                className="px-3 py-1.5 rounded-lg border border-[#E5DDD5] text-xs font-semibold text-[#171412] hover:border-[#C23B0A]"
              >
                {showTraceModal ? 'Hide' : 'Preview'}
              </button>
            </div>

            {showTraceModal && (
              <pre className="p-3.5 rounded-xl bg-[#171412] text-[#F5EFEA] text-xs font-mono-tabular overflow-x-auto">
{`{
  "cluster": "auth-cluster-east",
  "status": 504,
  "upstream_latency_ms": 4820,
  "error": "IdP x.509 handshake timeout"
}`}
              </pre>
            )}
          </div>

          <div className="bg-[#FDF2F0] border border-[#F3C5BA] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#C23B0A]" />
                <h2 className="text-sm font-bold text-[#171412]">BizAssist AI Copilot</h2>
              </div>
              <span className="text-xs font-bold font-mono-tabular text-[#C23B0A]">
                {aiDiagnosis.confidence}% Match
              </span>
            </div>

            <div className="bg-white rounded-xl p-4 border border-[#F3C5BA]">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B625B] mb-1">
                Predicted Root Cause
              </p>
              <p className="text-sm font-medium text-[#171412]">{aiDiagnosis.predictedRootCause}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-4 border border-[#F3C5BA]">
                <p className="text-xs text-[#6B625B]">Estimated Resolution</p>
                <p className="text-base font-bold font-mono-tabular text-[#171412] mt-0.5">
                  {aiDiagnosis.estimatedResolution}
                </p>
                <p className="text-xs text-[#6B625B] mt-0.5">{aiDiagnosis.recommendedRunbook}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-[#F3C5BA]">
                <p className="text-xs text-[#6B625B]">Routing Destination</p>
                <p className="text-base font-bold text-[#171412] mt-0.5">
                  {aiDiagnosis.routingDestination}
                </p>
                <p className="text-xs text-[#6B625B] mt-0.5">SLA Target: 10m First Response</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSubmitStep(1)}
              className="px-5 py-3.5 rounded-xl border border-[#E5DDD5] bg-white text-sm font-semibold text-[#171412] hover:bg-[#FAF8F6]"
            >
              Edit
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleConfirmSubmitTicket}
              className="flex-1 py-3.5 px-6 rounded-xl bg-[#C23B0A] text-white text-sm font-semibold hover:bg-[#A63107] transition-colors disabled:opacity-60"
            >
              {submitting ? 'Submitting to Queue...' : 'Confirm & Submit'}
            </button>
          </div>
        </div>
      );
    }

    // Step 1: Details + Real-Time AI Diagnosis
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-[#171412]">Create Inbound Ticket</h1>
            <p className="text-sm text-[#6B625B]">
              AI diagnoses issues in real time to match the right specialist.
            </p>
          </div>
          <span className="text-xs font-semibold font-mono-tabular text-[#C23B0A]">
            Target SLA &lt; 15m
          </span>
        </div>

        <div className="bg-white border border-[#E5DDD5] rounded-2xl p-6 shadow-sm space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#574E47] mb-2">
              Select Domain Category
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  'Billing & Invoices',
                  'API Integration',
                  'Account Access',
                  'Bug Report',
                ] as TicketCategory[]
              ).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    category === cat
                      ? 'bg-[#C23B0A] text-white'
                      : 'bg-[#FAF8F6] border border-[#E5DDD5] text-[#574E47] hover:border-[#C23B0A]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="issue-title"
                className="text-xs font-semibold uppercase tracking-wide text-[#574E47]"
              >
                Issue Title
              </label>
              <span className="text-xs text-[#6B625B]">Synced with Logs</span>
            </div>
            <input
              id="issue-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 text-sm bg-[#FAF8F6] border border-[#E5DDD5] rounded-xl focus:outline-none focus:border-[#C23B0A]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#574E47]">
                Severity Level
              </span>
              <span className="text-xs text-[#6B625B]">&lt; 15 mins target</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['Low', 'Medium', 'Critical P1'] as TicketSeverity[]).map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setSeverity(sev)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-colors ${
                    severity === sev
                      ? 'bg-[#FDF2F0] border-[#C23B0A] text-[#C23B0A]'
                      : 'bg-[#FAF8F6] border-[#E5DDD5] text-[#574E47]'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="issue-desc"
                className="text-xs font-semibold uppercase tracking-wide text-[#574E47]"
              >
                Detailed Context
              </label>
              <span className="text-xs text-[#6B625B]">Markdown supported</span>
            </div>
            <textarea
              id="issue-desc"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 text-sm bg-[#FAF8F6] border border-[#E5DDD5] rounded-xl focus:outline-none focus:border-[#C23B0A]"
            />
          </div>

          <div className="p-4 rounded-xl border border-dashed border-[#D5C9BE] bg-[#FAF8F6] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <FileUp className="w-5 h-5 text-[#C23B0A]" />
              <div>
                <p className="text-sm font-semibold text-[#171412] font-mono-tabular">
                  {attachmentName}
                </p>
                <p className="text-xs text-[#6B625B]">Attach screenshot or log dump · Max 25MB</p>
              </div>
            </div>
            <label className="cursor-pointer px-3.5 py-2 rounded-xl bg-white border border-[#E5DDD5] text-xs font-semibold text-[#171412] hover:border-[#C23B0A]">
              <span>Change File</span>
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setAttachmentName(file.name);
                }}
              />
            </label>
          </div>
        </div>

        {/* Real-Time AI Diagnosis Box */}
        <div className="bg-[#FDF2F0] border border-[#F3C5BA] rounded-2xl p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#C23B0A]">
              Real-Time AI Diagnosis
            </span>
            <span className="text-xs font-bold font-mono-tabular text-[#9F2D06]">
              {aiDiagnosis.confidence}% Confidence
            </span>
          </div>
          <p className="text-sm font-semibold text-[#171412]">{aiDiagnosis.predictedRootCause}</p>
          <p className="text-xs text-[#574E47] font-mono-tabular">
            {aiDiagnosis.recommendedRunbook} · {aiDiagnosis.routingDestination}
          </p>
          {diagnoseError && <p className="text-xs text-[#9F2D06]">{diagnoseError}</p>}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              disabled={diagnosing}
              onClick={handleRunAIDiagnosis}
              className="px-4 py-2.5 rounded-xl bg-white border border-[#E5DDD5] text-xs font-semibold text-[#171412] hover:border-[#C23B0A] flex items-center gap-1.5 disabled:opacity-60"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C23B0A]" />
              <span>{diagnosing ? 'Diagnosing...' : 'Run AI Diagnosis'}</span>
            </button>
            <button
              type="button"
              onClick={() => setSubmitStep(2)}
              className="flex-1 py-2.5 px-5 rounded-xl bg-[#C23B0A] text-white text-xs font-semibold hover:bg-[#A63107] transition-colors"
            >
              Review &amp; Dispatch Ticket
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // SCREEN: TICKET TRACKER & QUERY HISTORY
  // ===========================================================================
  if (screen === 'customer-tickets') {
    const filtered = tickets.filter((t) => {
      const matchesTab =
        trackerTab === 'All'
          ? true
          : trackerTab === 'Active'
            ? t.status !== 'Resolved & Closed'
            : t.status === 'Resolved & Closed';
      const q = trackerSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        t.ticketNumber.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.clusterName.toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#171412]">Ticket Tracker &amp; Query History</h1>
            <p className="text-sm text-[#6B625B]">
              Tracking live operational queries and verified past resolutions.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSubmitStep(1);
              onNavigate('customer-submit');
            }}
            className="px-4 py-2.5 rounded-xl bg-[#C23B0A] text-white text-xs font-semibold hover:bg-[#A63107] flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Ticket</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8C8278] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={trackerSearch}
              onChange={(e) => setTrackerSearch(e.target.value)}
              placeholder="Search ticket ID, cluster, or keyword..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[#E5DDD5] rounded-xl focus:outline-none focus:border-[#C23B0A]"
            />
          </div>
          <div className="flex items-center gap-1 p-1 bg-white border border-[#E5DDD5] rounded-xl">
            {(['Active', 'Resolved', 'All'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setTrackerTab(tab)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  trackerTab === tab
                    ? 'bg-[#C23B0A] text-white'
                    : 'text-[#6B625B] hover:text-[#171412]'
                }`}
              >
                {tab === 'Active'
                  ? `Active (${activeTickets.length})`
                  : tab === 'Resolved'
                    ? `Resolved (${resolvedTickets.length})`
                    : `All (${tickets.length})`}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((t) => (
            <article
              key={t.id}
              className="bg-white border border-[#E5DDD5] rounded-2xl p-5 shadow-sm flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs text-[#6B625B] mb-2">
                  <span className="font-mono-tabular font-semibold text-[#C23B0A]">
                    {t.ticketNumber} · {t.status}
                  </span>
                  <span>{t.severity}</span>
                </div>
                <h2 className="text-base font-bold text-[#171412]">{t.title}</h2>
                <p className="text-xs text-[#6B625B] mt-1">
                  Assigned to {t.assignedStaffName} · {t.clusterName}
                </p>
                <p className="text-sm text-[#4A423C] mt-3 line-clamp-2">{t.description}</p>
              </div>

              <div className="pt-3 border-t border-[#EFE8E1] flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-mono-tabular text-[#6B625B]">
                  Stage {t.stageIndex} of 4
                </span>
                <div className="flex items-center gap-2">
                  {t.status === 'Resolved & Closed' ? (
                    <button
                      type="button"
                      onClick={() => reopenResolvedTicket(t.id)}
                      className="px-3 py-1.5 rounded-lg border border-[#E5DDD5] text-xs font-semibold text-[#171412] hover:border-[#C23B0A]"
                    >
                      Reopen Query
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTicket(t.id);
                        onNavigate('customer-chat');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#C23B0A] text-white text-xs font-semibold hover:bg-[#A63107]"
                    >
                      Reply Directly
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTicket(t.id);
                      onNavigate('customer-ticket-detail');
                    }}
                    className="px-3 py-1.5 rounded-lg border border-[#E5DDD5] text-xs font-semibold text-[#171412] hover:border-[#C23B0A]"
                  >
                    Details
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Urgent Escalation Footer Bar */}
        <div className="bg-white border border-[#E5DDD5] rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-[#171412]">Need urgent escalation?</p>
            <p className="text-xs text-[#6B625B]">Concierge live SRE support available 24/7</p>
          </div>
          <button
            type="button"
            onClick={() => setInstantActionModal('callback')}
            className="px-4 py-2.5 rounded-xl border border-[#E5DDD5] bg-[#FAF8F6] text-xs font-semibold text-[#171412] hover:border-[#C23B0A] flex items-center gap-2"
          >
            <PhoneCall className="w-4 h-4 text-[#C23B0A]" />
            <span>Quick Callback</span>
          </button>
        </div>

        {instantActionModal === 'callback' && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white border border-[#E5DDD5] rounded-2xl max-w-sm w-full p-6">
              <h3 className="text-base font-bold text-[#171412] mb-2">
                Priority Callback Queued
              </h3>
              <p className="text-sm text-[#6B625B] mb-4">
                Sarah Lin (Tier-2 Infra) has been paged for a direct bridge callback within 2 minutes.
              </p>
              <button
                type="button"
                onClick={() => setInstantActionModal(null)}
                className="w-full py-2.5 rounded-xl bg-[#C23B0A] text-white text-xs font-semibold"
              >
                Acknowledge
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===========================================================================
  // SCREEN: INDIVIDUAL TICKET DETAILS
  // ===========================================================================
  if (screen === 'customer-ticket-detail') {
    const stages = [
      {
        title: 'Ticket Created',
        detail: `Initiated by ${selectedTicket.customerName} via Prometheus alert webhook trigger.`,
        badge: selectedTicket.attachmentName,
      },
      {
        title: 'AI Diagnostic',
        detail: `${selectedTicket.aiConfidence}% Fit · ${selectedTicket.predictedRootCause}`,
        badge: selectedTicket.recommendedRunbook,
      },
      {
        title: 'Active Investigation',
        detail: `${selectedTicket.assignedStaffName} accepted ticket triage and initiated remediation on ${selectedTicket.clusterName}.`,
        badge: 'Canary Cert Provisioning · 68%',
      },
      {
        title: 'Verification & SLA Sign-off',
        detail:
          selectedTicket.customerSummary ||
          'Automated synthetic payment probes will fire across 8 sandbox regions before final sign-off.',
        badge: selectedTicket.status === 'Resolved & Closed' ? 'Verified' : 'Pending Stage 4',
      },
    ];

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onNavigate('customer-tickets')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6B625B] hover:text-[#171412]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Tickets</span>
          </button>
          <span className="text-xs font-semibold font-mono-tabular text-[#C23B0A]">
            LIVE INCIDENT STREAM · SLA: {selectedTicket.slaMinutesRemaining}m remaining
          </span>
        </div>

        <div className="bg-white border border-[#E5DDD5] rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#6B625B]">
            <span className="font-mono-tabular font-semibold text-[#C23B0A]">
              {selectedTicket.severity} · {selectedTicket.ticketNumber}
            </span>
            <span>{selectedTicket.status}</span>
          </div>

          <h1 className="text-2xl font-bold text-[#171412]">{selectedTicket.title}</h1>
          <p className="text-sm text-[#6B625B]">
            {selectedTicket.organization} · {selectedTicket.clusterName}
          </p>

          <div className="p-4 rounded-2xl bg-[#FAF8F6] border border-[#E5DDD5] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Avatar person="sarah" name={selectedTicket.assignedStaffName} online />
              <div>
                <p className="text-sm font-bold text-[#171412]">
                  {selectedTicket.assignedStaffName}
                </p>
                <p className="text-xs text-[#6B625B]">Tier-2 Infra Specialist · Copilot Sync</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('customer-chat')}
              className="px-4 py-2.5 rounded-xl bg-[#C23B0A] text-white text-xs font-semibold hover:bg-[#A63107] flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Chat with {selectedTicket.assignedStaffName.split(' ')[0]}</span>
            </button>
          </div>

          {/* Sub-tabs */}
          <div className="flex items-center gap-6 border-b border-[#EFE8E1]">
            {(['Timeline', 'Runbooks', 'Notes'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setDetailTab(tab)}
                className={`pb-3 text-xs font-semibold border-b-2 transition-colors ${
                  detailTab === tab
                    ? 'border-[#C23B0A] text-[#C23B0A]'
                    : 'border-transparent text-[#6B625B] hover:text-[#171412]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {detailTab === 'Timeline' && (
            <div className="space-y-4">
              {stages.map((st, idx) => {
                const done = idx + 1 <= selectedTicket.stageIndex;
                return (
                  <div
                    key={st.title}
                    className={`p-4 rounded-xl border ${
                      done
                        ? 'bg-white border-[#E5DDD5]'
                        : 'bg-[#FAF8F6] border-[#EFE8E1] opacity-75'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <p className="text-sm font-bold text-[#171412]">
                        0{idx + 1}. {st.title}
                      </p>
                      <span className="text-xs font-mono-tabular text-[#C23B0A]">{st.badge}</span>
                    </div>
                    <p className="text-xs text-[#574E47] leading-relaxed">{st.detail}</p>
                  </div>
                );
              })}
            </div>
          )}

          {detailTab === 'Runbooks' && (
            <div className="p-4 rounded-xl bg-[#FAF8F6] border border-[#E5DDD5] space-y-2">
              <p className="text-sm font-bold text-[#171412]">{selectedTicket.recommendedRunbook}</p>
              <p className="text-xs text-[#574E47]">
                Automated KMS secret rotation and zero-downtime NGINX worker pool reload verified across 8 canary regions.
              </p>
            </div>
          )}

          {detailTab === 'Notes' && (
            <div className="p-4 rounded-xl bg-[#FAF8F6] border border-[#E5DDD5] space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6B625B]">
                Resolution &amp; Transition Log
              </p>
              <p className="text-sm text-[#171412]">
                {selectedTicket.customerSummary ||
                  selectedTicket.transitionReason ||
                  'Specialist actively investigating.'}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===========================================================================
  // SCREEN: NOTIFICATIONS CENTER
  // ===========================================================================
  const filteredNotifs = notifications.filter((n) =>
    notifFilter === 'All' ? true : n.kind === notifFilter
  );
  const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#171412]">
            Notifications{' '}
            <span className="text-sm font-mono-tabular text-[#C23B0A] ml-1">
              {unreadIds.length} NEW
            </span>
          </h1>
          <p className="text-sm text-[#6B625B]">
            Real-time alerts, SLA milestones &amp; AI copilot updates.
          </p>
        </div>
        <button
          type="button"
          disabled={unreadIds.length === 0}
          onClick={() => markAllNotificationsRead(unreadIds)}
          className="px-4 py-2 rounded-xl border border-[#E5DDD5] bg-white text-xs font-semibold text-[#171412] hover:border-[#C23B0A] disabled:opacity-50"
        >
          Mark all read
        </button>
      </div>

      <div className="flex items-center gap-1 p-1 bg-white border border-[#E5DDD5] rounded-xl w-fit">
        {(['All', 'Urgent P1', 'AI Updates', 'SLA'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setNotifFilter(tab)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              notifFilter === tab
                ? 'bg-[#171412] text-white'
                : 'text-[#6B625B] hover:text-[#171412]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredNotifs.map((n) => (
          <article
            key={n.id}
            className={`bg-white border rounded-2xl p-5 shadow-sm transition-colors ${
              n.read ? 'border-[#E5DDD5] opacity-80' : 'border-[#C23B0A]/40'
            }`}
          >
            <div className="flex items-center justify-between gap-2 text-xs mb-2">
              <span className="font-semibold uppercase tracking-wider text-[#C23B0A] flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5" />
                {n.kind}
              </span>
              <span className="font-mono-tabular text-[#6B625B]">{n.ticketNumber}</span>
            </div>
            <h2 className="text-base font-bold text-[#171412]">{n.title}</h2>
            <p className="text-sm text-[#574E47] mt-1 leading-relaxed">{n.summary}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  await markNotificationRead(n.id);
                  if (n.ticketId) onSelectTicket(n.ticketId);
                  onNavigate('customer-chat');
                }}
                className="px-4 py-2 rounded-xl bg-[#C23B0A] text-white text-xs font-semibold hover:bg-[#A63107]"
              >
                Open Chat
              </button>
              <button
                type="button"
                onClick={async () => {
                  await markNotificationRead(n.id);
                  if (n.ticketId) onSelectTicket(n.ticketId);
                  onNavigate('customer-ticket-detail');
                }}
                className="px-4 py-2 rounded-xl border border-[#E5DDD5] text-xs font-semibold text-[#171412] hover:border-[#C23B0A]"
              >
                View Details
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
