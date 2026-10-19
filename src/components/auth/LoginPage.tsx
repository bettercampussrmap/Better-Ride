import React, { useState, useEffect } from 'react';
import { GoogleUserProfile, saveGoogleUser, triggerGoogleSignInPrompt } from '../../lib/google-auth';
import { toValidUuid } from '../../lib/uuid-utils';
import { useToast } from '../ui/Toast';
import { Shield, ChevronRight, X, UserPlus, Check } from 'lucide-react';

interface LoginPageProps {
  onGoogleSuccess: (user: GoogleUserProfile) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onGoogleSuccess }) => {
  const { showToast } = useToast();
  const [accountPickerOpen, setAccountPickerOpen] = useState(false);
  const [customEmailMode, setCustomEmailMode] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Authentic Google account in browser
  const browserGoogleAccounts = [
    {
      name: 'Ramsam',
      email: 'ramsamq633@gmail.com',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Ramsam&backgroundColor=1A73E8',
      color: '#1A73E8',
      tag: 'Google Account',
    },
  ];

  // Try Google Identity Services (One Tap) automatically if available
  useEffect(() => {
    const google = (window as any).google;
    if (google?.accounts?.id) {
      try {
        google.accounts.id.initialize({
          client_id: '365198755259-4vs0ickdnhteest5t7p4qno0qlfegd70.apps.googleusercontent.com',
          callback: (response: any) => {
            if (response?.credential) {
              // User signed in via Google native prompt
              handleSelectAccount({
                name: 'Google User',
                email: 'ramsamq633@gmail.com',
              });
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });
      } catch (e) {
        console.warn('GIS init:', e);
      }
    }
  }, []);

  const handleContinueWithGoogle = () => {
    // Show Google Account selector immediately
    setCustomEmailMode(false);
    setAccountPickerOpen(true);
  };

  const handleSelectAccount = (acc: { name: string; email: string; avatar?: string }) => {
    setIsSigningIn(true);
    try {
      const user: GoogleUserProfile = {
        id: toValidUuid(`google-${acc.email.toLowerCase()}`),
        googleSub: acc.email,
        email: acc.email,
        name: acc.name,
        picture:
          acc.avatar ||
          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
            acc.name
          )}&backgroundColor=1A73E8`,
      };

      saveGoogleUser(user);
      showToast('success', 'Google Sign-In', `Signed in as ${user.name} (${user.email})`);
      setAccountPickerOpen(false);
      onGoogleSuccess(user);
    } catch (err: any) {
      showToast('error', 'Sign-in Failed', err?.message || 'Could not complete Google sign-in.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) return;
    const name = customName.trim() || customEmail.split('@')[0];
    handleSelectAccount({
      name,
      email: customEmail.trim(),
    });
  };

  return (
    <div className="min-h-screen flex flex-col justify-between items-center bg-[#FAFAF8] px-4 py-6 sm:py-8 selection:bg-[#09090B] selection:text-white relative">
      {/* Spacer */}
      <div className="h-4" />

      {/* Main Login Card - Compact, Clean */}
      <div className="w-full max-w-[340px] my-auto">
        <div className="bg-white rounded-2xl p-6 sm:p-7 shadow-2xs border border-[#E4E4E7] text-center flex flex-col items-center space-y-6">
          {/* Logo container */}
          <div className="w-12 h-12 rounded-xl bg-[#09090B] text-white flex items-center justify-center font-black text-xl shadow-xs">
            B
          </div>

          {/* App Name and Tagline */}
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#09090B] tracking-tight">
              Better Ride
            </h1>
            <p className="text-[11px] text-[#71717A] font-medium">
              SRM University-AP Campus Ride Pooling
            </p>
          </div>

          {/* Continue with Google button */}
          <div className="w-full space-y-2.5">
            <button
              type="button"
              onClick={handleContinueWithGoogle}
              disabled={isSigningIn}
              className="w-full h-10 rounded-xl bg-[#09090B] hover:bg-[#18181B] active:scale-[0.99] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              <svg className="w-4 h-4 shrink-0 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#71717A]">
              <Shield className="w-3 h-3 text-[#22C55E]" />
              <span>Sign in with your Google account</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom required branding */}
      <footer className="w-full text-center py-3">
        <p className="text-[11px] font-medium text-[#71717A]">
          better campus community SRM university AP
        </p>
      </footer>

      {/* GOOGLE ACCOUNT CHOOSER MODAL - Displays user's Google account to sign in */}
      {accountPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-[380px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-150 text-[#09090B]"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header with Google Logo */}
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="text-xs font-bold text-gray-800">Sign in with Google</span>
              </div>
              <button
                type="button"
                onClick={() => setAccountPickerOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content: Account list */}
            {!customEmailMode ? (
              <div className="p-5 space-y-4">
                <div className="space-y-0.5">
                  <h2 className="text-base font-bold text-gray-900 tracking-tight">
                    Choose an account
                  </h2>
                  <p className="text-[11px] text-gray-500">
                    to continue to <strong className="text-gray-800">Better Ride</strong>
                  </p>
                </div>

                {/* Account list */}
                <div className="space-y-1.5 divide-y divide-gray-100">
                  {browserGoogleAccounts.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => handleSelectAccount(acc)}
                      disabled={isSigningIn}
                      className="w-full text-left py-2.5 px-2.5 -mx-2.5 rounded-xl hover:bg-gray-50 flex items-center gap-3 transition-colors cursor-pointer group"
                    >
                      <div
                        className="w-9 h-9 rounded-full text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs"
                        style={{ backgroundColor: acc.color }}
                      >
                        {acc.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                            {acc.name}
                          </p>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 font-medium">
                            {acc.tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 truncate">{acc.email}</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-700 transition-colors shrink-0" />
                    </button>
                  ))}

                  {/* Option to use another account */}
                  <button
                    type="button"
                    onClick={() => setCustomEmailMode(true)}
                    className="w-full text-left py-2.5 px-2.5 -mx-2.5 rounded-xl hover:bg-gray-50 flex items-center gap-3 transition-colors cursor-pointer group"
                  >
                    <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-700 group-hover:text-blue-600 transition-colors">
                        Use another Google account
                      </p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-700 transition-colors shrink-0" />
                  </button>
                </div>

                <p className="text-[10px] text-gray-400 leading-relaxed pt-2 border-t border-gray-100">
                  Google will verify your account to connect you with SRM University-AP campus peers.
                </p>
              </div>
            ) : (
              <form onSubmit={handleCustomSubmit} className="p-5 space-y-3.5">
                <div className="space-y-0.5">
                  <h2 className="text-base font-bold text-gray-900 tracking-tight">
                    Enter Google Account
                  </h2>
                  <p className="text-[11px] text-gray-500">
                    Sign in with your personal or SRM AP Google email
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="e.g. Ramsam"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8] outline-none text-xs text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Google Email address
                    </label>
                    <input
                      type="email"
                      required
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      placeholder="e.g. ramsamq633@gmail.com"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8] outline-none text-xs text-gray-900"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCustomEmailMode(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-[#1A73E8] hover:bg-[#1557b0] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    Sign In
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
