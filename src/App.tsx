import React, { useState, useEffect, useCallback } from 'react';
import { getSupabase, isSupabaseConfigured, signOut as supabaseSignOut } from './lib/supabase';
import { getSavedGoogleUser, clearGoogleUser, GoogleUserProfile } from './lib/google-auth';
import { toValidUuid, isValidUuid } from './lib/uuid-utils';
import { Profile } from './types/database';
import { ToastProvider, useToast } from './components/ui/Toast';
import { LoginPage } from './components/auth/LoginPage';
import { Dashboard } from './components/dashboard/Dashboard';

function AppContent() {
  const { showToast } = useToast();
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync / fetch authenticated user profile from Supabase or Google session
  const syncUserProfile = useCallback(async (authUser: any) => {
    if (!authUser) {
      setProfile(null);
      return;
    }

    const displayName =
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      authUser.name ||
      authUser.email?.split('@')[0] ||
      'Student';
    const avatarUrl =
      authUser.user_metadata?.avatar_url ||
      authUser.user_metadata?.picture ||
      authUser.picture ||
      null;

    const safeId = isValidUuid(authUser.id) ? authUser.id : toValidUuid(authUser.id);

    const fallbackProfile: Profile = {
      id: safeId,
      display_name: displayName,
      email: authUser.email || null,
      avatar_url: avatarUrl,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (!isSupabaseConfigured()) {
      setProfile(fallbackProfile);
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setProfile(fallbackProfile);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', safeId)
        .maybeSingle();

      if (!error && data) {
        setProfile(data as Profile);
      } else {
        const { data: newProfile, error: upsertErr } = await supabase
          .from('profiles')
          .upsert({
            id: safeId,
            display_name: displayName,
            email: authUser.email,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
          })
          .select()
          .maybeSingle();

        if (!upsertErr && newProfile) {
          setProfile(newProfile as Profile);
        } else {
          setProfile(fallbackProfile);
        }
      }
    } catch {
      setProfile(fallbackProfile);
    }
  }, []);

  // Initialize authentication
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      // Clear all stored data, slots, messages, saved logins
      if (typeof window !== 'undefined') {
        localStorage.removeItem('better_ride_active_user');
        localStorage.removeItem('better_ride_mock_slots');
        localStorage.removeItem('better_ride_mock_messages');
        localStorage.removeItem('better_ride_database_users');
        localStorage.removeItem('better_ride_users_by_id');
        localStorage.removeItem('better_ride_google_user');
      }

      // 1. Check Supabase session if configured
      if (isSupabaseConfigured()) {
        const supabase = getSupabase();
        if (supabase) {
          try {
            const {
              data: { session: initialSession },
            } = await supabase.auth.getSession();
            if (initialSession?.user && isMounted) {
              setSession(initialSession);
              setUser(initialSession.user);
              syncUserProfile(initialSession.user);
            }
          } catch (e) {
            console.warn('Session check error:', e);
          }
        }
      }

      if (isMounted) setLoading(false);

      // If running inside OAuth popup window callback:
      if (typeof window !== 'undefined' && window.opener && (window.location.hash.includes('access_token') || window.location.search.includes('code='))) {
        try {
          window.opener.postMessage({ type: 'SUPABASE_OAUTH_SUCCESS' }, '*');
          setTimeout(() => {
            window.close();
          }, 300);
        } catch {}
      }

      // Clean hash fragment from URL if redirected
      if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    };

    initAuth();

    // Listen for OAuth success messages from popup
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'SUPABASE_OAUTH_SUCCESS') {
        const supabase = getSupabase();
        if (supabase) {
          try {
            const { data: { session: newSession } } = await supabase.auth.getSession();
            if (newSession?.user && isMounted) {
              setSession(newSession);
              setUser(newSession.user);
              await syncUserProfile(newSession.user);
              showToast(
                'success',
                'Signed In',
                `Welcome, ${newSession.user.user_metadata?.full_name || 'Student'}!`
              );
            }
          } catch {}
        }
      }
    };
    window.addEventListener('message', handleMessage);

    // Subscribe to Supabase auth changes if configured
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      if (supabase) {
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          if (!isMounted) return;

          setSession(newSession);
          if (newSession?.user) {
            setUser(newSession.user);
            await syncUserProfile(newSession.user);
            if (event === 'SIGNED_IN') {
              showToast(
                'success',
                'Signed In',
                `Welcome, ${newSession.user.user_metadata?.full_name || 'Student'}!`
              );
            }
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setProfile(null);
          }
        });

        return () => {
          isMounted = false;
          subscription.unsubscribe();
        };
      }
    }

    return () => {
      isMounted = false;
    };
  }, [syncUserProfile, showToast]);

  const handleLoginSuccess = useCallback((userProfile: Profile) => {
    const validId = isValidUuid(userProfile.id) ? userProfile.id : toValidUuid(userProfile.id);
    const u = {
      id: validId,
      email: userProfile.email,
      name: userProfile.display_name,
      user_metadata: {
        full_name: userProfile.display_name,
        name: userProfile.display_name,
        avatar_url: userProfile.avatar_url,
        gender: userProfile.gender,
      },
    };
    setUser(u);
    setProfile(userProfile);
    if (typeof window !== 'undefined') {
      localStorage.setItem('better_ride_active_user', JSON.stringify(userProfile));
    }
  }, []);

  const handleSignOut = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('better_ride_active_user');
      localStorage.removeItem('better_ride_mock_slots');
      localStorage.removeItem('better_ride_mock_messages');
      localStorage.removeItem('better_ride_database_users');
      localStorage.removeItem('better_ride_users_by_id');
      localStorage.removeItem('better_ride_google_user');
    }
    clearGoogleUser();
    try {
      await supabaseSignOut();
    } catch {}
    setSession(null);
    setUser(null);
    setProfile(null);
    showToast('info', 'Signed Out', 'You have been signed out.');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAF8] text-[#09090B]">
        <div className="w-16 h-16 rounded-full overflow-hidden border border-[#E4E4E7] bg-white shadow-sm mb-3">
          <img
            src="/assets/aistudio/Gemini_Generated_Image_5av8f85av8f85av8_f440b7ed.png"
            alt="Better Ride"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="w-5 h-5 border-2 border-[#09090B] border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-[11px] font-bold text-[#71717A] tracking-wider uppercase">
          Loading Better Ride...
        </p>
      </div>
    );
  }

  return (
    <>
      {!user ? (
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      ) : (
        <Dashboard
          user={user}
          profile={profile}
          onUpdateProfile={(updatedProfile: Profile) => {
            setProfile(updatedProfile);
            setUser((prev: any) => ({
              ...(prev || {}),
              name: updatedProfile.display_name,
              user_metadata: {
                ...(prev?.user_metadata || {}),
                full_name: updatedProfile.display_name,
                name: updatedProfile.display_name,
              },
            }));
          }}
          onSignOut={handleSignOut}
        />
      )}
    </>
  );
}

export function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;
