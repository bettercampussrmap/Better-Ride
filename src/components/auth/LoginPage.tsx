import React, { useState, useEffect } from 'react';
import {
  GoogleUserProfile,
  saveGoogleUser,
  getSavedGoogleUser,
} from '../../lib/google-auth';
import {
  isSupabaseConfigured,
  signInWithGoogle as supabaseSignInWithGoogle,
  getSupabase,
  getSupabaseEnvConfig,
  saveCustomSupabaseConfig,
} from '../../lib/supabase';
import { toValidUuid } from '../../lib/uuid-utils';
import { useToast } from '../ui/Toast';
import { Shield, Database, X, ChevronRight, UserPlus } from 'lucide-react';

interface LoginPageProps {
  onGoogleSuccess: (user: GoogleUserProfile) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onGoogleSuccess }) => {
  const { showToast } = useToast();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [supabaseModalOpen, setSupabaseModalOpen] = useState(false);
  const [directPickerOpen, setDirectPickerOpen] = useState(false);
  const [supabaseUrlInput, setSupabaseUrlInput] = useState('');
  const [supabaseKeyInput, setSupabaseKeyInput] = useState('');
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');

  useEffect(() => {
    const config = getSupabaseEnvConfig();
    setSupabaseUrlInput(config.url || '');
    setSupabaseKeyInput(config.key || '');
  }, [supabaseModalOpen]);

  /**
   * Main Sign-In action:
   * Launches Google OAuth 2.0 via Supabase in a standalone popup window
   * (avoiding Google's iframe 403 Forbidden error).
   */
  const handleContinueWithGoogle = async () => {
    setIsSigningIn(true);

    try {
      if (isSupabaseConfigured()) {
        showToast('info', 'Connecting to Google OAuth...', 'Opening Google account selection in popup.');
        const { popup } = await supabaseSignInWithGoogle();

        if (popup) {
          const pollTimer = setInterval(async () => {
            if (popup.closed) {
              clearInterval(pollTimer);
              setIsSigningIn(false);
            }
            const supabase = getSupabase();
            if (supabase) {
              try {
                const {
                  data: { session },
                } = await supabase.auth.getSession();
                if (session?.user) {
                  clearInterval(pollTimer);
                  try {
                    popup.close();
                  } catch {}
                  setIsSigningIn(false);
                  onGoogleSuccess({
                    id: session.user.id,
                    email: session.user.email || '',
                    name:
                      session.user.user_metadata?.full_name ||
                      session.user.email?.split('@')[0] ||
                      'Student',
                    picture: session.user.user_metadata?.avatar_url,
                  });
                }
              } catch {}
            }
          }, 1200);
        }
        return;
      }

      // If Supabase credentials are not yet set, prompt user to connect them
      setSupabaseModalOpen(true);
    } catch (err: any) {
      console.error('Supabase Google OAuth Error:', err);
      const errMsg =
        typeof err === 'object' && err?.message
          ? err.message
          : typeof err === 'string'
          ? err
          : JSON.stringify(err);
      showToast('error', 'Authentication Error', errMsg || 'Could not initiate Google OAuth.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSaveSupabaseAndSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseUrlInput.trim() || !supabaseKeyInput.trim()) {
      showToast('error', 'Missing Credentials', 'Please enter your Supabase Project URL and Anon Key.');
      return;
    }

    try {
      saveCustomSupabaseConfig(supabaseUrlInput.trim(), supabaseKeyInput.trim());
      setSupabaseModalOpen(false);
      showToast('info', 'Connecting to Google OAuth...', 'Initiating Google sign-in via Supabase.');
      setIsSigningIn(true);
      await supabaseSignInWithGoogle();
    } catch (err: any) {
      console.error('Save & Sign-in error:', err);
      const msg = err?.message || 'Could not connect to Supabase Google OAuth.';
      showToast('error', 'Sign-in Failed', msg);
    } finally {
      setIsSigningIn(false);
    }
  };

  // Direct fallback sign-in with Google account
  const handleDirectSignIn = (emailToUse: string, nameToUse?: string) => {
    const cleanEmail = emailToUse.trim();
    if (!cleanEmail) return;
    const cleanName = (nameToUse || cleanEmail.split('@')[0]).trim();
    const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
      cleanName
    )}&backgroundColor=1A73E8`;

    const user: GoogleUserProfile = {
      id: toValidUuid(`google-${cleanEmail.toLowerCase()}`),
      googleSub: cleanEmail.toLowerCase(),
      email: cleanEmail,
      name: cleanName,
      picture: avatar,
    };

    saveGoogleUser(user);
    showToast('success', 'Signed In', `Welcome, ${cleanName}!`);
    setDirectPickerOpen(false);
    onGoogleSuccess(user);
  };

  const defaultKnownAccounts = [
    { name: 'Google User', email: 'urvlogs567@gmail.com' },
  ];

  return (
    <div className="min-h-screen flex flex-col justify-between items-center bg-[#FAFAF8] px-4 py-6 sm:py-8 selection:bg-[#09090B] selection:text-white relative">
      {/* Top spacer */}
      <div className="h-4" />

      {/* Main Login Card */}
      <div className="w-full max-w-[340px] my-auto">
        <div className="bg-white rounded-2xl p-6 sm:p-7 shadow-2xs border border-[#E4E4E7] text-center flex flex-col items-center space-y-6">
          {/* Better Ride Exact Uploaded Emblem Logo */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-[#183F2A]/20 bg-white shadow-sm p-0.5 shrink-0">
            <img
              src="/better-ride-logo.png"
              alt="Better Ride"
              className="w-full h-full object-cover rounded-full"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/better-ride-logo.jpg';
              }}
            />
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

          {/* Sign In Button: Only the white Google Sign-In button */}
          <div className="w-full space-y-3">
            <button
              type="button"
              onClick={handleContinueWithGoogle}
              disabled={isSigningIn}
              className="w-full h-11 rounded-xl bg-white hover:bg-[#F8FAFD] active:scale-[0.99] text-[#1F1F1F] font-semibold text-xs sm:text-sm flex items-center justify-center gap-3 transition-all cursor-pointer border border-[#DADCE0] hover:border-[#D2E3FC] shadow-2xs hover:shadow-xs disabled:opacity-50"
            >
              {isSigningIn ? (
                <div className="w-4 h-4 border-2 border-[#1A73E8] border-t-transparent rounded-full animate-spin" />
              ) : (
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
              )}
              <span>{isSigningIn ? 'Connecting to Google...' : 'Continue with Google'}</span>
            </button>

          </div>
        </div>
      </div>

      {/* Bottom required branding */}
      <footer className="w-full text-center py-3">
        <p className="text-[11px] font-medium text-[#71717A]">
          Better Campus Community
        </p>
      </footer>

      {/* DIRECT GOOGLE ACCOUNT CHOOSER (Bypasses Google Cloud Console 403 issues) */}
      {directPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-[380px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-150 text-[#09090B]"
            role="dialog"
            aria-modal="true"
          >
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
                onClick={() => setDirectPickerOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-0.5">
                <h2 className="text-base font-bold text-gray-900 tracking-tight">
                  Choose an account
                </h2>
                <p className="text-[11px] text-gray-500">
                  to continue to <strong className="text-gray-800">Better Ride</strong>
                </p>
              </div>

              <div className="space-y-1.5 divide-y divide-gray-100">
                {defaultKnownAccounts.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => handleDirectSignIn(acc.email, acc.name)}
                    className="w-full text-left py-2.5 px-2.5 -mx-2.5 rounded-xl hover:bg-gray-50 flex items-center gap-3 transition-colors cursor-pointer group"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#1A73E8] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      {acc.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                        {acc.name}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">{acc.email}</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-700 transition-colors shrink-0" />
                  </button>
                ))}
              </div>

              {/* Enter any Google email */}
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <p className="text-[11px] font-bold text-gray-700">Or enter your Google email:</p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    placeholder="student@srmist.edu.in or gmail"
                    className="flex-1 px-3 py-1.5 rounded-xl border border-gray-200 text-xs outline-none focus:border-[#1A73E8]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customEmail) handleDirectSignIn(customEmail);
                    }}
                    className="px-3 py-1.5 bg-[#1A73E8] text-white text-xs font-bold rounded-xl hover:bg-[#1557b0] transition-colors cursor-pointer"
                  >
                    Sign In
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUPABASE CONNECTION MODAL */}
      {supabaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-[380px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-150 text-[#09090B]"
            role="dialog"
            aria-modal="true"
          >
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#22C55E]" />
                <span className="text-xs font-bold text-gray-800">
                  Supabase Google OAuth Setup
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSupabaseModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSupabaseAndSignIn} className="p-5 space-y-3.5">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-gray-900">
                  Link Supabase Authentication
                </h3>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Enter your Supabase Project URL and public Anon key. Signing in will launch Google
                  OAuth 2.0 in a standalone popup window.
                </p>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Supabase Project URL
                  </label>
                  <input
                    type="text"
                    required
                    value={supabaseUrlInput}
                    onChange={(e) => setSupabaseUrlInput(e.target.value)}
                    placeholder="https://your-project.supabase.co"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-[#09090B] focus:ring-1 focus:ring-[#09090B] outline-none text-xs text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Supabase Anon API Key
                  </label>
                  <input
                    type="password"
                    required
                    value={supabaseKeyInput}
                    onChange={(e) => setSupabaseKeyInput(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-[#09090B] focus:ring-1 focus:ring-[#09090B] outline-none text-xs text-gray-900"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSupabaseModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSigningIn}
                  className="px-4 py-1.5 rounded-lg bg-[#09090B] hover:bg-[#18181B] text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isSigningIn ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : null}
                  <span>Save & Continue to Google</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
