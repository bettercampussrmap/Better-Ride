import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  Key,
  Database,
  Globe,
  Settings,
  AlertTriangle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import {
  getSupabaseEnvConfig,
  saveCustomSupabaseConfig,
  clearCustomSupabaseConfig,
  isSupabaseConfigured,
} from '../../lib/supabase';
import { useToast } from '../ui/Toast';

interface SetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated?: () => void;
}

export const SetupGuideModal: React.FC<SetupGuideModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'connect' | 'supabase' | 'oauth' | 'sql' | 'vercel'>('connect');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const envConfig = getSupabaseEnvConfig();
  const [urlInput, setUrlInput] = useState(envConfig.url);
  const [keyInput, setKeyInput] = useState(envConfig.key);
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    showToast('success', 'Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim() || !keyInput.trim()) {
      showToast('error', 'Please fill in both Supabase URL and Key');
      return;
    }

    if (!urlInput.trim().startsWith('https://')) {
      showToast('error', 'Supabase URL must start with https://');
      return;
    }

    setIsTesting(true);
    try {
      saveCustomSupabaseConfig(urlInput.trim(), keyInput.trim());
      showToast('success', 'Supabase credentials saved successfully!');
      if (onConfigUpdated) onConfigUpdated();
      setTimeout(() => {
        setIsTesting(false);
        onClose();
        window.location.reload();
      }, 600);
    } catch (err: any) {
      setIsTesting(false);
      showToast('error', 'Error saving credentials', err?.message || 'Check values');
    }
  };

  const handleClear = () => {
    clearCustomSupabaseConfig();
    setUrlInput('');
    setKeyInput('');
    showToast('info', 'Credentials cleared');
    if (onConfigUpdated) onConfigUpdated();
  };

  const sqlSchemaText = `-- Paste this in Supabase Dashboard > SQL Editor > New query and click "Run"

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    email TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

CREATE TABLE IF NOT EXISTS public.time_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    departure_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_slot_date_window UNIQUE (departure_date, start_time, end_time),
    CONSTRAINT chk_slot_time_order CHECK (start_time < end_time)
);
CREATE INDEX IF NOT EXISTS idx_time_slots_date ON public.time_slots(departure_date);
CREATE INDEX IF NOT EXISTS idx_time_slots_date_time ON public.time_slots(departure_date, start_time);

CREATE TABLE IF NOT EXISTS public.slot_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_id UUID NOT NULL REFERENCES public.time_slots(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_slot_user UNIQUE (slot_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_slot_members_slot_id ON public.slot_members(slot_id);
CREATE INDEX IF NOT EXISTS idx_slot_members_user_id ON public.slot_members(user_id);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_id UUID NOT NULL REFERENCES public.time_slots(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_message_length CHECK (length(trim(content)) > 0 AND length(content) <= 1000)
);
CREATE INDEX IF NOT EXISTS idx_messages_slot_id ON public.messages(slot_id, created_at ASC);

-- Profile Sync Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name, email, avatar_url, updated_at)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        new.email,
        COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name),
        email = COALESCE(EXCLUDED.email, public.profiles.email),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        updated_at = now();
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view time slots" ON public.time_slots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert time slots" ON public.time_slots FOR INSERT TO authenticated WITH CHECK (true);

ALTER TABLE public.slot_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view slot memberships" ON public.slot_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can join a slot as themselves" ON public.slot_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave a slot only for themselves" ON public.slot_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view messages in their joined slots" ON public.messages FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.slot_members sm WHERE sm.slot_id = messages.slot_id AND sm.user_id = auth.uid()));
CREATE POLICY "Members can insert messages in their joined slots" ON public.messages FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.slot_members sm WHERE sm.slot_id = messages.slot_id AND sm.user_id = auth.uid()));

-- Realtime Publication
ALTER TABLE public.slot_members REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.time_slots REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'slot_members') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.slot_members;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'time_slots') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.time_slots;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;`;

  const configured = isSupabaseConfigured();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#FFFEFA] border border-[#245C3A]/20 w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[#171A17]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#245C3A]/10 flex items-center justify-center text-[#245C3A]">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#183F2A]">Setup & Configuration Guide</h2>
              <p className="text-xs text-[#737B73]">
                Connect your existing Supabase project & Google OAuth
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Bar */}
        <div className={`px-6 py-2.5 text-xs font-medium flex items-center justify-between ${
          configured ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-100' : 'bg-amber-50 text-amber-800 border-b border-amber-100'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${configured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span>
              {configured
                ? 'Supabase credentials detected and loaded.'
                : 'Supabase credentials are not connected yet.'}
            </span>
          </div>
          {configured && (
            <span className="text-[11px] opacity-75 font-mono">
              {envConfig.url.replace(/^https:\/\//, '').substring(0, 24)}...
            </span>
          )}
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-gray-100 bg-[#F1F7F0]/50 px-6 gap-2 pt-2 overflow-x-auto shrink-0">
          {[
            { id: 'connect', label: '1. Connect Credentials', icon: Key },
            { id: 'sql', label: '2. SQL Migration', icon: Database },
            { id: 'oauth', label: '3. Google OAuth Setup', icon: ShieldCheck },
            { id: 'supabase', label: '4. Supabase Redirects', icon: Globe },
            { id: 'vercel', label: '5. Vercel Deployment', icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-xl transition-all whitespace-nowrap border-b-2 ${
                  active
                    ? 'bg-white text-[#245C3A] border-[#245C3A] shadow-xs'
                    : 'text-[#737B73] border-transparent hover:text-[#171A17] hover:bg-white/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: CONNECT CREDENTIALS */}
          {activeTab === 'connect' && (
            <div className="space-y-6">
              <div className="bg-[#F1F7F0] border border-[#245C3A]/15 rounded-xl p-4 text-xs text-[#171A17] space-y-2">
                <p className="font-semibold text-[#183F2A]">Enter your Supabase Project details:</p>
                <p className="text-[#737B73]">
                  You can either add these to your local <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200 font-mono text-[#245C3A]">.env.local</code> file or enter them below to connect immediately in this active browser preview.
                </p>
              </div>

              <form onSubmit={handleSaveConnection} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#183F2A] mb-1.5">
                    1. Supabase Project URL (<code className="font-mono text-[#245C3A]">NEXT_PUBLIC_SUPABASE_URL</code>)
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://xyzcompany.supabase.co"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#245C3A] focus:border-transparent bg-white font-mono"
                  />
                  <p className="text-[11px] text-[#737B73] mt-1">
                    Found in: <strong>Supabase Dashboard</strong> &gt; <strong>Project Settings</strong> &gt; <strong>Data API</strong> &gt; <strong>Project URL</strong>.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#183F2A] mb-1.5">
                    2. Supabase Key (<code className="font-mono text-[#245C3A]">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> or <code className="font-mono text-[#245C3A]">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... or sb_publishable_..."
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#245C3A] focus:border-transparent bg-white font-mono"
                  />
                  <p className="text-[11px] text-[#737B73] mt-1">
                    Found in: <strong>Supabase Dashboard</strong> &gt; <strong>Project Settings</strong> &gt; <strong>API</strong> &gt; <strong>Project API keys</strong> (use <span className="font-semibold text-emerald-700">anon / public</span> key. NEVER use the service-role key!).
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isTesting}
                    className="px-5 py-2.5 rounded-xl bg-[#245C3A] hover:bg-[#183F2A] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isTesting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Saving & Connecting...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Save & Connect to Supabase
                      </>
                    )}
                  </button>

                  {configured && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="px-4 py-2.5 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 text-xs font-medium transition-colors"
                    >
                      Clear Saved Credentials
                    </button>
                  )}
                </div>
              </form>

              {/* Local .env.local guide */}
              <div className="border-t border-gray-100 pt-5">
                <h3 className="text-xs font-bold text-[#183F2A] mb-2">Or define in your project's .env.local file:</h3>
                <div className="relative bg-[#171A17] text-emerald-400 p-4 rounded-xl font-mono text-xs overflow-x-auto">
                  <button
                    onClick={() =>
                      handleCopy(
                        `NEXT_PUBLIC_SUPABASE_URL=${urlInput || 'https://your-project.supabase.co'}\nNEXT_PUBLIC_SUPABASE_ANON_KEY=${keyInput || 'your-anon-or-publishable-key'}`,
                        'env-copy'
                      )
                    }
                    className="absolute top-3 right-3 px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-[11px] flex items-center gap-1 transition-colors"
                  >
                    {copiedKey === 'env-copy' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy .env snippet
                  </button>
                  <pre>{`NEXT_PUBLIC_SUPABASE_URL=${urlInput || 'https://your-project.supabase.co'}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${keyInput || 'your-anon-or-publishable-key'}`}</pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SQL MIGRATION */}
          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#183F2A]">Database Schema & RLS Migration</h3>
                  <p className="text-xs text-[#737B73]">
                    Location: <code className="font-mono text-[#245C3A]">supabase/migrations/0001_initial_schema.sql</code>
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(sqlSchemaText, 'sql-all')}
                  className="px-3.5 py-1.5 bg-[#245C3A] hover:bg-[#183F2A] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  {copiedKey === 'sql-all' ? <Check className="w-4 h-4 text-[#E6A15A]" /> : <Copy className="w-4 h-4" />}
                  Copy Full SQL
                </button>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>How to run:</strong> Open your Supabase Dashboard &gt; <strong>SQL Editor</strong> &gt; Click <strong>New query</strong> &gt; Paste the SQL below &gt; Click <strong>Run</strong>.
                </p>
              </div>

              <div className="relative bg-[#171A17] text-gray-200 p-4 rounded-xl font-mono text-xs max-h-80 overflow-y-auto leading-relaxed border border-gray-800">
                <pre>{sqlSchemaText}</pre>
              </div>
            </div>
          )}

          {/* TAB 3: GOOGLE OAUTH SETUP */}
          {activeTab === 'oauth' && (
            <div className="space-y-4 text-xs text-[#171A17]">
              <div className="bg-[#F1F7F0] border border-[#245C3A]/20 p-4 rounded-xl space-y-2">
                <h4 className="font-bold text-sm text-[#183F2A]">Step-by-Step Google OAuth Configuration</h4>
                <p className="text-[#737B73]">
                  Travel Buddy Finder uses Google Sign-In managed securely through Supabase Auth. Google Client Secret is never stored in frontend code.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-3.5 rounded-xl border border-gray-200 bg-white space-y-2">
                  <div className="font-bold text-[#183F2A] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#245C3A] text-white text-[11px] flex items-center justify-center">1</span>
                    Get your Supabase Callback URI
                  </div>
                  <p className="text-gray-600">
                    Your Supabase project provides an OAuth callback URI in this format:
                  </p>
                  <div className="flex items-center justify-between bg-gray-50 border border-gray-200 p-2.5 rounded-lg font-mono text-[11px] text-gray-800">
                    <span>{urlInput ? `${urlInput}/auth/v1/callback` : 'https://<your-project-id>.supabase.co/auth/v1/callback'}</span>
                    <button
                      onClick={() => handleCopy(urlInput ? `${urlInput}/auth/v1/callback` : 'https://<your-project-id>.supabase.co/auth/v1/callback', 'cb-uri')}
                      className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 flex items-center gap-1 text-[11px]"
                    >
                      {copiedKey === 'cb-uri' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      Copy
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-gray-200 bg-white space-y-2">
                  <div className="font-bold text-[#183F2A] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#245C3A] text-white text-[11px] flex items-center justify-center">2</span>
                    Configure in Google Cloud Console
                  </div>
                  <ol className="list-decimal pl-5 space-y-1.5 text-gray-600">
                    <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-[#245C3A] font-semibold underline inline-flex items-center gap-0.5">Google Cloud Credentials <ExternalLink className="w-3 h-3" /></a>.</li>
                    <li>Click <strong>Create Credentials</strong> &gt; <strong>OAuth Client ID</strong> (Web application).</li>
                    <li>Under <strong>Authorized redirect URIs</strong>, add your Supabase Callback URI from step 1 above.</li>
                    <li>Copy your <strong>Client ID</strong> and <strong>Client Secret</strong>.</li>
                  </ol>
                </div>

                <div className="p-3.5 rounded-xl border border-gray-200 bg-white space-y-2">
                  <div className="font-bold text-[#183F2A] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#245C3A] text-white text-[11px] flex items-center justify-center">3</span>
                    Paste in Supabase Dashboard
                  </div>
                  <ol className="list-decimal pl-5 space-y-2 text-gray-600">
                    <li>Go to <strong>Supabase Dashboard</strong> &gt; <strong>Authentication</strong> &gt; <strong>Providers</strong> &gt; <strong>Google</strong>.</li>
                    <li>Toggle <strong>Enable Google provider</strong> to ON.</li>
                    <li>
                      <span>Paste your Google <strong>Client ID</strong>:</span>
                      <div className="mt-1 flex items-center justify-between bg-gray-50 border border-gray-200 p-2 rounded font-mono text-[11px] text-gray-800">
                        <span className="truncate mr-2">365198755259-4vs0ickdnhteest5t7p4qno0qlfegd70.apps.googleusercontent.com</span>
                        <button
                          type="button"
                          onClick={() => handleCopy('365198755259-4vs0ickdnhteest5t7p4qno0qlfegd70.apps.googleusercontent.com', 'client-id')}
                          className="px-2 py-0.5 bg-white border border-gray-300 rounded text-[10px] shrink-0 hover:bg-gray-100 cursor-pointer"
                        >
                          {copiedKey === 'client-id' ? 'Copied' : 'Copy ID'}
                        </button>
                      </div>
                    </li>
                    <li>Paste your Google <strong>Client Secret</strong> (obtained alongside your Client ID in Google Cloud Console).</li>
                    <li>Click <strong>Save</strong>.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SUPABASE REDIRECT URLS */}
          {activeTab === 'supabase' && (
            <div className="space-y-4 text-xs text-[#171A17]">
              <div className="bg-[#F1F7F0] border border-[#245C3A]/20 p-4 rounded-xl">
                <h4 className="font-bold text-sm text-[#183F2A] mb-1">Configuring Supabase Redirect URLs</h4>
                <p className="text-[#737B73]">
                  To allow students to sign in and be redirected back into Travel Buddy Finder, ensure your site URLs are listed in Supabase.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-3">
                <p className="text-gray-700">
                  Navigate to <strong>Supabase Dashboard</strong> &gt; <strong>Authentication</strong> &gt; <strong>URL Configuration</strong>:
                </p>
                <div className="space-y-2">
                  <label className="font-bold text-gray-800">1. Site URL:</label>
                  <div className="p-2.5 bg-gray-50 rounded-lg font-mono text-[11px] border border-gray-200">
                    {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="font-bold text-gray-800">2. Redirect URLs (Add both local & production):</label>
                  <ul className="space-y-1.5 font-mono text-[11px] text-[#245C3A]">
                    <li className="p-2 bg-gray-50 rounded border border-gray-200">http://localhost:3000/**</li>
                    <li className="p-2 bg-gray-50 rounded border border-gray-200">{typeof window !== 'undefined' ? `${window.location.origin}/**` : 'https://*.run.app/**'}</li>
                    <li className="p-2 bg-gray-50 rounded border border-gray-200">https://your-travel-buddy-finder.vercel.app/**</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: VERCEL DEPLOYMENT */}
          {activeTab === 'vercel' && (
            <div className="space-y-4 text-xs text-[#171A17]">
              <div className="bg-[#F1F7F0] border border-[#245C3A]/20 p-4 rounded-xl space-y-1">
                <h4 className="font-bold text-sm text-[#183F2A]">Vercel Deployment Checklist</h4>
                <p className="text-[#737B73]">
                  Deploy Travel Buddy Finder with zero config in under 2 minutes.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl border border-gray-200 bg-white space-y-2">
                  <div className="font-bold text-[#183F2A]">1. Push code to GitHub</div>
                  <p className="text-gray-600">Commit all files and push to your GitHub repository.</p>
                </div>

                <div className="p-3.5 rounded-xl border border-gray-200 bg-white space-y-2">
                  <div className="font-bold text-[#183F2A]">2. Import into Vercel</div>
                  <p className="text-gray-600">In Vercel, click <strong>Add New...</strong> &gt; <strong>Project</strong> &gt; Select your Travel Buddy Finder repository.</p>
                </div>

                <div className="p-3.5 rounded-xl border border-gray-200 bg-white space-y-2">
                  <div className="font-bold text-[#183F2A]">3. Set Environment Variables in Vercel</div>
                  <p className="text-gray-600">Under <strong>Environment Variables</strong>, add:</p>
                  <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200 font-mono text-[11px] space-y-1">
                    <div>NEXT_PUBLIC_SUPABASE_URL = (your project url)</div>
                    <div>NEXT_PUBLIC_SUPABASE_ANON_KEY = (your anon or publishable key)</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-gray-200 bg-white space-y-2">
                  <div className="font-bold text-[#183F2A]">4. Add Vercel Domain to Supabase</div>
                  <p className="text-gray-600">
                    Once deployed, copy your <code className="font-mono text-[#245C3A]">https://xyz.vercel.app</code> domain and add it to Supabase <strong>Authentication &gt; URL Configuration &gt; Redirect URLs</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-white shrink-0">
          <p className="text-[11px] text-[#737B73]">
            Better Campus Community • SRM University-AP
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
