import React, { useState } from 'react';
import { triggerGoogleSignInPrompt, GoogleUserProfile } from '../../lib/google-auth';
import { signInWithGoogle, isSupabaseConfigured } from '../../lib/supabase';
import { useToast } from '../ui/Toast';

interface LoginPageProps {
  onGoogleSuccess: (user: GoogleUserProfile) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onGoogleSuccess }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleContinueWithGoogle = async () => {
    setLoading(true);

    try {
      // Trigger Google account selector directly
      const googleUser = await triggerGoogleSignInPrompt();
      onGoogleSuccess(googleUser);
    } catch (err: any) {
      console.warn('Google sign in prompt note:', err?.message);

      // If Supabase OAuth is configured, try Supabase fallback
      if (isSupabaseConfigured()) {
        try {
          const { error } = await signInWithGoogle();
          if (error) {
            showToast('error', 'Sign-In Error', error.message);
          }
        } catch (supabaseErr: any) {
          showToast('error', 'Sign-In Error', supabaseErr?.message);
        }
      } else {
        showToast(
          'info',
          'Sign In Notice',
          err?.message || 'Please select your Google account in the popup.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between items-center bg-[#F1F7F0] px-4 py-8 sm:py-12 selection:bg-[#245C3A] selection:text-white">
      {/* Spacer */}
      <div className="h-6" />

      {/* Main Login Card */}
      <div className="w-full max-w-md my-auto">
        <div className="bg-[#FFFEFA] rounded-3xl p-8 sm:p-10 shadow-xl shadow-[#183F2A]/5 border border-[#245C3A]/15 text-center flex flex-col items-center">
          {/* Logo Container */}
          <div className="relative mb-6 group">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden shadow-md border-2 border-[#245C3A]/20 bg-white p-1 transition-transform duration-300 group-hover:scale-105">
              <img
                src="/better-campus-logo.png"
                alt="Better Campus Community Logo"
                className="w-full h-full object-contain rounded-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/better-campus-logo.jpg';
                }}
              />
            </div>
          </div>

          {/* Application Name */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#183F2A] tracking-tight mb-2">
            Travel Buddy Finder
          </h1>

          {/* Short Description Slogan */}
          <p className="text-base text-[#737B73] font-medium mb-8 max-w-xs">
            Find your people. Share your ride.
          </p>

          {/* One Clear "Continue with Google" Button */}
          <button
            onClick={handleContinueWithGoogle}
            disabled={loading}
            className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-3 transition-all duration-200 shadow-sm cursor-pointer ${
              loading
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-[#245C3A] hover:bg-[#183F2A] text-white hover:shadow-md hover:shadow-[#245C3A]/20 active:scale-[0.99]'
            }`}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5 shrink-0 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
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
              </>
            )}
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full text-center py-4">
        <p className="text-xs font-medium text-[#737B73]">
          Made by Better Campus Community
        </p>
      </footer>
    </div>
  );
};
