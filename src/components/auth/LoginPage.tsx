import React, { useState } from 'react';
import { GoogleUserProfile, saveGoogleUser } from '../../lib/google-auth';
import { toValidUuid } from '../../lib/uuid-utils';
import { useToast } from '../ui/Toast';
import { Check, X, Shield, ChevronRight, UserPlus } from 'lucide-react';

interface LoginPageProps {
  onGoogleSuccess: (user: GoogleUserProfile) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onGoogleSuccess }) => {
  const { showToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<'pick_account' | 'allow_consent' | 'custom_account'>('pick_account');
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Selected Google account to authorize
  const [selectedAccount, setSelectedAccount] = useState<{
    name: string;
    email: string;
    picture?: string;
  }>({
    name: 'Rachit Ram',
    email: 'ramrachit0908@gmail.com',
  });

  // Custom account input form state
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');

  const handleOpenAccountPicker = () => {
    setModalStep('pick_account');
    setModalOpen(true);
  };

  const handleSelectAccount = (acc: { name: string; email: string; picture?: string }) => {
    setSelectedAccount(acc);
    setModalStep('allow_consent');
  };

  const handleCustomAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) return;
    const name = customName.trim() || customEmail.split('@')[0];
    const acc = {
      name,
      email: customEmail.trim(),
    };
    setSelectedAccount(acc);
    setModalStep('allow_consent');
  };

  const handleAllowAndSignIn = async () => {
    setIsSigningIn(true);
    try {
      const googleUser: GoogleUserProfile = {
        id: toValidUuid(`google-${selectedAccount.email.toLowerCase()}`),
        googleSub: selectedAccount.email,
        email: selectedAccount.email,
        name: selectedAccount.name,
        picture:
          selectedAccount.picture ||
          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
            selectedAccount.name
          )}&backgroundColor=1a73e8`,
      };

      saveGoogleUser(googleUser);
      showToast('success', 'Google Sign-In', `Signed in as ${googleUser.name}`);
      setModalOpen(false);
      onGoogleSuccess(googleUser);
    } catch (err: any) {
      showToast('error', 'Sign-in Failed', err?.message || 'Could not complete Google sign-in.');
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between items-center bg-[#FAFAF8] px-4 py-8 sm:py-12 selection:bg-[#09090B] selection:text-white relative">
      {/* Spacer */}
      <div className="h-6" />

      {/* Main Login Card - strict minimalist: Logo, App Name, Continue with Google button */}
      <div className="w-full max-w-sm my-auto">
        <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-sm border border-[#E4E4E7] text-center flex flex-col items-center space-y-8">
          {/* Logo container */}
          <div className="w-16 h-16 rounded-2xl bg-[#09090B] text-white flex items-center justify-center font-black text-2xl shadow-sm">
            B
          </div>

          {/* App Name only */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#09090B] tracking-tight">
            Better Ride
          </h1>

          {/* Continue with Google button */}
          <button
            type="button"
            onClick={handleOpenAccountPicker}
            className="w-full h-12 rounded-xl bg-[#09090B] hover:bg-[#18181B] text-white font-bold text-sm flex items-center justify-center gap-3 transition-all cursor-pointer shadow-sm active:scale-[0.99]"
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
        </div>
      </div>

      {/* Bottom exact requested text */}
      <footer className="w-full text-center py-4">
        <p className="text-xs font-medium text-[#71717A]">
          better campus community SRM university AP
        </p>
      </footer>

      {/* IN-FRONT-OF-APP GOOGLE SIGN-UP / ACCOUNT PICKER MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-[420px] bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header with Google Logo & Close */}
            <div className="p-6 pb-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
                <span className="text-sm font-semibold text-gray-700">Sign in with Google</span>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* STEP 1: CHOOSE AN ACCOUNT */}
            {modalStep === 'pick_account' && (
              <div className="p-6 space-y-5">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                    Choose an account
                  </h2>
                  <p className="text-xs text-gray-500">
                    to continue to <strong className="text-gray-800">Better Ride</strong>
                  </p>
                </div>

                <div className="space-y-2 divide-y divide-gray-100">
                  {/* Account 1: User's Account */}
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectAccount({
                        name: 'Rachit Ram',
                        email: 'ramrachit0908@gmail.com',
                      })
                    }
                    className="w-full text-left py-3 px-3 -mx-3 rounded-xl hover:bg-gray-50 flex items-center gap-3.5 transition-colors cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#1A73E8] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                      R
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                        Rachit Ram
                      </p>
                      <p className="text-xs text-gray-500 truncate">ramrachit0908@gmail.com</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-700 transition-colors" />
                  </button>

                  {/* Account 2: SRM University AP Student Account */}
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectAccount({
                        name: 'SRM AP Student',
                        email: 'student@srmap.edu.in',
                      })
                    }
                    className="w-full text-left py-3 px-3 -mx-3 rounded-xl hover:bg-gray-50 flex items-center gap-3.5 transition-colors cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#0F9D58] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                      S
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                        SRM AP Student
                      </p>
                      <p className="text-xs text-gray-500 truncate">student@srmap.edu.in</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-700 transition-colors" />
                  </button>

                  {/* Use another account option */}
                  <button
                    type="button"
                    onClick={() => setModalStep('custom_account')}
                    className="w-full text-left py-3 px-3 -mx-3 rounded-xl hover:bg-gray-50 flex items-center gap-3.5 transition-colors cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-700 group-hover:text-blue-600 transition-colors">
                        Use another Google account
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-700 transition-colors" />
                  </button>
                </div>

                <p className="text-[11px] text-gray-400 leading-relaxed pt-2 border-t border-gray-100">
                  To continue, Google will share your name, email address, and profile picture with
                  Better Ride.
                </p>
              </div>
            )}

            {/* STEP 2: CUSTOM ACCOUNT INPUT */}
            {modalStep === 'custom_account' && (
              <form onSubmit={handleCustomAccountSubmit} className="p-6 space-y-4">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                    Sign in with your Google Account
                  </h2>
                  <p className="text-xs text-gray-500">Enter your university or Google email</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="e.g. Rachit Ram"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20 outline-none text-sm text-gray-900 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Email address
                    </label>
                    <input
                      type="email"
                      required
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      placeholder="e.g. your_name@srmap.edu.in"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20 outline-none text-sm text-gray-900 transition-all"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3">
                  <button
                    type="button"
                    onClick={() => setModalStep('pick_account')}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#1A73E8] hover:bg-[#1557b0] text-white text-xs font-bold transition-all shadow-xs"
                  >
                    Next
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: GOOGLE CONSENT SCREEN (ALLOW) */}
            {modalStep === 'allow_consent' && (
              <div className="p-6 space-y-5">
                {/* Account Header */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="w-10 h-10 rounded-full bg-[#1A73E8] text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {selectedAccount.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {selectedAccount.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{selectedAccount.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalStep('pick_account')}
                    className="text-xs font-semibold text-[#1A73E8] hover:underline"
                  >
                    Change
                  </button>
                </div>

                <div className="space-y-2">
                  <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                    Better Ride wants to access your Google Account
                  </h2>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    This will allow Better Ride to verify you are an SRM University-AP student and
                    connect you with ride sharing groups.
                  </p>
                </div>

                {/* Scopes permissions box */}
                <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100 space-y-3">
                  <div className="flex items-start gap-2.5 text-xs text-gray-700">
                    <Check className="w-4 h-4 text-[#0F9D58] shrink-0 mt-0.5" />
                    <span>See your primary Google Account email address</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-gray-700">
                    <Check className="w-4 h-4 text-[#0F9D58] shrink-0 mt-0.5" />
                    <span>See your personal info, including your name and profile picture</span>
                  </div>
                </div>

                <p className="text-[11px] text-gray-400">
                  Make sure you trust Better Ride. You may be sharing sensitive info with this app.
                </p>

                {/* Allow and Cancel Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    disabled={isSigningIn}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAllowAndSignIn}
                    disabled={isSigningIn}
                    className="px-6 py-2.5 rounded-xl bg-[#1A73E8] hover:bg-[#1557b0] active:scale-[0.99] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                  >
                    {isSigningIn ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <span>Allow</span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
