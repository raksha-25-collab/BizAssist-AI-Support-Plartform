/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import {
  Activity,
  Bell,
  Bot,
  Flame,
  Inbox,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  PlusCircle,
  Shield,
  Ticket as TicketIcon,
  UserCircle2,
  Users,
} from 'lucide-react';
import { auth, db, googleAuthProvider, handleFirestoreError, OperationType } from './lib/firebase';
import { ensureUserWorkspace } from './lib/seedData';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthGateways } from './components/AuthGateways';
import { CustomerViews } from './components/CustomerViews';
import { StaffViews } from './components/StaffViews';
import { AdminViews } from './components/AdminViews';
import { TicketChatView } from './components/TicketChatView';
import { Avatar } from './components/Avatar';
import type {
  NotificationItem,
  PortalRole,
  ScreenId,
  Specialist,
  Ticket,
  UserProfile,
} from './types/bizassist';

function BizAssistWorkspace() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authScreen, setAuthScreen] = useState<'auth-customer' | 'auth-staff' | 'auth-admin'>(
    'auth-customer'
  );
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [portalRole, setPortalRole] = useState<PortalRole>('customer');
  const [activeScreen, setActiveScreen] = useState<ScreenId>('customer-portal');

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string>('');
  const [seeding, setSeeding] = useState(false);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      if (firebaseUser) {
        setSeeding(true);
        try {
          await ensureUserWorkspace(
            firebaseUser.uid,
            firebaseUser.email || 'elena.rostova@acmecorp.io',
            firebaseUser.displayName || 'Elena Rostova',
            portalRole
          );
        } finally {
          setSeeding(false);
        }
      } else {
        setTickets([]);
        setSpecialists([]);
        setNotifications([]);
        setUserProfile(null);
      }
    });
    return () => unsub();
  }, [portalRole]);

  // Attach Firestore real-time listeners once authenticated
  useEffect(() => {
    if (!user) return;
    const uid = user.uid;

    const unsubProfile = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (snap.exists()) {
          setUserProfile(snap.data() as UserProfile);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}`)
    );

    const unsubTickets = onSnapshot(
      query(collection(db, 'tickets'), where('workspaceOwnerId', '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Ticket, 'id'>),
        }));
        setTickets(list);
        if (list.length > 0) {
          setSelectedTicketId((prev) =>
            prev && list.some((t) => t.id === prev) ? prev : list[0].id
          );
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'tickets')
    );

    const unsubSpecialists = onSnapshot(
      query(collection(db, 'specialists'), where('workspaceOwnerId', '==', uid)),
      (snap) => {
        setSpecialists(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Specialist, 'id'>),
          }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'specialists')
    );

    const unsubNotifs = onSnapshot(
      query(collection(db, 'notifications'), where('workspaceOwnerId', '==', uid)),
      (snap) => {
        setNotifications(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<NotificationItem, 'id'>),
          }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'notifications')
    );

    return () => {
      unsubProfile();
      unsubTickets();
      unsubSpecialists();
      unsubNotifs();
    };
  }, [user]);

  const handleGoogleSignIn = async (targetRole: PortalRole) => {
    setAuthLoading(true);
    setAuthError(null);
    setPortalRole(targetRole);
    try {
      await signInWithPopup(auth, googleAuthProvider);
      if (targetRole === 'customer') setActiveScreen('customer-portal');
      if (targetRole === 'staff') setActiveScreen('staff-dashboard');
      if (targetRole === 'admin') setActiveScreen('admin-executive');
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Unable to complete sign-in. Please retry.'
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSwitchPortal = (nextRole: PortalRole) => {
    setPortalRole(nextRole);
    if (nextRole === 'customer') setActiveScreen('customer-portal');
    if (nextRole === 'staff') setActiveScreen('staff-dashboard');
    if (nextRole === 'admin') setActiveScreen('admin-executive');
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#FAF8F6] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#C23B0A] text-white flex items-center justify-center mx-auto">
            <Flame className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-[#574E47]">Initializing BizAssist AI...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthGateways
        activeAuthScreen={authScreen}
        onSwitchAuthScreen={setAuthScreen}
        onGoogleSignIn={handleGoogleSignIn}
        authLoading={authLoading}
        authError={authError}
      />
    );
  }

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || tickets[0];
  const unreadNotifs = notifications.filter((n) => !n.read).length;

  const customerNav: { id: ScreenId; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'customer-portal', label: 'Portal', icon: LayoutDashboard },
    { id: 'customer-submit', label: 'Submit', icon: PlusCircle },
    { id: 'customer-tickets', label: 'Tickets', icon: TicketIcon },
    { id: 'customer-chat', label: 'Live Chat', icon: MessageSquare },
    { id: 'customer-notifications', label: 'Alerts', icon: Bell },
  ];

  const staffNav: { id: ScreenId; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'staff-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'staff-queue', label: 'Tickets', icon: Inbox },
    { id: 'staff-chat', label: 'Chat', icon: MessageSquare },
    { id: 'staff-profile', label: 'Hub & Alerts', icon: UserCircle2 },
  ];

  const adminNav: { id: ScreenId; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'admin-executive', label: 'Executive', icon: Shield },
    { id: 'admin-tickets', label: 'All Tickets', icon: TicketIcon },
    { id: 'admin-analytics', label: 'Analytics', icon: Activity },
    { id: 'admin-copilot', label: 'AI Co-Pilot', icon: Bot },
  ];

  const currentNav =
    portalRole === 'customer' ? customerNav : portalRole === 'staff' ? staffNav : adminNav;

  return (
    <div className="min-h-screen bg-[#FAF8F6] text-[#171412] flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-white border-r border-[#E5DDD5] p-5 justify-between sticky top-0 h-screen">
        <div className="space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#C23B0A] text-white flex items-center justify-center">
              <Flame className="w-5 h-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-[#171412] whitespace-nowrap">
              BizAssist AI
            </span>
          </div>

          {/* Role Workspace Switcher */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8C8278] px-2">
              Workspace Role
            </p>
            <div className="grid grid-cols-3 gap-1 p-1 bg-[#FAF8F6] border border-[#E5DDD5] rounded-xl">
              {(['customer', 'staff', 'admin'] as PortalRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleSwitchPortal(r)}
                  className={`py-1.5 rounded-lg text-[11px] font-semibold capitalize transition-colors ${
                    portalRole === r
                      ? 'bg-[#C23B0A] text-white'
                      : 'text-[#6B625B] hover:text-[#171412]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation Links */}
          <nav aria-label="Workspace navigation" className="space-y-1">
            {currentNav.map((item) => {
              const Icon = item.icon;
              const active = activeScreen === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveScreen(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-[#FDF2F0] text-[#C23B0A]'
                      : 'text-[#574E47] hover:bg-[#FAF8F6] hover:text-[#171412]'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </span>
                  {item.id === 'customer-notifications' && unreadNotifs > 0 && (
                    <span className="text-xs font-mono-tabular font-bold text-[#C23B0A]">
                      {unreadNotifs}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Account Footer */}
        <div className="pt-4 border-t border-[#EFE8E1] space-y-3">
          <div className="flex items-center gap-3">
            <Avatar
              person={
                portalRole === 'customer'
                  ? 'elena'
                  : portalRole === 'staff'
                    ? 'sarah'
                    : 'marcus'
              }
              name={user.displayName || 'Elena Rostova'}
              size="sm"
              online
            />
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#171412] truncate">
                {portalRole === 'customer'
                  ? user.displayName || 'Elena Rostova'
                  : portalRole === 'staff'
                    ? 'Sarah Lin'
                    : 'Marcus Vance'}
              </p>
              <p className="text-[11px] text-[#6B625B] truncate">{user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => signOut(auth)}
            className="w-full py-2 px-3 rounded-xl border border-[#E5DDD5] text-xs font-semibold text-[#574E47] hover:text-[#171412] hover:border-[#C23B0A] flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract: [Brand] - [4-5 links] - [1 Primary Action] */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E5DDD5] px-4 sm:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-[#C23B0A] text-white flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
            <span className="text-base font-bold tracking-tight text-[#171412] whitespace-nowrap">
              BizAssist AI
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-6 text-xs font-semibold text-[#6B625B]">
            <button
              type="button"
              onClick={() => handleSwitchPortal('customer')}
              className={`whitespace-nowrap transition-colors ${
                portalRole === 'customer' ? 'text-[#C23B0A]' : 'hover:text-[#171412]'
              }`}
            >
              Customer Portal
            </button>
            <button
              type="button"
              onClick={() => handleSwitchPortal('staff')}
              className={`whitespace-nowrap transition-colors ${
                portalRole === 'staff' ? 'text-[#C23B0A]' : 'hover:text-[#171412]'
              }`}
            >
              Staff Workspace
            </button>
            <button
              type="button"
              onClick={() => handleSwitchPortal('admin')}
              className={`whitespace-nowrap transition-colors ${
                portalRole === 'admin' ? 'text-[#C23B0A]' : 'hover:text-[#171412]'
              }`}
            >
              Admin Command
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setPortalRole('customer');
                setActiveScreen('customer-submit');
              }}
              className="px-3.5 py-2 rounded-xl bg-[#C23B0A] text-white text-xs font-semibold hover:bg-[#A63107] whitespace-nowrap shrink-0"
            >
              New Ticket
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 pb-24 lg:pb-10 max-w-6xl w-full mx-auto">
          {seeding || tickets.length === 0 || !selectedTicket ? (
            <div className="bg-white border border-[#E5DDD5] rounded-2xl p-8 text-center space-y-2">
              <p className="text-sm font-semibold text-[#171412]">
                Loading BizAssist Support Workspace...
              </p>
              <p className="text-xs text-[#6B625B]">
                Syncing live tickets, specialists, and AI triage logs.
              </p>
            </div>
          ) : (
            <>
              {(activeScreen === 'customer-portal' ||
                activeScreen === 'customer-submit' ||
                activeScreen === 'customer-tickets' ||
                activeScreen === 'customer-ticket-detail' ||
                activeScreen === 'customer-notifications') && (
                <CustomerViews
                  screen={activeScreen}
                  uid={user.uid}
                  userName={user.displayName || 'Elena Rostova'}
                  tickets={tickets}
                  notifications={notifications}
                  selectedTicket={selectedTicket}
                  onSelectTicket={setSelectedTicketId}
                  onNavigate={setActiveScreen}
                />
              )}

              {(activeScreen === 'customer-chat' || activeScreen === 'staff-chat') && (
                <TicketChatView
                  mode={activeScreen === 'staff-chat' ? 'staff' : 'customer'}
                  uid={user.uid}
                  userName={user.displayName || 'Elena Rostova'}
                  ticket={selectedTicket}
                  onNavigate={setActiveScreen}
                />
              )}

              {(activeScreen === 'staff-dashboard' ||
                activeScreen === 'staff-queue' ||
                activeScreen === 'staff-ticket-detail' ||
                activeScreen === 'staff-update-status' ||
                activeScreen === 'staff-resolve' ||
                activeScreen === 'staff-profile') && (
                <StaffViews
                  screen={activeScreen}
                  uid={user.uid}
                  userProfile={userProfile}
                  tickets={tickets}
                  notifications={notifications}
                  selectedTicket={selectedTicket}
                  onSelectTicket={setSelectedTicketId}
                  onNavigate={setActiveScreen}
                />
              )}

              {(activeScreen === 'admin-executive' ||
                activeScreen === 'admin-analytics' ||
                activeScreen === 'admin-tickets' ||
                activeScreen === 'admin-triage-assign' ||
                activeScreen === 'admin-copilot') && (
                <AdminViews
                  screen={activeScreen}
                  tickets={tickets}
                  specialists={specialists}
                  selectedTicket={selectedTicket}
                  onSelectTicket={setSelectedTicketId}
                  onNavigate={setActiveScreen}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Bottom Tab Bar (5-portal anchor matching Stitch screenshots) */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E5DDD5] grid grid-cols-5 h-16"
      >
        <button
          type="button"
          onClick={() => {
            setPortalRole('customer');
            setActiveScreen('customer-portal');
          }}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${
            activeScreen === 'customer-portal' ? 'text-[#C23B0A]' : 'text-[#6B625B]'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Portal</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setPortalRole('customer');
            setActiveScreen('customer-submit');
          }}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${
            activeScreen === 'customer-submit' ? 'text-[#C23B0A]' : 'text-[#6B625B]'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>Submit</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setPortalRole('customer');
            setActiveScreen('customer-tickets');
          }}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${
            activeScreen === 'customer-tickets' ? 'text-[#C23B0A]' : 'text-[#6B625B]'
          }`}
        >
          <TicketIcon className="w-4 h-4" />
          <span>Tickets</span>
        </button>
        <button
          type="button"
          onClick={() => handleSwitchPortal('staff')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${
            portalRole === 'staff' ? 'text-[#C23B0A]' : 'text-[#6B625B]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff</span>
        </button>
        <button
          type="button"
          onClick={() => handleSwitchPortal('admin')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${
            portalRole === 'admin' ? 'text-[#C23B0A]' : 'text-[#6B625B]'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Admin</span>
        </button>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BizAssistWorkspace />
    </ErrorBoundary>
  );
}
