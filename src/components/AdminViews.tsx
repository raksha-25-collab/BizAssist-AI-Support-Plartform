import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Play,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { Avatar } from './Avatar';
import { assignTicketSpecialist, updateTicketStatusAction } from '../lib/seedData';
import type { ScreenId, Specialist, Ticket } from '../types/bizassist';

interface AdminViewsProps {
  screen:
    | 'admin-executive'
    | 'admin-analytics'
    | 'admin-tickets'
    | 'admin-triage-assign'
    | 'admin-copilot';
  tickets: Ticket[];
  specialists: Specialist[];
  selectedTicket: Ticket;
  onSelectTicket: (id: string) => void;
  onNavigate: (screen: ScreenId) => void;
}

interface CopilotEntry {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  structured?: {
    rootCause: string;
    runbookCode: string;
    runbookAction: string;
    estimatedSeconds: number;
    recommendedSpecialist: string;
  };
}

export function AdminViews({
  screen,
  tickets,
  specialists,
  selectedTicket,
  onSelectTicket,
  onNavigate,
}: AdminViewsProps) {
  const [timeframe, setTimeframe] = useState<'Today' | '7D' | '30D' | 'Q3'>('7D');
  const [ticketFilter, setTicketFilter] = useState<'All' | 'P1 Critical' | 'Unassigned' | 'SLA Risk'>('All');
  const [ticketSearch, setTicketSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkFeedback, setBulkFeedback] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  // Co-Pilot chat state
  const [copilotPrompt, setCopilotPrompt] = useState('');
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotError, setCopilotError] = useState<string | null>(null);
  const [copilotLog, setCopilotLog] = useState<CopilotEntry[]>([
    {
      id: 'c1',
      sender: 'user',
      text: 'Alert #BA-8902 SAML handshake fail on Auth cluster. Root cause?',
    },
    {
      id: 'c2',
      sender: 'ai',
      text: 'Root Cause Identified for #BA-8902',
      structured: {
        rootCause: 'IdP x.509 cert expired 08:00 UTC on auth-cluster-east.',
        runbookCode: 'RB-402',
        runbookAction:
          'Hot-swap backup cert from KMS Vault and trigger zero-downtime cluster reload.',
        estimatedSeconds: 45,
        recommendedSpecialist: 'Sarah Lin',
      },
    },
  ]);

  const p1Tickets = tickets.filter((t) => t.severity === 'Critical P1' && t.status !== 'Resolved & Closed');
  const unassigned = tickets.filter((t) => t.assignedStaffName === 'Unassigned');

  const handleExportCsv = () => {
    const header = 'TicketNumber,Title,Severity,Status,Organization,AssignedSpecialist\n';
    const rows = tickets
      .map(
        (t) =>
          `"${t.ticketNumber}","${t.title.replace(/"/g, '""')}","${t.severity}","${t.status}","${t.organization}","${t.assignedStaffName}"`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bizassist-tickets-export.csv';
    link.click();
    URL.revokeObjectURL(url);
    setBulkFeedback('Exported ticket telemetry CSV.');
    setTimeout(() => setBulkFeedback(null), 3000);
  };

  const handleAskCopilot = async (promptText: string) => {
    if (!promptText.trim()) return;
    const userMsg: CopilotEntry = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: promptText,
    };
    setCopilotLog((prev) => [...prev, userMsg]);
    setCopilotPrompt('');
    setCopilotLoading(true);
    setCopilotError(null);
    try {
      const ctx = tickets
        .slice(0, 4)
        .map((t) => `${t.ticketNumber} (${t.severity}, ${t.status}): ${t.title}`)
        .join(' | ');
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText, context: ctx }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Copilot query failed');
      setCopilotLog((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          sender: 'ai',
          text: 'Diagnostic & Runbook Synthesis',
          structured: data,
        },
      ]);
    } catch (err) {
      setCopilotError(err instanceof Error ? err.message : 'Copilot unavailable');
    } finally {
      setCopilotLoading(false);
    }
  };

  // ===========================================================================
  // SCREEN: ADMIN EXECUTIVE DASHBOARD
  // ===========================================================================
  if (screen === 'admin-executive') {
    const spotlight = p1Tickets[0] || tickets[0];
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#C23B0A]">
              Acme Global Prod · SLA 99.98% Live
            </p>
            <h1 className="text-2xl font-bold text-[#171412] mt-0.5">
              Executive Operations Overview
            </h1>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('admin-copilot')}
            className="px-4 py-2.5 rounded-xl bg-[#171412] text-white text-xs font-semibold hover:bg-[#2F2A26] flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-[#E87C56]" />
            <span>Open AI Co-Pilot</span>
          </button>
        </div>

        {/* Autonomic Healing Banner */}
        <section className="bg-[#FDF2F0] border border-[#F3C5BA] rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#C23B0A]">
              Autonomic Healing · +12m safe margin
            </p>
            <p className="text-base font-bold text-[#171412] mt-1">
              Cluster IdP Handshake Incident Remediated
            </p>
            <p className="text-xs text-[#574E47] font-mono-tabular mt-0.5">
              Log Reference: RB-402 · Telemetry Synced
            </p>
          </div>
          <ShieldCheck className="w-7 h-7 text-[#C23B0A]" />
        </section>

        {/* 4 KPI Cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#E5DDD5] rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6B625B]">
              Total Incidents
            </p>
            <p className="text-2xl font-bold font-mono-tabular text-[#171412] mt-2">
              {136 + tickets.length}
            </p>
            <p className="text-xs text-[#C23B0A] mt-1 font-medium">
              +4% vs yd · {p1Tickets.length} P1 Active
            </p>
          </div>
          <div className="bg-white border border-[#E5DDD5] rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6B625B]">
              SLA Compliance
            </p>
            <p className="text-2xl font-bold font-mono-tabular text-[#171412] mt-2">99.4%</p>
            <p className="text-xs text-emerald-700 mt-1 font-semibold">Target &gt;99.0% · Optimal</p>
          </div>
          <div className="bg-white border border-[#E5DDD5] rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6B625B]">
              Avg MTTR
            </p>
            <p className="text-2xl font-bold font-mono-tabular text-[#171412] mt-2">14m 20s</p>
            <p className="text-xs text-[#C23B0A] mt-1 font-medium">Beat by 3m 40s</p>
          </div>
          <div className="bg-white border border-[#E5DDD5] rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6B625B]">
              On-Call Staff
            </p>
            <p className="text-2xl font-bold font-mono-tabular text-[#171412] mt-2">18 / 20</p>
            <p className="text-xs text-[#6B625B] mt-1">Queue: {unassigned.length} Triage</p>
          </div>
        </section>

        {/* Critical Incident Spotlight */}
        {spotlight && (
          <section className="bg-white border border-[#E5DDD5] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono-tabular font-bold text-[#C23B0A]">
                {spotlight.severity} · {spotlight.ticketNumber}
              </span>
              <span className="font-mono-tabular text-[#9F2D06] font-semibold">
                {spotlight.slaMinutesRemaining}m 58s
              </span>
            </div>
            <h2 className="text-xl font-bold text-[#171412]">{spotlight.title}</h2>
            <p className="text-sm text-[#6B625B]">
              {spotlight.organization} Core Banking Cluster
            </p>
            <div className="p-4 rounded-xl bg-[#FAF8F6] border border-[#E5DDD5] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar person="sarah" name={spotlight.assignedStaffName} size="sm" online />
                <div>
                  <p className="text-sm font-bold text-[#171412]">{spotlight.assignedStaffName}</p>
                  <p className="text-xs text-[#6B625B]">Tier-2 Infra SRE Lead</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-[#C23B0A]">{spotlight.status}</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  onSelectTicket(spotlight.id);
                  onNavigate('admin-triage-assign');
                }}
                className="px-5 py-3 rounded-xl border border-[#E5DDD5] bg-white text-sm font-semibold text-[#171412] hover:border-[#C23B0A]"
              >
                Reassign Staff
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectTicket(spotlight.id);
                  onNavigate('staff-ticket-detail');
                }}
                className="flex-1 py-3 px-5 rounded-xl bg-[#C23B0A] text-white text-sm font-semibold hover:bg-[#A63107]"
              >
                Enter Triage Room
              </button>
            </div>
          </section>
        )}
      </div>
    );
  }

  // ===========================================================================
  // SCREEN: OPERATIONS COMMAND ANALYTICS
  // ===========================================================================
  if (screen === 'admin-analytics') {
    const scaleFactor =
      timeframe === 'Today' ? 0.16 : timeframe === '7D' ? 1 : timeframe === '30D' ? 4.2 : 12.1;
    const totalIngest = Math.round(1482 * scaleFactor);
    const resolvedVal = Math.round(1414 * scaleFactor);
    const aiHandled = Math.round(642 * scaleFactor);
    const pendingVal = Math.max(12, Math.round(68 * (timeframe === 'Today' ? 0.5 : 1)));

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#C23B0A]">
              Intelligence Suite · Marcus Vance OPS
            </p>
            <h1 className="text-2xl font-bold text-[#171412]">Operations Command</h1>
          </div>
          <div className="flex items-center gap-1 p-1 bg-white border border-[#E5DDD5] rounded-xl">
            {(['Today', '7D', '30D', 'Q3'] as const).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  timeframe === tf
                    ? 'bg-[#C23B0A] text-white'
                    : 'text-[#6B625B] hover:text-[#171412]'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#E5DDD5] rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6B625B]">
              Total Ingest
            </p>
            <p className="text-2xl font-bold font-mono-tabular text-[#171412] mt-2">
              {totalIngest.toLocaleString()}
            </p>
            <p className="text-xs text-emerald-700 mt-1 font-semibold">+12% vs prior</p>
          </div>
          <div className="bg-white border border-[#E5DDD5] rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6B625B]">
              Pending
            </p>
            <p className="text-2xl font-bold font-mono-tabular text-[#171412] mt-2">
              {pendingVal}
            </p>
            <p className="text-xs text-[#C23B0A] mt-1 font-medium">SLA Alert: 14 at risk</p>
          </div>
          <div className="bg-white border border-[#E5DDD5] rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6B625B]">
              Resolved
            </p>
            <p className="text-2xl font-bold font-mono-tabular text-[#171412] mt-2">
              {resolvedVal.toLocaleString()}
            </p>
            <p className="text-xs text-[#6B625B] mt-1 font-mono-tabular">95.4% CSAT</p>
          </div>
          <div className="bg-white border border-[#E5DDD5] rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6B625B]">
              AI Handled
            </p>
            <p className="text-2xl font-bold font-mono-tabular text-[#171412] mt-2">
              {aiHandled.toLocaleString()}
            </p>
            <p className="text-xs text-[#C23B0A] mt-1 font-semibold">45.4% Zero-Touch</p>
          </div>
        </div>

        {/* Velocity & Trend SVG Chart + Severity Tiers */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section className="lg:col-span-7 bg-white border border-[#E5DDD5] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[#171412]">Velocity &amp; Trend</h2>
              <span className="text-xs font-mono-tabular text-[#6B625B]">
                Ingest vs Resolved · Avg 18m
              </span>
            </div>
            <svg viewBox="0 0 600 180" className="w-full h-44" role="img" aria-label="Ticket velocity chart">
              <defs>
                <linearGradient id="velocityFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C23B0A" stopOpacity="0.24" />
                  <stop offset="100%" stopColor="#C23B0A" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <path
                d="M20 140 L110 120 L200 112 L290 95 L380 78 L470 52 L580 34 L580 160 L20 160 Z"
                fill="url(#velocityFill)"
              />
              <path
                d="M20 140 L110 120 L200 112 L290 95 L380 78 L470 52 L580 34"
                fill="none"
                stroke="#C23B0A"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d="M20 148 L110 136 L200 128 L290 118 L380 105 L470 90 L580 72"
                fill="none"
                stroke="#171412"
                strokeWidth="2"
                strokeDasharray="5 5"
              />
            </svg>
            <div className="flex justify-between text-xs text-[#6B625B] font-mono-tabular px-2">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>
          </section>

          <section className="lg:col-span-5 bg-white border border-[#E5DDD5] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-[#171412]">Severity Tiers</h2>
                <span className="text-xs font-mono-tabular text-[#6B625B]">
                  14% P1 · 52% Med · 34% Low
                </span>
              </div>
              <div className="w-full h-3 rounded-full overflow-hidden flex bg-[#F4EFEA] mb-6">
                <div className="bg-[#C23B0A] h-full" style={{ width: '14%' }} />
                <div className="bg-[#E87C56] h-full" style={{ width: '52%' }} />
                <div className="bg-[#D5C9BE] h-full" style={{ width: '34%' }} />
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-[#FAF8F6]">
                  <p className="text-xs text-[#6B625B]">High / P1</p>
                  <p className="text-lg font-bold font-mono-tabular text-[#C23B0A]">98</p>
                </div>
                <div className="p-3 rounded-xl bg-[#FAF8F6]">
                  <p className="text-xs text-[#6B625B]">Medium</p>
                  <p className="text-lg font-bold font-mono-tabular text-[#171412]">364</p>
                </div>
                <div className="p-3 rounded-xl bg-[#FAF8F6]">
                  <p className="text-xs text-[#6B625B]">Low</p>
                  <p className="text-lg font-bold font-mono-tabular text-[#171412]">238</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Specialist Shift Board */}
        <section className="bg-white border border-[#E5DDD5] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[#171412]">
              Specialist Shift Board · {specialists.length} Active
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('admin-tickets')}
              className="text-xs font-semibold text-[#C23B0A] hover:underline"
            >
              Manage Queue
            </button>
          </div>
          <div className="divide-y divide-[#EFE8E1]">
            {specialists.map((sp) => (
              <div key={sp.id} className="py-3.5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Avatar person={sp.avatarKey} name={sp.name} size="sm" online />
                  <div>
                    <p className="text-sm font-bold text-[#171412]">
                      {sp.name}{' '}
                      <span className="text-xs font-normal text-[#6B625B]">· {sp.teamTag}</span>
                    </p>
                    <p className="text-xs font-mono-tabular text-[#6B625B]">
                      {sp.resolvedCount} res · {sp.avgMttrMinutes}m avg MTTR
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold font-mono-tabular text-[#C23B0A]">
                  {sp.csatScore}% CSAT
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  // ===========================================================================
  // SCREEN: MANAGE ALL TICKETS
  // ===========================================================================
  if (screen === 'admin-tickets') {
    const filtered = tickets.filter((t) => {
      const q = ticketSearch.trim().toLowerCase();
      const matchesQ =
        !q ||
        t.ticketNumber.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.assignedStaffName.toLowerCase().includes(q);
      if (!matchesQ) return false;
      if (ticketFilter === 'P1 Critical') return t.severity === 'Critical P1';
      if (ticketFilter === 'Unassigned') return t.assignedStaffName === 'Unassigned';
      if (ticketFilter === 'SLA Risk') return t.slaMinutesRemaining <= 15;
      return true;
    });

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#C23B0A]">
              SLA Telemetry Live · Breaches: 0
            </p>
            <h1 className="text-2xl font-bold text-[#171412]">
              All Tickets <span className="font-mono-tabular text-[#6B625B]">({tickets.length})</span>
            </h1>
          </div>
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-4 py-2.5 rounded-xl border border-[#E5DDD5] bg-white text-xs font-semibold text-[#171412] hover:border-[#C23B0A] flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-[#C23B0A]" />
            <span>Export Logs</span>
          </button>
        </div>

        {bulkFeedback && (
          <div className="p-3 rounded-xl bg-[#171412] text-white text-xs font-medium">
            {bulkFeedback}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8C8278] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={ticketSearch}
              onChange={(e) => setTicketSearch(e.target.value)}
              placeholder="Ticket #, customer, specialist, cluster..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[#E5DDD5] rounded-xl focus:outline-none focus:border-[#C23B0A]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1 p-1 bg-white border border-[#E5DDD5] rounded-xl">
            {(['All', 'P1 Critical', 'Unassigned', 'SLA Risk'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setTicketFilter(tab)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  ticketFilter === tab
                    ? 'bg-[#C23B0A] text-white'
                    : 'text-[#6B625B] hover:text-[#171412]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="p-4 rounded-2xl bg-[#171412] text-white flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold">
              {selectedIds.length} ticket(s) selected for dispatch
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  await Promise.all(
                    selectedIds.map((id) =>
                      assignTicketSpecialist(id, 'spec_sarah', 'Sarah Lin', 'Tier-2 Infra Queue')
                    )
                  );
                  setBulkFeedback(`Bulk assigned ${selectedIds.length} tickets to Sarah Lin.`);
                  setSelectedIds([]);
                }}
                className="px-4 py-2 rounded-xl bg-[#C23B0A] text-white text-xs font-semibold hover:bg-[#A63107]"
              >
                Bulk Assign to Sarah Lin
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-3 py-2 rounded-xl border border-white/20 text-xs"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {filtered.map((t) => {
            const checked = selectedIds.includes(t.id);
            return (
              <article
                key={t.id}
                className="bg-white border border-[#E5DDD5] rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    aria-label={`Select ${t.ticketNumber}`}
                    checked={checked}
                    onChange={() =>
                      setSelectedIds((prev) =>
                        prev.includes(t.id) ? prev.filter((x) => x !== t.id) : [...prev, t.id]
                      )
                    }
                    className="mt-1 w-4 h-4 accent-[#C23B0A]"
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B625B]">
                      <span className="font-mono-tabular font-bold text-[#C23B0A]">
                        {t.ticketNumber}
                      </span>
                      <span>·</span>
                      <span>{t.organization}</span>
                      <span>·</span>
                      <span className="font-semibold text-[#9F2D06]">{t.severity}</span>
                    </div>
                    <h2 className="text-base font-bold text-[#171412] mt-1">{t.title}</h2>
                    <p className="text-xs text-[#6B625B] mt-1">
                      Customer: {t.customerName} · Specialist: {t.assignedStaffName} · Auto-Triage
                      Match: <strong className="font-mono-tabular">{t.aiConfidence}%</strong>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTicket(t.id);
                      onNavigate('admin-triage-assign');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#C23B0A] text-white text-xs font-semibold hover:bg-[#A63107]"
                  >
                    {t.assignedStaffName === 'Unassigned' ? 'Assign Specialist Now' : 'Reassign'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTicket(t.id);
                      onNavigate('staff-ticket-detail');
                    }}
                    className="px-3.5 py-2 rounded-xl border border-[#E5DDD5] text-xs font-semibold text-[#171412] hover:border-[#C23B0A]"
                  >
                    Triage
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    );
  }

  // ===========================================================================
  // SCREEN: ASSIGN TICKETS TO STAFF (TICKET DETAIL TRIAGE)
  // ===========================================================================
  if (screen === 'admin-triage-assign') {
    const recommended = specialists[0];
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigate('admin-tickets')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6B625B] hover:text-[#171412]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Tickets</span>
          </button>
          <span className="text-xs font-mono-tabular font-bold text-[#C23B0A]">
            Ticket Detail Triage · {selectedTicket.ticketNumber}
          </span>
        </div>

        <div className="bg-white border border-[#E5DDD5] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#C23B0A]">{selectedTicket.severity} INCIDENT</span>
            <span className="font-mono-tabular font-bold text-[#171412]">
              SLA: 0{selectedTicket.slaMinutesRemaining}:39
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#171412]">{selectedTicket.title}</h1>
          <p className="text-xs text-[#6B625B]">
            {selectedTicket.organization} · {selectedTicket.clusterName}
          </p>

          <div className="p-4 rounded-xl bg-[#FDF2F0] border border-[#F3C5BA]">
            <p className="text-xs font-bold uppercase tracking-wider text-[#C23B0A] mb-1">
              Root Anomaly Detected
            </p>
            <p className="text-sm text-[#171412]">{selectedTicket.predictedRootCause}</p>
          </div>
        </div>

        {recommended && (
          <div className="bg-[#FDF2F0] border border-[#F3C5BA] rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#C23B0A]">
                AI Copilot Recommendation
              </span>
              <span className="text-xs font-bold font-mono-tabular text-[#C23B0A]">
                {selectedTicket.aiConfidence}% Match
              </span>
            </div>
            <h2 className="text-lg font-bold text-[#171412]">
              {recommended.name} ({recommended.title})
            </h2>
            <p className="text-sm text-[#574E47]">
              Resolved identical IdP timeout incident #BA-8902 in 18m. On-call shift currently active with immediate context readiness.
            </p>
            <p className="text-xs font-mono-tabular text-[#6B625B]">
              Skill Fit: L4 Gateway &amp; IdP · Avg MTTR: {recommended.avgMttrMinutes}m
            </p>
          </div>
        )}

        <div className="bg-white border border-[#E5DDD5] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#171412]">Available Specialists</h2>
            <span className="text-xs text-[#6B625B]">{specialists.length} Active in Pool</span>
          </div>

          <div className="space-y-3">
            {specialists.map((sp) => (
              <div
                key={sp.id}
                className="p-4 rounded-xl border border-[#E5DDD5] flex flex-wrap items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <Avatar person={sp.avatarKey} name={sp.name} online />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-[#171412]">{sp.name}</p>
                      {sp.isCopilotPick && (
                        <span className="text-[11px] font-bold text-[#C23B0A]">COPILOT PICK</span>
                      )}
                    </div>
                    <p className="text-xs text-[#6B625B]">{sp.title}</p>
                    <p className="text-xs font-mono-tabular text-[#574E47] mt-1">
                      {sp.activeCount} Active ({sp.loadPercent}% load)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={assigning}
                  onClick={async () => {
                    setAssigning(true);
                    try {
                      await assignTicketSpecialist(
                        selectedTicket.id,
                        sp.id,
                        sp.name,
                        `${sp.teamTag} Specialist Queue`
                      );
                      await updateTicketStatusAction(
                        selectedTicket.id,
                        'In Progress',
                        `Dispatched & assigned to ${sp.name}`
                      );
                      onNavigate('admin-tickets');
                    } finally {
                      setAssigning(false);
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#C23B0A] text-white text-xs font-semibold hover:bg-[#A63107] flex items-center gap-1.5 disabled:opacity-60"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Dispatch &amp; Assign</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // SCREEN: AI SMART ASSISTANT (24/7 OPS CO-PILOT)
  // ===========================================================================
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white border border-[#E5DDD5] rounded-2xl p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#C23B0A] text-white flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#171412]">BizAssist AI Co-Pilot</h1>
            <p className="text-xs text-[#6B625B]">
              24/7 Ops Co-pilot: Outage diagnostics, automated triage &amp; live runbook execution
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono-tabular text-[#574E47]">
          <span>&lt;1.8s response</span>
          <span>99.4% accuracy</span>
          <span>SOC-2</span>
        </div>
      </div>

      {/* Quick Prompts */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            handleAskCopilot('Analyze SAML SSO failure on #BA-8902 and recommend rollback steps.')
          }
          className="px-3.5 py-2 rounded-xl bg-white border border-[#E5DDD5] text-xs font-semibold text-[#171412] hover:border-[#C23B0A]"
        >
          SAML SSO #BA-8902
        </button>
        <button
          type="button"
          onClick={() =>
            handleAskCopilot('Summarize current cluster uptime and P1 SLA risk across EU and US.')
          }
          className="px-3.5 py-2 rounded-xl bg-white border border-[#E5DDD5] text-xs font-semibold text-[#171412] hover:border-[#C23B0A]"
        >
          Cluster Uptime &amp; SLA Risk
        </button>
      </div>

      {copilotError && (
        <div className="p-3.5 rounded-xl bg-[#FDF2F0] border border-[#F3C5BA] text-xs text-[#9F2D06]">
          {copilotError}
        </div>
      )}

      {/* Conversation Stream */}
      <div className="space-y-4">
        {copilotLog.map((entry) =>
          entry.sender === 'user' ? (
            <div key={entry.id} className="flex justify-end">
              <div className="max-w-xl px-4 py-3 rounded-2xl bg-[#171412] text-white text-sm">
                {entry.text}
              </div>
            </div>
          ) : (
            <div
              key={entry.id}
              className="bg-white border border-[#E5DDD5] rounded-2xl p-5 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#C23B0A]">BizAssist AI Autotriage</span>
                <span className="text-[#6B625B]">Verified Diagnostics</span>
              </div>

              {entry.structured ? (
                <>
                  <div className="p-4 rounded-xl bg-[#FDF2F0] border border-[#F3C5BA]">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#C23B0A] mb-1">
                      Root Cause Identified
                    </p>
                    <p className="text-sm font-medium text-[#171412]">
                      {entry.structured.rootCause}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#FAF8F6] border border-[#E5DDD5] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold font-mono-tabular text-[#171412]">
                        Runbook {entry.structured.runbookCode}
                      </span>
                      <span className="font-mono-tabular text-[#6B625B]">
                        Est. {entry.structured.estimatedSeconds}s
                      </span>
                    </div>
                    <p className="text-sm text-[#4A423C]">{entry.structured.runbookAction}</p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setBulkFeedback(
                            `Dispatched ${entry.structured?.runbookCode} auto-fix pipeline.`
                          );
                          setTimeout(() => setBulkFeedback(null), 3500);
                        }}
                        className="px-4 py-2 rounded-xl bg-[#C23B0A] text-white text-xs font-semibold hover:bg-[#A63107] flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Auto-Deploy Fix</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onNavigate('admin-triage-assign')}
                        className="px-4 py-2 rounded-xl border border-[#E5DDD5] bg-white text-xs font-semibold text-[#171412] hover:border-[#C23B0A]"
                      >
                        Handover to {entry.structured.recommendedSpecialist}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-[#171412]">{entry.text}</p>
              )}
            </div>
          )
        )}
      </div>

      {bulkFeedback && (
        <div className="p-3.5 rounded-xl bg-emerald-950 text-white text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{bulkFeedback}</span>
        </div>
      )}

      {/* Input Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAskCopilot(copilotPrompt);
        }}
        className="bg-white border border-[#E5DDD5] rounded-2xl p-3 flex items-center gap-2 shadow-sm"
      >
        <input
          type="text"
          value={copilotPrompt}
          onChange={(e) => setCopilotPrompt(e.target.value)}
          placeholder="Ask BizAssist AI or enter issue ID (#BA-8902)..."
          className="flex-1 px-3 py-2.5 text-sm bg-transparent focus:outline-none"
        />
        <button
          type="submit"
          disabled={copilotLoading || !copilotPrompt.trim()}
          className="px-5 py-2.5 rounded-xl bg-[#C23B0A] text-white text-xs font-semibold hover:bg-[#A63107] flex items-center gap-1.5 disabled:opacity-50"
        >
          <span>{copilotLoading ? 'Analyzing...' : 'Ask Copilot'}</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
