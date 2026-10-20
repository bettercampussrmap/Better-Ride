import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  MapPin,
  MessageSquare,
  Save,
  LogOut,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { Profile } from '../../types/database';
import { useToast } from '../ui/Toast';
import { getSupabase } from '../../lib/supabase';
import { saveUserToSupabase } from '../../lib/user-auth-service';
import { toValidUuid } from '../../lib/uuid-utils';

interface ProfileViewProps {
  user: any;
  profile: Profile | null;
  currentCampus?: string;
  onUpdateCampus?: (campus: string) => void;
  onUpdateProfile?: (updatedProfile: Profile) => void;
  onSignOut: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  profile,
  currentCampus = 'SRM AP',
  onUpdateCampus,
  onUpdateProfile,
  onSignOut,
}) => {
  const { showToast } = useToast();

  const initialName =
    profile?.display_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.name ||
    user?.email?.split('@')[0] ||
    'Student';

  const userEmail = profile?.email || user?.email || 'student@srmist.edu.in';
  const initialPassword = profile?.password || '';

  // Editable fields
  const [name, setName] = useState(initialName);
  const [password, setPassword] = useState(initialPassword);
  const [showPassword, setShowPassword] = useState(false);
  const [campus, setCampus] = useState(currentCampus);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      if (profile.display_name) setName(profile.display_name);
      if (profile.password) setPassword(profile.password);
    }
  }, [profile]);

  // Feedback section state (clean single option)
  const [feedbackText, setFeedbackText] = useState('');
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const campuses = [
    { id: 'SRM AP', label: 'SRM University-AP' },
    { id: 'VIT AP', label: 'VIT-AP' },
    { id: 'Amrita Uni', label: 'Amrita' },
  ];

  // Save profile updates (Name, Password, Campus)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('error', 'Invalid Name', 'Name cannot be empty.');
      return;
    }

    setIsSaving(true);

    try {
      const updatedProfile: Profile = {
        ...(profile || {}),
        id: profile?.id || user?.id || 'student-user',
        display_name: name.trim(),
        email: userEmail,
        password: password.trim(),
        avatar_url:
          profile?.avatar_url ||
          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name.trim())}&backgroundColor=09090B`,
        created_at: profile?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // 1. Save permanently via user-auth-service (updates local DBs, Supabase database storage, and profiles)
      await saveUserToSupabase(updatedProfile);

      // 2. Update localStorage active user
      if (typeof window !== 'undefined') {
        localStorage.setItem('better_ride_active_user', JSON.stringify(updatedProfile));
      }

      // 3. Try Supabase update if connected
      const supabase = getSupabase();
      if (supabase && updatedProfile.id) {
        try {
          await supabase
            .from('profiles')
            .upsert({
              id: updatedProfile.id,
              display_name: updatedProfile.display_name,
              email: updatedProfile.email,
              avatar_url: updatedProfile.avatar_url,
              updated_at: new Date().toISOString(),
            });
        } catch (e) {
          console.warn('Supabase profile update warning:', e);
        }
      }

      // 3. Update campus in parent if changed
      if (onUpdateCampus && campus !== currentCampus) {
        onUpdateCampus(campus);
      }

      // 4. Propagate up to App state
      onUpdateProfile?.(updatedProfile);

      showToast(
        'success',
        'Profile Updated',
        'Your profile changes have been saved successfully.'
      );
    } catch (err: any) {
      showToast('error', 'Update Failed', err?.message || 'Could not save profile changes.');
    } finally {
      setIsSaving(false);
    }
  };

  // Submit Feedback (Single clean column)
  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) {
      showToast('error', 'Missing Feedback', 'Please write your feedback before submitting.');
      return;
    }

    setIsSendingFeedback(true);

    try {
      const raw = localStorage.getItem('better_ride_feedback_logs');
      const list = raw ? JSON.parse(raw) : [];
      list.push({
        user: name,
        email: userEmail,
        text: feedbackText.trim(),
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem('better_ride_feedback_logs', JSON.stringify(list));

      setFeedbackSubmitted(true);
      setFeedbackText('');
      showToast('success', 'Feedback Sent', 'Thank you! Your feedback has been sent to the Better Campus team.');
      setTimeout(() => setFeedbackSubmitted(false), 5000);
    } catch {} finally {
      setIsSendingFeedback(false);
    }
  };

  return (
    <div className="space-y-3 animate-in fade-in duration-150 pb-6">
      {/* Header - Clean */}
      <div className="space-y-0.2 pt-0.5">
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#09090B] tracking-tight">
          Profile
        </h1>
      </div>

      {/* SECTION 1: Personal Details (Editable name, password, campus; locked email) */}
      <form onSubmit={handleSaveProfile} className="space-y-3">
        <div className="bg-white rounded-xl border border-[#E4E4E7] p-3 sm:p-3.5 shadow-2xs space-y-2.5">
          <div className="flex items-center gap-1.5 pb-1 border-b border-[#E4E4E7]/60">
            <User className="w-3.5 h-3.5 text-[#09090B]" />
            <h2 className="text-xs font-bold text-[#09090B] uppercase tracking-wide">
              Account Information
            </h2>
          </div>

          {/* Full Name (Editable) */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-[#3F3F46]">
              Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-2.5 py-1.5 bg-[#F4F4F5] hover:bg-[#EDEDF0] focus:bg-white rounded-lg border border-transparent focus:border-[#09090B] text-xs font-semibold text-[#09090B] outline-none transition-all"
            />
          </div>

          {/* Email Address (Permanently Locked / Not Editable) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-[#3F3F46]">
                Email Address
              </label>
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#71717A] bg-gray-100 px-1.5 py-0.2 rounded">
                <Lock className="w-2.5 h-2.5" />
                <span>Not editable</span>
              </span>
            </div>
            <input
              type="email"
              disabled
              value={userEmail}
              readOnly
              className="w-full px-2.5 py-1.5 bg-[#F4F4F5]/80 rounded-lg border border-[#E4E4E7] text-xs font-medium text-[#71717A] cursor-not-allowed outline-none select-none"
            />
          </div>

          {/* Password (Editable) */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-[#3F3F46]">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-2.5 pr-8 py-1.5 bg-[#F4F4F5] hover:bg-[#EDEDF0] focus:bg-white rounded-lg border border-transparent focus:border-[#09090B] text-xs font-semibold text-[#09090B] outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#09090B] cursor-pointer"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Campus Location (Editable) */}
          <div className="space-y-1 pt-0.5">
            <label className="block text-[11px] font-bold text-[#3F3F46] flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#71717A]" />
              <span>Campus</span>
            </label>
            <div className="grid grid-cols-3 gap-1">
              {campuses.map((c) => {
                const isSelected = campus === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCampus(c.id)}
                    className={`py-1.5 px-1.5 rounded-lg text-xs font-bold border transition-all text-center cursor-pointer ${
                      isSelected
                        ? 'bg-[#09090B] text-white border-[#09090B] shadow-2xs'
                        : 'bg-[#F4F4F5] text-[#71717A] border-transparent hover:border-[#E4E4E7]'
                    }`}
                  >
                    <span>{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Save Profile Button */}
          <button
            type="submit"
            disabled={isSaving}
            className="w-full h-8.5 mt-1 rounded-lg bg-[#09090B] hover:bg-[#18181B] active:scale-[0.99] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-3 h-3" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* SECTION 2: Clean Feedback (No FAQs, just feedback text area & send button) */}
      <div className="bg-white rounded-xl border border-[#E4E4E7] p-3 sm:p-3.5 shadow-2xs space-y-2">
        <div className="flex items-center gap-1.5 pb-1 border-b border-[#E4E4E7]/60">
          <MessageSquare className="w-3.5 h-3.5 text-[#09090B]" />
          <h2 className="text-xs font-bold text-[#09090B] uppercase tracking-wide">
            Feedback
          </h2>
        </div>

        <p className="text-[10px] text-[#71717A]">
          Share suggestions, report an issue, or tell us how to improve your campus ride experience.
        </p>

        <form onSubmit={handleSendFeedback} className="space-y-2 pt-0.5">
          <textarea
            rows={3}
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Write your feedback or campus suggestions here..."
            className="w-full px-2.5 py-1.5 rounded-lg bg-[#F4F4F5] hover:bg-[#EDEDF0] focus:bg-white border border-transparent focus:border-[#09090B] text-xs text-[#09090B] placeholder:text-[#A1A1AA] outline-none transition-all resize-none"
          />

          <button
            type="submit"
            disabled={isSendingFeedback}
            className="w-full h-8 rounded-lg bg-[#09090B] hover:bg-[#18181B] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3 h-3" />
            <span>Send Feedback</span>
          </button>

          {feedbackSubmitted && (
            <p className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1 pt-0.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Thank you! Your feedback has been sent to the Better Campus team.</span>
            </p>
          )}
        </form>
      </div>

      {/* SECTION 3: Sign Out Button */}
      <div className="pt-0.5">
        <button
          type="button"
          onClick={onSignOut}
          className="w-full h-8.5 rounded-lg border border-[#E4E4E7] bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-xs font-bold text-[#09090B] transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};
