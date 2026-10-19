import React, { useState } from 'react';
import { User, ShieldCheck, MapPin, Bell, HelpCircle, LogOut, ChevronRight, Car } from 'lucide-react';
import { Profile } from '../../types/database';

interface ProfileViewProps {
  user: any;
  profile: Profile | null;
  onSignOut: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  profile,
  onSignOut,
}) => {
  const [ridePref, setRidePref] = useState<'auto' | 'cab' | 'any'>('auto');
  const [preferredCampus, setPreferredCampus] = useState('SRM AP Gate 3');

  const displayName =
    profile?.display_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Student';

  const email = profile?.email || user?.email || '';
  const avatarUrl =
    profile?.avatar_url ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    user?.picture;

  const menuSections = [
    {
      id: 'personal',
      title: 'Personal Information',
      subtitle: displayName,
      icon: User,
    },
    {
      id: 'prefs',
      title: 'Ride Preferences',
      subtitle: `Preferred vehicle: ${ridePref.toUpperCase()}`,
      icon: Car,
    },
    {
      id: 'campus',
      title: 'Campus & Default Pickup',
      subtitle: preferredCampus,
      icon: MapPin,
    },
    {
      id: 'notifs',
      title: 'Notifications',
      subtitle: 'Push reminders for departure times',
      icon: Bell,
    },
    {
      id: 'help',
      title: 'Help & Campus Support',
      subtitle: 'Safety guidelines & FAQs',
      icon: HelpCircle,
    },
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Profile Header */}
      <div className="space-y-0.5 pt-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#09090B] tracking-tight">
          Profile
        </h1>
        <p className="text-xs text-[#71717A] font-medium">
          BetterCampus student membership
        </p>
      </div>

      {/* User Information Card */}
      <div className="bg-white rounded-2xl border border-[#E4E4E7] p-4 sm:p-5 shadow-2xs flex items-center gap-3.5">
        <div className="w-14 h-14 rounded-full overflow-hidden bg-[#09090B] text-white border-2 border-[#E4E4E7] shrink-0 flex items-center justify-center font-bold text-lg">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <span>{displayName.charAt(0).toUpperCase()}</span>
          )}
        </div>

        <div className="space-y-0.5 min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="text-base font-bold text-[#09090B] truncate">{displayName}</h3>
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-[#F4F4F5] text-[10px] font-bold text-[#09090B]">
              <ShieldCheck className="w-3 h-3 text-[#22C55E]" />
              <span>Verified</span>
            </span>
          </div>
          <p className="text-xs text-[#71717A] font-medium truncate">{email}</p>
          <p className="text-[11px] text-[#A1A1AA] font-semibold">SRM University-AP</p>
        </div>
      </div>

      {/* Settings list rows */}
      <div className="bg-white rounded-2xl border border-[#E4E4E7] shadow-2xs divide-y divide-[#E4E4E7] overflow-hidden">
        {menuSections.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (item.id === 'prefs') {
                  const nextPref = ridePref === 'auto' ? 'cab' : ridePref === 'cab' ? 'any' : 'auto';
                  setRidePref(nextPref);
                }
              }}
              className="w-full p-4 flex items-center justify-between hover:bg-[#F4F4F5] transition-colors text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#F4F4F5] group-hover:bg-white flex items-center justify-center text-[#09090B] shrink-0 transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-[#09090B] tracking-tight">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-[#71717A]">{item.subtitle}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#A1A1AA] group-hover:text-[#09090B] transition-colors" />
            </button>
          );
        })}
      </div>

      {/* Logout Row Button */}
      <div className="pt-1">
        <button
          type="button"
          onClick={onSignOut}
          className="w-full h-12 rounded-xl border border-[#E4E4E7] bg-white hover:bg-red-50 text-xs font-bold text-[#DC2626] transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out of Better Ride</span>
        </button>
      </div>
    </div>
  );
};
