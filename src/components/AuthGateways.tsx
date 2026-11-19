import React, { useState } from 'react';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Fingerprint,
  Flame,
  KeyRound,
  Lock,
  Mail,
  Shield,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import type { PortalRole, ScreenId } from '../types/bizassist';

interface AuthGatewaysProps {
  activeAuthScreen: 'auth-customer' | 'auth-staff' | 'auth-admin';
  onSwitchAuthScreen: (screen: 'auth-customer' | 'auth-staff' | 'auth-admin') => void;
  onGoogleSignIn: (role: PortalRole) => Promise<void>;
  authLoading: boolean;
  authError: string | null;
  onNavigate?: (screen: ScreenId) => void;
}

export function AuthGateways({
  activeAuthScreen,
  onSwitchAuthScreen,
  onGoogleSignIn,
  authLoading,
  authError,
}: AuthGatewaysProps) {
  const [customerTab, setCustomerTab] = useState<'signin' | 'create'>('signin');
  const [email, setEmail] = useState('elena.rostova@acmecorp.io');
  const [password, setPassword] = useState('••••••••••••••');
  const [showPass, setShowPass] = useState(false);
  const [fastPassStatus, setFastPassStatus] = useState<string | null>(null);
  const [yubikeyTouched, setYubikeyTouched] = useState(false);

  const handleFormSubmit = async (e: React.FormEvent, role: PortalRole) => {
    e.preventDefault();
    await onGoogleSignIn(role);
  };

  const handleBiometric = async (role: PortalRole) => {
    setFastPassStatus('Cryptographic handshake verified. Signing in...');
    await onGoogleSignIn(role);
    setFastPassStatus(null);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F6] flex flex-col justify-between p-4 sm:p-8">
      {/* Top Gateway Switcher */}
      <header className="max-w-5xl w-full mx-auto flex flex-wrap items-center justify-between gap-4 pb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#C23B0A] text-white flex items-center justify-center shadow-sm">
            <Flame className="w-5 h-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-[#171412] whitespace-nowrap">
            BizAssist AI
          </span>
        </div>

        <nav
          aria-label="Portal gateway selector"
          className="flex items-center gap-1 p-1 bg-white border border-[#E5DDD5] rounded-xl"
        >
          <button
            type="button"
            onClick={() => onSwitchAuthScreen('auth-customer')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeAuthScreen === 'auth-customer'
                ? 'bg-[#C23B0A] text-white'
                : 'text-[#6B625B] hover:text-[#171412]'
            }`}
          >
            Customer Portal
          </button>
          <button
            type="button"
            onClick={() => onSwitchAuthScreen('auth-staff')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeAuthScreen === 'auth-staff'
                ? 'bg-[#C23B0A] text-white'
                : 'text-[#6B625B] hover:text-[#171412]'
            }`}
          >
            Staff Workspace
          </button>
          <button
            type="button"
            onClick={() => onSwitchAuthScreen('auth-admin')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeAuthScreen === 'auth-admin'
                ? 'bg-[#C23B0A] text-white'
                : 'text-[#6B625B] hover:text-[#171412]'
            }`}
          >
            Admin Console
          </button>
        </nav>
      </header>

      {/* Main Split Card Container */}
      <main className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch my-auto py-4">
        {/* Left Brand Context Panel */}
        <section className="lg:col-span-5 bg-[#171412] text-[#FAF8F6] rounded-3xl p-8 flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium tracking-wider uppercase text-[#E87C56] mb-3">
              {activeAuthScreen === 'auth-customer'
                ? 'Enterprise Customer Portal'
                : activeAuthScreen === 'auth-staff'
                  ? 'Kernel Ops · Staff Specialist Portal'
                  : 'Intelligence Mesh · Sec-Ops Tier 1'}
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-balance leading-tight mb-4">
              {activeAuthScreen === 'auth-customer'
                ? 'Warm, Kinetic Business Intelligence at your fingertips.'
                : activeAuthScreen === 'auth-staff'
                  ? 'Secure triage dispatch & tier-2 incident response.'
                  : 'Global infrastructure, tenant governance & dispatch gateway.'}
            </h1>
            <p className="text-sm text-[#CFC6BE] leading-relaxed">
              Real-time autonomous diagnosis, verified runbook execution, and live specialist handoff backed by encrypted cloud persistence.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[#A3988E]">Gateway SLA</p>
                <p className="text-xl font-bold font-mono-tabular text-white mt-0.5">99.98%</p>
              </div>
              <div>
                <p className="text-xs text-[#A3988E]">Avg Triage</p>
                <p className="text-xl font-bold font-mono-tabular text-white mt-0.5">04m 12s</p>
              </div>
            </div>
            <p className="text-xs text-[#A3988E]">
              SOC-2 Type II Certified · ISO/IEC 27001 · FIPS 140-3
            </p>
          </div>
        </section>

        {/* Right Interactive Auth Card */}
        <section className="lg:col-span-7 bg-white border border-[#E5DDD5] rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-center">
          {authError && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-xl bg-[#FDF2F0] border border-[#F3C5BA] text-xs font-medium text-[#9F2D06]"
            >
              {authError}
            </div>
          )}

          {fastPassStatus && (
            <div className="mb-5 p-3.5 rounded-xl bg-[#FAF8F6] border border-[#E5DDD5] text-xs font-medium text-[#171412]">
              {fastPassStatus}
            </div>
          )}

          {/* 1. CUSTOMER REGISTRATION & LOGIN */}
          {activeAuthScreen === 'auth-customer' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-[#171412]">Customer Portal</h2>
                  <p className="text-sm text-[#6B625B] mt-0.5">
                    Sign in to track active incidents or launch AI diagnostics.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1 p-1 bg-[#F4EFEA] rounded-xl mb-6">
                <button
                  type="button"
                  onClick={() => setCustomerTab('signin')}
                  className={`py-2.5 text-xs font-semibold rounded-lg transition-colors ${
                    customerTab === 'signin'
                      ? 'bg-white text-[#C23B0A] shadow-sm'
                      : 'text-[#6B625B] hover:text-[#171412]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerTab('create')}
                  className={`py-2.5 text-xs font-semibold rounded-lg transition-colors ${
                    customerTab === 'create'
                      ? 'bg-white text-[#C23B0A] shadow-sm'
                      : 'text-[#6B625B] hover:text-[#171412]'
                  }`}
                >
                  Create Account
                </button>
              </div>

              <form onSubmit={(e) => handleFormSubmit(e, 'customer')} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="cust-email"
                      className="text-xs font-semibold uppercase tracking-wide text-[#574E47]"
                    >
                      Work Email
                    </label>
                    <span className="text-xs font-medium text-[#C23B0A]">Verified Domain</span>
                  </div>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#8C8278] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="cust-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 text-sm bg-[#FAF8F6] border border-[#E5DDD5] rounded-xl focus:outline-none focus:border-[#C23B0A]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="cust-password"
                      className="text-xs font-semibold uppercase tracking-wide text-[#574E47]"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setFastPassStatus('Use Google SSO below to authenticate securely.')
                      }
                      className="text-xs font-medium text-[#C23B0A] hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#8C8278] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="cust-password"
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 text-sm bg-[#FAF8F6] border border-[#E5DDD5] rounded-xl focus:outline-none focus:border-[#C23B0A]"
                    />
                    <button
                      type="button"
                      aria-label={showPass ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8278] hover:text-[#171412]"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3.5 px-5 rounded-xl bg-[#C23B0A] text-white text-sm font-semibold hover:bg-[#A63107] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <span>
                    {authLoading
                      ? 'Authenticating...'
                      : customerTab === 'signin'
                        ? 'Sign In to Portal'
                        : 'Create Enterprise Account'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Fast Pass Biometric Block */}
              <div className="mt-5 p-4 rounded-2xl bg-[#FAF8F6] border border-[#E5DDD5] flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FDF2F0] text-[#C23B0A] flex items-center justify-center shrink-0">
                    <Fingerprint className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#171412]">Fast Pass Active</p>
                    <p className="text-xs text-[#6B625B]">Touch ID or Face ID</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={() => handleBiometric('customer')}
                  className="px-4 py-2 rounded-xl bg-white border border-[#E5DDD5] text-xs font-semibold text-[#171412] hover:border-[#C23B0A] transition-colors whitespace-nowrap"
                >
                  Authenticate
                </button>
              </div>

              <div className="mt-6">
                <p className="text-center text-[11px] font-semibold uppercase tracking-wider text-[#8C8278] mb-3">
                  Or Single Sign-On (SSO)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={authLoading}
                    onClick={() => onGoogleSignIn('customer')}
                    className="py-2.5 px-4 rounded-xl border border-[#E5DDD5] bg-white text-xs font-semibold text-[#171412] hover:bg-[#FAF8F6] transition-colors flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#C23B0A]" />
                    <span>Okta Verify</span>
                  </button>
                  <button
                    type="button"
                    disabled={authLoading}
                    onClick={() => onGoogleSignIn('customer')}
                    className="py-2.5 px-4 rounded-xl border border-[#E5DDD5] bg-white text-xs font-semibold text-[#171412] hover:bg-[#FAF8F6] transition-colors flex items-center justify-center gap-2"
                  >
                    <Shield className="w-4 h-4 text-[#C23B0A]" />
                    <span>Google Suite</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. STAFF SPECIALIST LOGIN */}
          {activeAuthScreen === 'auth-staff' && (
            <div>
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#C23B0A] mb-1">
                  Staff Specialist Portal
                </p>
                <h2 className="text-2xl font-bold text-[#171412]">Specialist Workspace</h2>
                <p className="text-sm text-[#6B625B] mt-0.5">
                  Secure triage dispatch &amp; tier-2 incident response.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={() => onGoogleSignIn('staff')}
                  className="py-2.5 px-4 rounded-xl border border-[#E5DDD5] bg-[#FAF8F6] text-xs font-semibold text-[#171412] hover:border-[#C23B0A] transition-colors"
                >
                  Okta SSO
                </button>
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={() => onGoogleSignIn('staff')}
                  className="py-2.5 px-4 rounded-xl border border-[#E5DDD5] bg-[#FAF8F6] text-xs font-semibold text-[#171412] hover:border-[#C23B0A] transition-colors"
                >
                  Google Identity
                </button>
              </div>

              <form onSubmit={(e) => handleFormSubmit(e, 'staff')} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="staff-email"
                      className="text-xs font-semibold uppercase tracking-wide text-[#574E47]"
                    >
                      Work Email
                    </label>
                    <span className="text-xs font-medium text-[#C23B0A]">
                      Tier-2 Infra Specialist
                    </span>
                  </div>
                  <input
                    id="staff-email"
                    type="email"
                    defaultValue="sarah.lin@bizassist.internal"
                    className="w-full px-4 py-3 text-sm bg-[#FAF8F6] border border-[#E5DDD5] rounded-xl font-mono-tabular focus:outline-none focus:border-[#C23B0A]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="staff-token"
                      className="text-xs font-semibold uppercase tracking-wide text-[#574E47]"
                    >
                      Security Token / PIN
                    </label>
                    <span className="text-xs text-[#6B625B]">OTP / YubiKey Active</span>
                  </div>
                  <input
                    id="staff-token"
                    type="password"
                    defaultValue="88291044"
                    className="w-full px-4 py-3 text-sm bg-[#FAF8F6] border border-[#E5DDD5] rounded-xl font-mono-tabular focus:outline-none focus:border-[#C23B0A]"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-[#FDF2F0] border border-[#F3C5BA] flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <KeyRound className="w-5 h-5 text-[#C23B0A] shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-[#171412]">
                        YubiKey 5C NFC Detected
                      </p>
                      <p className="text-xs text-[#6B625B]">
                        {yubikeyTouched
                          ? 'Hardware token verified'
                          : 'Touch token to authenticate'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setYubikeyTouched(true)}
                    className="px-3.5 py-2 rounded-xl bg-white border border-[#E5DDD5] text-xs font-semibold text-[#C23B0A] hover:bg-[#FAF8F6] transition-colors whitespace-nowrap"
                  >
                    {yubikeyTouched ? 'Verified' : 'Touch Key'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3.5 px-5 rounded-xl bg-[#C23B0A] text-white text-sm font-semibold hover:bg-[#A63107] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <span>{authLoading ? 'Verifying...' : 'Verify & Enter Workspace'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* 3. ADMIN LOGIN & SECURITY ACCESS */}
          {activeAuthScreen === 'auth-admin' && (
            <div>
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#C23B0A] mb-1">
                  Sec-Ops Tier 1 · Zero-Knowledge Root
                </p>
                <h2 className="text-2xl font-bold text-[#171412]">System Administration</h2>
                <p className="text-sm text-[#6B625B] mt-0.5">
                  Active Partition: Acme Global Cluster (us-east) · PROD
                </p>
              </div>

              <form onSubmit={(e) => handleFormSubmit(e, 'admin')} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="admin-email"
                      className="text-xs font-semibold uppercase tracking-wide text-[#574E47]"
                    >
                      Admin Work ID
                    </label>
                    <span className="text-xs font-medium text-[#C23B0A]">FIDO2 Ready</span>
                  </div>
                  <input
                    id="admin-email"
                    type="email"
                    defaultValue="marcus.vance@bizassist.admin"
                    className="w-full px-4 py-3 text-sm bg-[#FAF8F6] border border-[#E5DDD5] rounded-xl font-mono-tabular focus:outline-none focus:border-[#C23B0A]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="admin-pin"
                      className="text-xs font-semibold uppercase tracking-wide text-[#574E47]"
                    >
                      Master Token PIN / Passkey
                    </label>
                    <span className="text-xs font-medium text-[#6B625B]">6 Digits Req.</span>
                  </div>
                  <input
                    id="admin-pin"
                    type="password"
                    defaultValue="990142"
                    className="w-full px-4 py-3 text-sm bg-[#FAF8F6] border border-[#E5DDD5] rounded-xl font-mono-tabular focus:outline-none focus:border-[#C23B0A]"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-[#FDF2F0] border border-[#F3C5BA] flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-[#C23B0A] shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-[#171412]">
                        YubiKey 5Ci Bio Detected · NFC/USB
                      </p>
                      <p className="text-xs text-[#6B625B]">
                        Hardware cryptographic handshake ready
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setYubikeyTouched(true)}
                    className="px-3.5 py-2 rounded-xl bg-[#9F2D06] text-white text-xs font-semibold hover:bg-[#7D2304] transition-colors whitespace-nowrap"
                  >
                    {yubikeyTouched ? 'Key Synced' : 'Touch Key'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3.5 px-5 rounded-xl bg-[#C23B0A] text-white text-sm font-semibold hover:bg-[#A63107] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <span>{authLoading ? 'Authorizing...' : 'Authorize Admin Console'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={() => onGoogleSignIn('admin')}
                  className="py-2.5 px-4 rounded-xl border border-[#E5DDD5] bg-white text-xs font-semibold text-[#171412] hover:bg-[#FAF8F6] transition-colors"
                >
                  Okta Privileged
                </button>
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={() => onGoogleSignIn('admin')}
                  className="py-2.5 px-4 rounded-xl border border-[#E5DDD5] bg-white text-xs font-semibold text-[#171412] hover:bg-[#FAF8F6] transition-colors"
                >
                  Duo MFA SSO
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="max-w-5xl w-full mx-auto pt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-[#8C8278]">
        <span>Protected by Acme Tenant Isolation Architecture</span>
        <span className="font-mono-tabular">SESSION #ADM-SEC-9901</span>
      </footer>
    </div>
  );
}
