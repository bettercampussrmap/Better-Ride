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
      subtitle: 'Push reminders for departures',
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
    <div className="space-y-3 animate-in fade-in duration-150">
      {/* Profile Header */}
      <div className="space-y-0.5 pt-0.5">
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#09090B] tracking-tight">
          Profile
        </h1>
        <p className="text-[11px] text-[#71717A] font-medium">
          Better Ride student membership
        </p>
      </div>

      {/* User Information Card - Compact */}
      <div className="bg-white rounded-xl border border-[#E4E4E7] p-3 shadow-2xs flex items-center gap-3">
        <div className="w-11 h-11 rounded-full overflow-hidden bg-[#09090B] text-white border border-[#E4E4E7] shrink-0 flex items-center justify-center font-bold text-sm">
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
            <h3 className="text-sm font-bold text-[#09090B] truncate">{displayName}</h3>
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-[#F4F4F5] text-[9px] font-bold text-[#09090B]">
              <ShieldCheck className="w-2.5 h-2.5 text-[#22C55E]" />
              <span>Verified</span>
            </span>
          </div>
          <p className="text-[11px] text-[#71717A] truncate font-medium">
            {email || 'SRM University-AP'}
          </p>
        </div>
      </div>

      {/* Settings Menu List */}
      <div className="bg-white rounded-xl border border-[#E4E4E7] divide-y divide-[#E4E4E7]/60 overflow-hidden shadow-2xs">
        {menuSections.map((item) => {
          const IconComp = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className="w-full p-2.5 text-left flex items-center justify-between hover:bg-[#F4F4F5] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[#F4F4F5] text-[#09090B] flex items-center justify-center shrink-0">
                  <IconComp className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-[#09090B] tracking-tight truncate">
                    {item.title}
                  </h4>
                  <p className="text-[10px] text-[#71717A] truncate font-medium">
                    {item.subtitle}
                  </p>
                </div>
              </div>

              <ChevronRight className="w-3.5 h-3.5 text-[#A1A1AA] shrink-0" />
            </button>
          );
        })}
      </div>

      {/* Sign Out Button - Compact h-9 */}
      <div className="pt-1">
        <button
          type="button"
          onClick={onSignOut}
          className="w-full h-9 rounded-xl border border-[#E4E4E7] bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-xs font-bold text-[#09090B] transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};
