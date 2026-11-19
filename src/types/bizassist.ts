import type { Timestamp } from 'firebase/firestore';

export type PortalRole = 'customer' | 'staff' | 'admin';

export type TicketCategory =
  | 'Billing & Invoices'
  | 'API Integration'
  | 'Account Access'
  | 'Bug Report';

export type TicketSeverity = 'Low' | 'Medium' | 'High' | 'Critical P1';

export type TicketStatus =
  | 'Open / Triage'
  | 'In Progress'
  | 'Waiting on Customer'
  | 'Escalate Tier-3'
  | 'Pending Verification'
  | 'Resolved & Closed';

export type ScreenId =
  // Auth Screens
  | 'auth-customer'
  | 'auth-staff'
  | 'auth-admin'
  // Customer Portal Screens
  | 'customer-portal'
  | 'customer-submit'
  | 'customer-tickets'
  | 'customer-ticket-detail'
  | 'customer-chat'
  | 'customer-notifications'
  // Staff Specialist Screens
  | 'staff-dashboard'
  | 'staff-queue'
  | 'staff-ticket-detail'
  | 'staff-update-status'
  | 'staff-resolve'
  | 'staff-chat'
  | 'staff-profile'
  // Admin & Ops Command Screens
  | 'admin-executive'
  | 'admin-analytics'
  | 'admin-tickets'
  | 'admin-triage-assign'
  | 'admin-copilot';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: PortalRole;
  organization: string;
  urgentRoutingEnabled: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Ticket {
  id: string;
  workspaceOwnerId: string;
  ticketNumber: string;
  title: string;
  description: string;
  category: TicketCategory;
  severity: TicketSeverity;
  status: TicketStatus;
  customerName: string;
  organization: string;
  clusterName: string;
  assignedStaffId: string;
  assignedStaffName: string;
  aiConfidence: number;
  predictedRootCause: string;
  recommendedRunbook: string;
  routingDestination: string;
  attachmentName: string;
  slaMinutesRemaining: number;
  stageIndex: number;
  internalNotes: string;
  customerSummary: string;
  rootCauseClass: string;
  remediationMethod: string;
  transitionReason: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface TicketMessage {
  id: string;
  workspaceOwnerId: string;
  ticketId: string;
  senderRole: 'customer' | 'staff' | 'ai';
  senderName: string;
  body: string;
  isInternalNote: boolean;
  runbookId: string;
  createdAt?: Timestamp;
}

export interface Specialist {
  id: string;
  workspaceOwnerId: string;
  name: string;
  title: string;
  teamTag: string;
  activeCount: number;
  resolvedCount: number;
  loadPercent: number;
  avgMttrMinutes: number;
  csatScore: number;
  isCopilotPick: boolean;
  avatarKey: 'sarah' | 'marcus' | 'elena';
  updatedAt?: Timestamp;
}

export interface NotificationItem {
  id: string;
  workspaceOwnerId: string;
  kind: 'Urgent P1' | 'AI Updates' | 'SLA';
  title: string;
  summary: string;
  ticketId: string;
  ticketNumber: string;
  read: boolean;
  createdAt?: Timestamp;
}

export const AVATAR_PATHS: Record<'elena' | 'sarah' | 'marcus', string> = {
  elena: '/src/assets/images/avatar_elena_1795065671161.jpg',
  sarah: '/src/assets/images/avatar_sarah_1795065672299.jpg',
  marcus: '/src/assets/images/avatar_marcus_1795065671118.jpg',
};
