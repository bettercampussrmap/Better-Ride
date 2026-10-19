import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_SUPABASE_URL = 'travel_buddy_supabase_url';
const STORAGE_KEY_SUPABASE_KEY = 'travel_buddy_supabase_key';

let cachedClient: SupabaseClient | null = null;
let cachedUrl: string | null = null;
let cachedKey: string | null = null;

export function normalizeSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  // Automatically extract project ref if full dashboard settings URL was pasted
  const dashboardMatch = url.match(/supabase\.com\/dashboard\/project\/([a-zA-Z0-9_-]+)/);
  if (dashboardMatch && dashboardMatch[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  return url.replace(/\/+$/, '');
}

export function getSupabaseEnvConfig(): { url: string; key: string } {
  const rawUrl =
    (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_SUPABASE_URL) : null) ||
    (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
    (import.meta.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined) ||
    'https://wcsqvmmiivxtgnoikwwm.supabase.co';

  const key =
    (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_SUPABASE_KEY) : null) ||
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
    (import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined) ||
    (import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
    '';

  const url = normalizeSupabaseUrl(rawUrl);
  return { url, key: key.trim() };
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = getSupabaseEnvConfig();
  return Boolean(url && key && url.startsWith('http'));
}

export function getSupabase(): SupabaseClient | null {
  const { url, key } = getSupabaseEnvConfig();

  if (!url || !key || !url.startsWith('http')) {
    return null;
  }

  if (cachedClient && cachedUrl === url && cachedKey === key) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'implicit',
      },
    });
    cachedUrl = url;
    cachedKey = key;
    return cachedClient;
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
    return null;
  }
}

export function saveCustomSupabaseConfig(url: string, key: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_SUPABASE_URL, normalizeSupabaseUrl(url));
    localStorage.setItem(STORAGE_KEY_SUPABASE_KEY, key.trim());
  }
  cachedClient = null;
  cachedUrl = null;
  cachedKey = null;
}

export function clearCustomSupabaseConfig(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_SUPABASE_URL);
    localStorage.removeItem(STORAGE_KEY_SUPABASE_KEY);
  }
  cachedClient = null;
  cachedUrl = null;
  cachedKey = null;
}

export async function getGoogleOAuthUrl(): Promise<string> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }

  const currentRedirect = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}`
    : undefined;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: currentRedirect,
      skipBrowserRedirect: true,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  });

  if (error || !data?.url) {
    throw error || new Error('Could not generate Google OAuth URL');
  }

  return data.url;
}

export async function signInWithGoogle() {
  const url = await getGoogleOAuthUrl();
  if (typeof window !== 'undefined') {
    window.open(url, '_blank');
  }
}

export async function signOut(): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase sign-out error:', e);
    }
  }
}

export async function ensureAuthenticatedSession(params: {
  name?: string;
  email?: string;
  avatarUrl?: string;
}): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      return session.user.id;
    }
    return null;
  } catch (e) {
    console.warn('Supabase ensure session check:', e);
    return null;
  }
}
