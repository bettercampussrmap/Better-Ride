import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_SUPABASE_URL = 'travel_buddy_supabase_url';
const STORAGE_KEY_SUPABASE_KEY = 'travel_buddy_supabase_key';

let cachedClient: SupabaseClient | null = null;
let cachedUrl: string | null = null;
let cachedKey: string | null = null;

export function normalizeSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();

  // If dashboard URL was pasted: e.g. supabase.com/dashboard/project/abcdef/settings/api
  const dashboardMatch = url.match(/supabase\.com\/dashboard\/project\/([a-zA-Z0-9_-]+)/i);
  if (dashboardMatch && dashboardMatch[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }

  // If any standard supabase.co domain was provided with paths like /rest/v1 or /auth/v1
  const supabaseCoMatch = url.match(/([a-zA-Z0-9_-]+)\.supabase\.co/i);
  if (supabaseCoMatch && supabaseCoMatch[1]) {
    return `https://${supabaseCoMatch[1]}.supabase.co`;
  }

  // Otherwise, ensure protocol and strip ALL paths, query strings, and hashes
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  try {
    const parsed = new URL(url);
    return parsed.origin;
  } catch {
    return url.replace(/\/+$/, '');
  }
}

export function getSupabaseEnvConfig(): { url: string; key: string } {
  let rawUrl =
    (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_SUPABASE_URL) : null) ||
    (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
    (import.meta.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined) ||
    '';

  const key =
    (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_SUPABASE_KEY) : null) ||
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
    (import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined) ||
    (import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
    '';

  const url = normalizeSupabaseUrl(rawUrl);

  // If stored in localStorage, ensure cleaned normalized URL is saved back
  if (typeof window !== 'undefined' && rawUrl && rawUrl !== url) {
    try {
      localStorage.setItem(STORAGE_KEY_SUPABASE_URL, url);
    } catch {}
  }

  return { url, key: key.trim() };
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = getSupabaseEnvConfig();
  return Boolean(url && key && url.startsWith('http') && key.length > 20);
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

export async function signInWithGoogle(): Promise<{ url: string; popup: Window | null }> {
  const { url, key } = getSupabaseEnvConfig();
  const supabase = getSupabase();
  if (!supabase || !key || key.length < 20) {
    throw new Error('Supabase client is not configured with an API key.');
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
        prompt: 'select_account',
      },
    },
  });

  if (error || !data?.url) {
    throw error || new Error('Could not generate Google OAuth URL from Supabase.');
  }

  let popup: Window | null = null;
  if (typeof window !== 'undefined') {
    const width = 500;
    const height = 650;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    try {
      popup = window.open(
        data.url,
        'google_oauth_popup',
        `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
      );
    } catch (e) {
      console.warn('Window open error:', e);
    }

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      try {
        popup = window.open(data.url, '_blank');
      } catch {}
    }
  }

  return { url: data.url, popup };
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
