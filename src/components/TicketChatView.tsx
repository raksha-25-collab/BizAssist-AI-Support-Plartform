import React, { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import {
  ArrowLeft,
  CheckCircle2,
  FileCode2,
  Lock,
  Play,
  Send,
  Sparkles,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { postTicketMessage } from '../lib/seedData';
import { Avatar } from './Avatar';
import type { ScreenId, Ticket, TicketMessage } from '../types/bizassist';

interface TicketChatViewProps {
  mode: 'customer' | 'staff';
  uid: string;
  userName: string;
  ticket: Ticket;
  onNavigate: (screen: ScreenId) => void;
}

export function TicketChatView({
  mode,
  uid,
  userName,
  ticket,
  onNavigate,
}: TicketChatViewProps) {
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [input, setInput] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [sending, setSending] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [showBundle, setShowBundle] = useState(false);
  const [runbookProgress, setRunbookProgress] = useState(85);

  useEffect(() => {
    const q = query(
      collection(db, 'tickets', ticket.id, 'messages'),
      where('workspaceOwnerId', '==', uid),
      orderBy('createdAt', 'asc')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<TicketMessage, 'id'>),
        }));
        setMessages(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `tickets/${ticket.id}/messages`);
      }
    );

    return () => unsub();
  }, [ticket.id, uid]);

  const handleSend = async (e?: React.FormEvent, overrideText?: string) => {
    if (e) e.preventDefault();
    const text = (overrideText ?? input).trim();
    if (!text) return;
    setSending(true);
    try {
      await postTicketMessage({
        workspaceOwnerId: uid,
        ticketId: ticket.id,
        senderRole: mode === 'staff' ? 'staff' : 'customer',
        senderName: mode === 'staff' ? ticket.assignedStaffName || userName : userName,
        body: text,
        isInternalNote: mode === 'staff' && isInternalNote,
      });
      if (!overrideText) setInput('');
    } finally {
      setSending(false);
    }
  };

  const handleAIDraft = async () => {
    setDrafting(true);
    try {
      const recent = messages
        .slice(-4)
        .map((m) => `${m.senderName}: ${m.body}`)
        .join('\n');
      const res = await fetch('/api/ai/draft-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketTitle: ticket.title,
          ticketDescription: ticket.description,
          recentMessages: recent,
          mode: 'reply',
        }),
      });
      const data = await res.json();
      if (res.ok && data.draft) {
        setInput(data.draft);
      }
    } finally {
      setDrafting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col bg-white border border-[#E5DDD5] rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-[#EFE8E1] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              onNavigate(mode === 'staff' ? 'staff-ticket-detail' : 'customer-ticket-detail')
            }
            aria-label="Back to ticket details"
            className="w-9 h-9 rounded-xl border border-[#E5DDD5] flex items-center justify-center text-[#171412] hover:border-[#C23B0A]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <Avatar
            person={mode === 'staff' ? 'elena' : 'sarah'}
            name={mode === 'staff' ? ticket.customerName : ticket.assignedStaffName}
            online
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-[#171412]">
                {mode === 'staff' ? ticket.customerName : ticket.assignedStaffName}
              </h1>
              <span className="text-xs font-mono-tabular font-semibold text-[#C23B0A]">
                {ticket.ticketNumber}
              </span>
            </div>
            <p className="text-xs text-[#6B625B]">
              {mode === 'staff'
                ? `${ticket.organization} · Live Online`
                : `Tier-2 Infra Specialist · Replies < 1m`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono-tabular font-semibold text-[#9F2D06] bg-[#FDF2F0] px-3 py-1.5 rounded-lg">
            SLA {ticket.slaMinutesRemaining}m left
          </span>
          <button
            type="button"
            onClick={() => setShowBundle(!showBundle)}
            className="px-3 py-1.5 rounded-lg border border-[#E5DDD5] text-xs font-semibold text-[#171412] hover:border-[#C23B0A] flex items-center gap-1.5"
          >
            <FileCode2 className="w-3.5 h-3.5 text-[#C23B0A]" />
            <span>Diagnostics #DIAG-882</span>
          </button>
        </div>
      </div>

      {showBundle && (
        <div className="px-5 py-3 bg-[#171412] text-[#FAF8F6] text-xs font-mono-tabular flex flex-wrap items-center justify-between gap-2">
          <span>
            Bundle #DIAG-882 (4.8MB) · Cluster: {ticket.clusterName} · Confidence:{' '}
            {ticket.aiConfidence}%
          </span>
          <button
            type="button"
            onClick={() => setShowBundle(false)}
            className="text-[#E87C56] font-sans font-semibold"
          >
            Close
          </button>
        </div>
      )}

      {/* Messages Feed */}
      <div className="p-4 sm:p-6 space-y-4 bg-[#FAF8F6] min-h-[380px] max-h-[520px] overflow-y-auto">
        {messages.map((m) => {
          const isMe =
            (mode === 'customer' && m.senderRole === 'customer') ||
            (mode === 'staff' && m.senderRole === 'staff');

          if (m.senderRole === 'ai') {
            return (
              <div
                key={m.id}
                className="p-3.5 rounded-2xl bg-white border border-[#E5DDD5] text-xs text-[#574E47] max-w-xl mx-auto text-center"
              >
                <p className="font-semibold text-[#C23B0A] mb-0.5">{m.senderName}</p>
                <p>{m.body}</p>
              </div>
            );
          }

          return (
            <div
              key={m.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
            >
              <span className="text-[11px] text-[#6B625B] mb-1 px-1">
                {m.senderName}
                {m.isInternalNote ? ' · Internal Specialist Note' : ''}
              </span>
              <div
                className={`max-w-lg px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  m.isInternalNote
                    ? 'bg-[#FFF7ED] border border-[#FDBA74] text-[#7C2D12]'
                    : isMe
                      ? 'bg-[#C23B0A] text-white'
                      : 'bg-white border border-[#E5DDD5] text-[#171412]'
                }`}
              >
                {m.body}
              </div>
            </div>
          );
        })}

        {/* Active Runbook RB-402 Status Bar (visible in chat per screenshot) */}
        <div className="bg-white border border-[#E5DDD5] rounded-2xl p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div>
              <p className="text-xs font-bold text-[#171412]">
                Runbook RB-402 · KMS Zero-Downtime Rotation
              </p>
              <p className="text-[11px] text-[#6B625B]">Cluster sync status</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono-tabular font-bold text-[#C23B0A]">
                {runbookProgress}%
              </span>
              {runbookProgress < 100 && mode === 'staff' && (
                <button
                  type="button"
                  onClick={() => setRunbookProgress(100)}
                  className="px-2.5 py-1 rounded-lg bg-[#171412] text-white text-[11px] font-semibold flex items-center gap-1"
                >
                  <Play className="w-3 h-3" />
                  <span>Complete Sync</span>
                </button>
              )}
              {runbookProgress === 100 && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              )}
            </div>
          </div>
          <div className="w-full h-1.5 bg-[#F2ECE6] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#C23B0A] rounded-full transition-all"
              style={{ width: `${runbookProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick Actions & Composer */}
      <div className="p-4 border-t border-[#EFE8E1] bg-white space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {mode === 'customer' ? (
              <>
                <button
                  type="button"
                  onClick={() =>
                    handleSend(undefined, 'Staging probes verified clean on our side.')
                  }
                  className="px-3 py-1.5 rounded-lg bg-[#FAF8F6] border border-[#E5DDD5] text-xs font-semibold text-[#171412] hover:border-[#C23B0A]"
                >
                  Verify Staging
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSend(undefined, 'Approved Runbook RB-402 KMS cert hot-swap.')
                  }
                  className="px-3 py-1.5 rounded-lg bg-[#FAF8F6] border border-[#E5DDD5] text-xs font-semibold text-[#171412] hover:border-[#C23B0A]"
                >
                  Approve Runbook
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsInternalNote(!isInternalNote)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border ${
                    isInternalNote
                      ? 'bg-[#FFF7ED] border-[#FDBA74] text-[#9A3412]'
                      : 'bg-[#FAF8F6] border-[#E5DDD5] text-[#171412]'
                  }`}
                >
                  <Lock className="w-3 h-3" />
                  <span>{isInternalNote ? 'Internal Note Mode' : 'Public Customer Reply'}</span>
                </button>
                <button
                  type="button"
                  disabled={drafting}
                  onClick={handleAIDraft}
                  className="px-3 py-1.5 rounded-lg bg-[#FDF2F0] border border-[#F3C5BA] text-xs font-semibold text-[#C23B0A] hover:bg-[#FBE4DF] flex items-center gap-1.5 disabled:opacity-60"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{drafting ? 'Drafting...' : 'AI Draft Reply'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        <form onSubmit={(e) => handleSend(e)} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              mode === 'staff'
                ? `Reply to ${ticket.customerName.split(' ')[0]} as Specialist...`
                : `Type message to ${ticket.assignedStaffName.split(' ')[0]}...`
            }
            className="flex-1 px-4 py-3 text-sm bg-[#FAF8F6] border border-[#E5DDD5] rounded-xl focus:outline-none focus:border-[#C23B0A]"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="px-5 py-3 rounded-xl bg-[#C23B0A] text-white text-xs font-semibold hover:bg-[#A63107] transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
