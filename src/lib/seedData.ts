import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import type {
  PortalRole,
  TicketCategory,
  TicketSeverity,
  TicketStatus,
} from '../types/bizassist';

export async function ensureUserWorkspace(
  uid: string,
  email: string,
  displayName: string,
  preferredRole: PortalRole = 'customer'
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid,
        email: email || 'elena.rostova@acmecorp.io',
        displayName: displayName || 'Elena Rostova',
        role: 'customer',
        organization: 'Acme Enterprise',
        urgentRoutingEnabled: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
  }

  // Check if tickets already seeded for this workspace
  try {
    const existingTickets = await getDocs(
      query(
        collection(db, 'tickets'),
        where('workspaceOwnerId', '==', uid),
        limit(1)
      )
    );
    if (!existingTickets.empty) {
      return;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'tickets');
  }

  // Seed initial BizAssist workspace records in atomic batch
  try {
    const batch = writeBatch(db);

    const t1Id = `ticket_ba8902_${uid.slice(0, 8)}`;
    const t2Id = `ticket_ba8874_${uid.slice(0, 8)}`;
    const t3Id = `ticket_ba8492_${uid.slice(0, 8)}`;
    const t4Id = `ticket_ba8410_${uid.slice(0, 8)}`;
    const t5Id = `ticket_ba8911_${uid.slice(0, 8)}`;
    const t6Id = `ticket_ba8940_${uid.slice(0, 8)}`;

    const ticketsSeed = [
      {
        id: t1Id,
        workspaceOwnerId: uid,
        ticketNumber: '#BA-8902',
        title: 'Payment gateway webhook latency & IdP handshake fail',
        description:
          'Starting 14:20 UTC, 42% of our stripe-inbound events fail handshake with status 504. Dropping retry queues rapidly. Urgent intervention required before settlement cutoff.',
        category: 'API Integration',
        severity: 'Critical P1',
        status: 'In Progress',
        customerName: displayName || 'Elena Rostova',
        organization: 'Acme Enterprise',
        clusterName: 'auth-cluster-east (us-east-1)',
        assignedStaffId: 'spec_sarah',
        assignedStaffName: 'Sarah Lin',
        aiConfidence: 94,
        predictedRootCause:
          'IdP x.509 handshake latency spike on Tier-2 proxy; expired wildcard cert in cluster-east.',
        recommendedRunbook: 'Runbook RB-402: KMS Zero-Downtime Rotation',
        routingDestination: 'Tier-2 Esc. Infrastructure Queue',
        attachmentName: 'payload_err_504_dump.json',
        slaMinutesRemaining: 4,
        stageIndex: 3,
        internalNotes:
          'Rotated expired wildcard IdP x.509 cert in cluster-east via KMS secret store. Staged synthetic probes.',
        customerSummary: '',
        rootCauseClass: 'Infrastructure -> IdP TLS Certificate Expiration',
        remediationMethod: 'Automated Runbook RB-402 (Zero-downtime hot swap)',
        transitionReason: 'Canary cert provisioning at 68%',
      },
      {
        id: t2Id,
        workspaceOwnerId: uid,
        ticketNumber: '#BA-8874',
        title: 'Redis replication lag on cluster-eu-central',
        description:
          'Diagnostics snapshot shows 142ms replica offset while syncing with Node 4 in eu-central-1. Causing stale session reads for EU merchants.',
        category: 'Bug Report',
        severity: 'High',
        status: 'In Progress',
        customerName: 'David Chen',
        organization: 'CloudScale Corp',
        clusterName: 'cluster-eu-central',
        assignedStaffId: 'spec_sarah',
        assignedStaffName: 'Sarah Lin',
        aiConfidence: 89,
        predictedRootCause:
          'BGSAVE I/O saturation on primary replica shard causing 142ms replication lag.',
        recommendedRunbook: 'Runbook RB-219: Replica Buffer Rebalance',
        routingDestination: 'Tier-2 Distributed Systems',
        attachmentName: 'redis_replica_offset.log',
        slaMinutesRemaining: 24,
        stageIndex: 2,
        internalNotes: 'Monitoring Node 4 sync catch-up after IOPS burst limit adjustment.',
        customerSummary: '',
        rootCauseClass: 'Cache Replication -> Disk I/O Contention',
        remediationMethod: 'Runbook RB-219 Replica Rebalance',
        transitionReason: 'Syncing with Node 4',
      },
      {
        id: t3Id,
        workspaceOwnerId: uid,
        ticketNumber: '#BA-8492',
        title: 'Enterprise SSO SAML handshake timeout spikes',
        description:
          'Correlating cluster failover logs across Okta SAML assertions. Intermittent 401 signature mismatches detected during peak checkout window.',
        category: 'Account Access',
        severity: 'High',
        status: 'Waiting on Customer',
        customerName: displayName || 'Elena Rostova',
        organization: 'TechFlow Inc',
        clusterName: 'auth-cluster-west',
        assignedStaffId: 'spec_marcus',
        assignedStaffName: 'Marcus Kane',
        aiConfidence: 82,
        predictedRootCause:
          'IdP metadata clock skew exceeding 120s tolerance on secondary SAML assertion consumer.',
        recommendedRunbook: 'Runbook RB-108: SAML Thumbprint & NTP Sync',
        routingDestination: 'Identity & Access Tier-2',
        attachmentName: 'saml_trace_8492.json',
        slaMinutesRemaining: 45,
        stageIndex: 3,
        internalNotes: 'Awaiting customer confirmation on rotated IdP certificate thumbprint.',
        customerSummary: '',
        rootCauseClass: 'Identity -> SAML Certificate Thumbprint Drift',
        remediationMethod: 'Metadata Re-sync & NTP Validation',
        transitionReason: 'Awaiting Elena verification of staging SSL thumbprint',
      },
      {
        id: t4Id,
        workspaceOwnerId: uid,
        ticketNumber: '#BA-8410',
        title: 'API Webhook SSL auto-renewal validation',
        description:
          'Automated certificate verification passed Let’s Encrypt challenge. Requires customer sign-off on updated webhook endpoint SAN.',
        category: 'API Integration',
        severity: 'Medium',
        status: 'Resolved & Closed',
        customerName: displayName || 'Elena Rostova',
        organization: 'Acme Enterprise',
        clusterName: 'edge-gateway-prod',
        assignedStaffId: 'spec_marcus',
        assignedStaffName: 'Marcus Kane',
        aiConfidence: 97,
        predictedRootCause: 'Scheduled 90-day ACME DNS-01 SSL certificate rotation.',
        recommendedRunbook: 'Runbook RB-044: Edge TLS Validation',
        routingDestination: 'Edge Security Queue',
        attachmentName: 'acme_cert_audit.json',
        slaMinutesRemaining: 120,
        stageIndex: 4,
        internalNotes: 'All edge POPs confirmed TLS 1.3 handshake green.',
        customerSummary:
          'The SSL certificate on your webhook gateway has been renewed and validated across all edge nodes with zero downtime.',
        rootCauseClass: 'Scheduled Security -> ACME Certificate Renewal',
        remediationMethod: 'Automated Edge TLS Rollout',
        transitionReason: 'Mitigation verified and closed',
      },
      {
        id: t5Id,
        workspaceOwnerId: uid,
        ticketNumber: '#BA-8911',
        title: 'OAuth2 Token revocation endpoint 502 Bad Gateway',
        description:
          'NGINX ingress controller connection pool saturation in us-west-2 causing intermittent 502 responses on /oauth2/revoke.',
        category: 'API Integration',
        severity: 'Critical P1',
        status: 'Open / Triage',
        customerName: 'David Chen',
        organization: 'CloudScale Corp',
        clusterName: 'ingress-us-west-2',
        assignedStaffId: '',
        assignedStaffName: 'Unassigned',
        aiConfidence: 96,
        predictedRootCause:
          'NGINX ingress controller keepalive connection pool saturation in us-west-2.',
        recommendedRunbook: 'Runbook RB-402: Ingress Pool Expansion',
        routingDestination: 'Tier-2 Infra Specialist Pool',
        attachmentName: 'nginx_502_burst.json',
        slaMinutesRemaining: 7,
        stageIndex: 1,
        internalNotes: '',
        customerSummary: '',
        rootCauseClass: '',
        remediationMethod: '',
        transitionReason: 'Auto-triaged by BizAssist Copilot',
      },
      {
        id: t6Id,
        workspaceOwnerId: uid,
        ticketNumber: '#BA-8940',
        title: 'Stripe Retry Spike on cluster EU-West-2',
        description:
          'Payment webhook timeout anomaly on cluster EU-West-2. Latency > 4.8s with 14,200 pending retries queued.',
        category: 'Billing & Invoices',
        severity: 'Critical P1',
        status: 'Open / Triage',
        customerName: 'Hannah Brooks',
        organization: 'FinCore Global',
        clusterName: 'eu-west-2-payments',
        assignedStaffId: '',
        assignedStaffName: 'Unassigned',
        aiConfidence: 92,
        predictedRootCause:
          'Upstream Stripe webhook consumer backpressure from database lock contention.',
        recommendedRunbook: 'Runbook RB-512: Dead-Letter Queue Drain',
        routingDestination: 'Tier-2 Escalations',
        attachmentName: 'stripe_retry_spike.json',
        slaMinutesRemaining: 6,
        stageIndex: 1,
        internalNotes: '',
        customerSummary: '',
        rootCauseClass: '',
        remediationMethod: '',
        transitionReason: 'Escalated to Live Urgent Feed',
      },
    ];

    for (const t of ticketsSeed) {
      const { id, ...rest } = t;
      batch.set(doc(db, 'tickets', id), {
        ...rest,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // Seed messages for primary ticket #BA-8902
    const messagesSeed = [
      {
        id: `msg_1_${uid.slice(0, 6)}`,
        workspaceOwnerId: uid,
        ticketId: t1Id,
        senderRole: 'ai',
        senderName: 'BizAssist AI Handover',
        body: 'BizAssist AI handed over session to Sarah Lin with auto-diagnostic bundle #DIAG-882 and active trace routes attached.',
        isInternalNote: false,
        runbookId: 'RB-402',
      },
      {
        id: `msg_2_${uid.slice(0, 6)}`,
        workspaceOwnerId: uid,
        ticketId: t1Id,
        senderRole: 'staff',
        senderName: 'Sarah Lin',
        body: 'Hi Elena! I am reviewing the auth-cluster-east logs now. The IdP x.509 cert expired at 08:00 UTC, causing the webhook retries to queue up rapidly.',
        isInternalNote: false,
        runbookId: '',
      },
      {
        id: `msg_3_${uid.slice(0, 6)}`,
        workspaceOwnerId: uid,
        ticketId: t1Id,
        senderRole: 'customer',
        senderName: displayName || 'Elena Rostova',
        body: 'Thanks Sarah! We have 140 payment webhooks currently stalling. Can we safely hot-swap the backup cert from KMS without flushing consumer queues?',
        isInternalNote: false,
        runbookId: '',
      },
      {
        id: `msg_4_${uid.slice(0, 6)}`,
        workspaceOwnerId: uid,
        ticketId: t1Id,
        senderRole: 'staff',
        senderName: 'Sarah Lin',
        body: 'Yes, absolutely. I am executing Runbook RB-402 right now. Canary cert provisioning is syncing across cluster-east.',
        isInternalNote: false,
        runbookId: 'RB-402',
      },
    ];

    for (const m of messagesSeed) {
      const { id, ...rest } = m;
      batch.set(doc(db, 'tickets', t1Id, 'messages', id), {
        ...rest,
        createdAt: serverTimestamp(),
      });
    }

    // Seed specialists
    const specialistsSeed = [
      {
        id: `spec_sarah_${uid.slice(0, 8)}`,
        workspaceOwnerId: uid,
        name: 'Sarah Lin',
        title: 'Tier-2 Infra Specialist',
        teamTag: 'Infra',
        activeCount: 4,
        resolvedCount: 38,
        loadPercent: 80,
        avgMttrMinutes: 9,
        csatScore: 99.2,
        isCopilotPick: true,
        avatarKey: 'sarah',
      },
      {
        id: `spec_marcus_${uid.slice(0, 8)}`,
        workspaceOwnerId: uid,
        name: 'Marcus Kane',
        title: 'Senior Distributed Systems',
        teamTag: 'API',
        activeCount: 2,
        resolvedCount: 31,
        loadPercent: 40,
        avgMttrMinutes: 14,
        csatScore: 97.8,
        isCopilotPick: false,
        avatarKey: 'marcus',
      },
      {
        id: `spec_elena_${uid.slice(0, 8)}`,
        workspaceOwnerId: uid,
        name: 'Maya Chen',
        title: 'Principal Auth & Billing SRE',
        teamTag: 'Billing',
        activeCount: 2,
        resolvedCount: 26,
        loadPercent: 35,
        avgMttrMinutes: 11,
        csatScore: 98.5,
        isCopilotPick: false,
        avatarKey: 'elena',
      },
    ];

    for (const s of specialistsSeed) {
      const { id, ...rest } = s;
      batch.set(doc(db, 'specialists', id), {
        ...rest,
        updatedAt: serverTimestamp(),
      });
    }

    // Seed notifications
    const notificationsSeed = [
      {
        id: `notif_1_${uid.slice(0, 8)}`,
        workspaceOwnerId: uid,
        kind: 'Urgent P1',
        title: 'Ticket #BA-8902 Specialist Assigned',
        summary:
          'Sarah Lin (Tier-2) picked up your webhook latency issue. SLA countdown: 04m remaining.',
        ticketId: t1Id,
        ticketNumber: '#BA-8902',
        read: false,
      },
      {
        id: `notif_2_${uid.slice(0, 8)}`,
        workspaceOwnerId: uid,
        kind: 'AI Updates',
        title: 'AI Diagnosis Ready for #BA-8492',
        summary:
          'BizAssist identified cluster failover log match (92% confidence). Suggested remediating DNS record sync.',
        ticketId: t3Id,
        ticketNumber: '#BA-8492',
        read: false,
      },
      {
        id: `notif_3_${uid.slice(0, 8)}`,
        workspaceOwnerId: uid,
        kind: 'SLA',
        title: 'Runbook RB-402 Canary Validation Active',
        summary:
          'Canary cluster provisioned with 0 errors. Traffic rerouting benchmark is 99.98% clean.',
        ticketId: t1Id,
        ticketNumber: '#BA-8902',
        read: false,
      },
    ];

    for (const n of notificationsSeed) {
      const { id, ...rest } = n;
      batch.set(doc(db, 'notifications', id), {
        ...rest,
        createdAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'workspace_seed');
  }

  // Keep preferredRole referenced cleanly for telemetry avoidance
  void preferredRole;
}

export async function createSupportTicket(params: {
  workspaceOwnerId: string;
  title: string;
  description: string;
  category: TicketCategory;
  severity: TicketSeverity;
  customerName: string;
  organization: string;
  clusterName: string;
  attachmentName: string;
  aiConfidence: number;
  predictedRootCause: string;
  recommendedRunbook: string;
  routingDestination: string;
}): Promise<{ id: string; ticketNumber: string }> {
  const num = Math.floor(8950 + Math.random() * 900);
  const ticketNumber = `#BA-${num}`;
  const ticketId = `ticket_ba${num}_${Date.now()}`;

  try {
    await setDoc(doc(db, 'tickets', ticketId), {
      workspaceOwnerId: params.workspaceOwnerId,
      ticketNumber,
      title: params.title.slice(0, 200),
      description: params.description.slice(0, 4000),
      category: params.category,
      severity: params.severity,
      status: 'Open / Triage',
      customerName: params.customerName.slice(0, 120),
      organization: params.organization.slice(0, 120),
      clusterName: params.clusterName.slice(0, 120),
      assignedStaffId: 'spec_sarah',
      assignedStaffName: 'Sarah Lin',
      aiConfidence: Math.min(100, Math.max(0, Math.round(params.aiConfidence))),
      predictedRootCause: params.predictedRootCause.slice(0, 600),
      recommendedRunbook: params.recommendedRunbook.slice(0, 160),
      routingDestination: params.routingDestination.slice(0, 160),
      attachmentName: params.attachmentName.slice(0, 200),
      slaMinutesRemaining: params.severity === 'Critical P1' ? 15 : 60,
      stageIndex: 2,
      internalNotes: '',
      customerSummary: '',
      rootCauseClass: '',
      remediationMethod: '',
      transitionReason: 'Auto-triaged and queued by BizAssist AI',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const msgId = `msg_init_${Date.now()}`;
    await setDoc(doc(db, 'tickets', ticketId, 'messages', msgId), {
      workspaceOwnerId: params.workspaceOwnerId,
      ticketId,
      senderRole: 'ai',
      senderName: 'BizAssist AI Copilot',
      body: `Ticket ${ticketNumber} tokenized and diagnosed (${params.aiConfidence}% match). Recommended ${params.recommendedRunbook}.`,
      isInternalNote: false,
      runbookId: 'RB-402',
      createdAt: serverTimestamp(),
    });

    const notifId = `notif_${Date.now()}`;
    await setDoc(doc(db, 'notifications', notifId), {
      workspaceOwnerId: params.workspaceOwnerId,
      kind: params.severity === 'Critical P1' ? 'Urgent P1' : 'AI Updates',
      title: `New Ticket ${ticketNumber} Auto-Dispatched`,
      summary: `${params.title} routed to ${params.routingDestination}.`,
      ticketId,
      ticketNumber,
      read: false,
      createdAt: serverTimestamp(),
    });

    return { id: ticketId, ticketNumber };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `tickets/${ticketId}`);
  }
}

export async function assignTicketSpecialist(
  ticketId: string,
  staffId: string,
  staffName: string,
  routingDestination: string
): Promise<void> {
  try {
    await updateDoc(doc(db, 'tickets', ticketId), {
      assignedStaffId: staffId,
      assignedStaffName: staffName,
      routingDestination: routingDestination.slice(0, 160),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `tickets/${ticketId}`);
  }
}

export async function updateTicketStatusAction(
  ticketId: string,
  status: TicketStatus,
  transitionReason: string
): Promise<void> {
  const stageMap: Record<TicketStatus, number> = {
    'Open / Triage': 1,
    'In Progress': 2,
    'Waiting on Customer': 3,
    'Escalate Tier-3': 3,
    'Pending Verification': 3,
    'Resolved & Closed': 4,
  };
  try {
    await updateDoc(doc(db, 'tickets', ticketId), {
      status,
      stageIndex: stageMap[status],
      transitionReason: transitionReason.slice(0, 500),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `tickets/${ticketId}`);
  }
}

export async function resolveTicketWithNotes(
  ticketId: string,
  params: {
    rootCauseClass: string;
    remediationMethod: string;
    internalNotes: string;
    customerSummary: string;
  }
): Promise<void> {
  try {
    await updateDoc(doc(db, 'tickets', ticketId), {
      status: 'Resolved & Closed',
      stageIndex: 4,
      rootCauseClass: params.rootCauseClass.slice(0, 200),
      remediationMethod: params.remediationMethod.slice(0, 200),
      internalNotes: params.internalNotes.slice(0, 2000),
      customerSummary: params.customerSummary.slice(0, 2000),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `tickets/${ticketId}`);
  }
}

export async function reopenResolvedTicket(ticketId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'tickets', ticketId), {
      status: 'Open / Triage',
      stageIndex: 1,
      transitionReason: 'Reopened by customer for additional audit',
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `tickets/${ticketId}`);
  }
}

export async function postTicketMessage(params: {
  workspaceOwnerId: string;
  ticketId: string;
  senderRole: 'customer' | 'staff' | 'ai';
  senderName: string;
  body: string;
  isInternalNote?: boolean;
  runbookId?: string;
}): Promise<void> {
  const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  try {
    await setDoc(doc(db, 'tickets', params.ticketId, 'messages', msgId), {
      workspaceOwnerId: params.workspaceOwnerId,
      ticketId: params.ticketId,
      senderRole: params.senderRole,
      senderName: params.senderName.slice(0, 120),
      body: params.body.slice(0, 2500),
      isInternalNote: Boolean(params.isInternalNote),
      runbookId: (params.runbookId || '').slice(0, 80),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(
      err,
      OperationType.CREATE,
      `tickets/${params.ticketId}/messages/${msgId}`
    );
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      read: true,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `notifications/${notificationId}`);
  }
}

export async function markAllNotificationsRead(notificationIds: string[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    for (const id of notificationIds) {
      batch.update(doc(db, 'notifications', id), { read: true });
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'notifications/batch');
  }
}

export async function toggleUserUrgentRouting(uid: string, enabled: boolean): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', uid), {
      urgentRoutingEnabled: enabled,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
  }
}
