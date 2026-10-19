import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Configuration keys lookup: supports both Vite standard (import.meta.env) and process.env,
// as well as NEXT_PUBLIC_ prefixes and custom runtime overrides for setup verification.

const STORAGE_KEY_URL = 'travel_buddy_supabase_url';
const STORAGE_KEY_KEY = 'travel_buddy_supabase_key';

export function getSupabaseEnvConfig(): { url: string; key: string } {
  // 1. Check runtime localStorage override (useful during initial setup / testing in preview)
  if (typeof window !== 'undefined') {
    const customUrl = localStorage.getItem(STORAGE_KEY_URL);
    const customKey = localStorage.getItem(STORAGE_KEY_KEY);
    if (customUrl && customKey) {
      return { url: customUrl.trim(), key: customKey.trim() };
    }
  }

  // 2. Check environment variables
  // Vite exposes env variables through import.meta.env
  const metaEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env : {}) as Record<string, string | undefined>;

  const url =
    metaEnv.NEXT_PUBLIC_SUPABASE_URL ||
    metaEnv.VITE_SUPABASE_URL ||
    (typeof process !== 'undefined' ? (process.env as any)?.NEXT_PUBLIC_SUPABASE_URL : '') ||
    '';

  // Support both new publishable key and legacy anon key format
  const key =
    metaEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    metaEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    metaEnv.VITE_SUPABASE_PUBLISHABLE_KEY ||
    metaEnv.VITE_SUPABASE_ANON_KEY ||
    (typeof process !== 'undefined'
      ? (process.env as any)?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || (process.env as any)?.NEXT_PUBLIC_SUPABASE_ANON_KEY
      : '') ||
    '';

  return {
    url: typeof url === 'string' ? url.trim() : '',
    key: typeof key === 'string' ? key.trim() : '',
  };
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = getSupabaseEnvConfig();
  if (!url || !key) return false;

  // Reject placeholder values that cause 404s
  if (
    url.includes('your-project-id') ||
    url.includes('example.supabase.co') ||
    url.includes('xyzcompany') ||
    url.includes('YOUR_SUPABASE')
  ) {
    return false;
  }

  // Valid Supabase URL starts with https:// and ends with supabase.co or custom domain
  return (
    url.startsWith('https://') &&
    url.length > 18 &&
    key.length > 25 &&
    !key.includes('your-')
  );
}

export function saveCustomSupabaseConfig(url: string, key: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_URL, url.trim());
    localStorage.setItem(STORAGE_KEY_KEY, key.trim());
    // Force reload client
    cachedClient = null;
  }
}

export function clearCustomSupabaseConfig(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_KEY);
    cachedClient = null;
  }
}

let cachedClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const { url, key } = getSupabaseEnvConfig();
  if (!url || !key) return null;

  try {
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'travel-buddy-auth-token',
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

/**
 * Signs in using a verified Google ID token from Google Identity Services
 */
export async function signInWithGoogleIdToken(idToken: string): Promise<{ data: any; error: Error | null }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { data: null, error: new Error('Supabase client is not configured.') };
  }

  try {
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
    return { data, error };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

/**
 * Ensures an authenticated Supabase session exists so requests have valid JWT and role
 */
export async function ensureAuthenticatedSession(profileInfo?: { name?: string; email?: string; avatarUrl?: string }): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      return session.user.id;
    }

    // Sign in to establish authenticated Supabase role & valid UUID
    const { data: anonData } = await supabase.auth.signInAnonymously();
    if (anonData?.user?.id) {
      if (profileInfo) {
        await supabase.from('profiles').upsert({
          id: anonData.user.id,
          display_name: profileInfo.name || 'Student',
          email: profileInfo.email || null,
          avatar_url: profileInfo.avatarUrl || null,
          updated_at: new Date().toISOString(),
        });
      }
      return anonData.user.id;
    }
  } catch (e) {
    console.warn('ensureAuthenticatedSession notice:', e);
  }
  return null;
}

/**
 * Initiates Google OAuth sign-in flow via Supabase Auth
 */
export async function signInWithGoogle(): Promise<{ error: Error | null }> {
  const supabase = getSupabase();
  if (!supabase || !isSupabaseConfigured()) {
    return { error: new Error('Supabase client is not configured with valid credentials.') };
  }

  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/`,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });
    return { error };
  } catch (err: any) {
    return { error: err };
  }
}

/**
 * Sign out from current session
 */
export async function signOut(): Promise<{ error: Error | null }> {
  const supabase = getSupabase();
  if (!supabase) return { error: null };
  const { error } = await supabase.auth.signOut();
  return { error };
}
