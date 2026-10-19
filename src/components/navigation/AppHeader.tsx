import React, { useState, useRef, useEffect } from 'react';
import { MapPin, ChevronDown, Bell, User as UserIcon, X, Check, ExternalLink } from 'lucide-react';
import { Profile } from '../../types/database';

interface AppHeaderProps {
  user: any;
  profile: Profile | null;
  currentCampus?: string;
  onSelectCampus?: (campus: string) => void;
  onOpenProfile?: () => void;
  onSignOut?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  user,
  profile,
  currentCampus = 'SRM AP',
  onSelectCampus,
  onOpenProfile,
  onSignOut,
}) => {
  const [campusDropdownOpen, setCampusDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsCount, setNotificationsCount] = useState(0);

  const campusRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (campusRef.current && !campusRef.current.contains(e.target as Node)) {
        setCampusDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName =
    profile?.display_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Student';

  const avatarUrl =
    profile?.avatar_url ||
    user?.user_metadata?.avatar_url ||
    user?.picture;

  const campuses = ['SRM AP', 'VIT AP', 'Amrita Uni'];

  const notifications = [
    {
      id: '1',
      title: 'Welcome to Better Ride',
      desc: 'Connect with SRM AP students to share autos & cabs from Main Gate.',
      time: 'Just now',
      unread: false,
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#FAFAF8] border-b border-[#E4E4E7] px-3 py-1.5 transition-all">
      <div className="max-w-[420px] mx-auto flex items-center justify-between gap-2.5">
        {/* Brand section */}
        <div className="flex items-center gap-2">
          {/* Black rounded-square logo with white B */}
          <div className="w-7 h-7 rounded-lg bg-[#09090B] text-white flex items-center justify-center font-black text-xs tracking-tighter shrink-0 shadow-2xs">
            B
          </div>

          <div className="flex flex-col justify-center">
            {/* Brand title + RIDE pill */}
            <div className="flex items-center gap-1 leading-none">
              <span className="font-extrabold text-sm tracking-tight text-[#09090B]">
                BetterCampus
              </span>
              <span className="bg-[#09090B] text-white text-[8px] font-black tracking-wider px-1 py-0.5 rounded leading-none uppercase">
                RIDE
              </span>
            </div>

            {/* Campus dropdown trigger */}
            <div className="relative" ref={campusRef}>
              <button
                type="button"
                onClick={() => setCampusDropdownOpen((prev) => !prev)}
                className="inline-flex items-center gap-1 text-[10px] font-medium text-[#71717A] hover:text-[#09090B] transition-colors cursor-pointer"
                aria-label="Select Campus"
              >
                <MapPin className="w-2.5 h-2.5 text-[#71717A]" />
                <span className="font-semibold text-[#09090B]">{currentCampus}</span>
                <ChevronDown className="w-2 h-2 text-[#71717A]" />
              </button>

              {campusDropdownOpen && (
                <div className="absolute left-0 top-full mt-1 w-40 bg-white rounded-xl shadow-lg border border-[#E4E4E7] py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2.5 py-0.5 text-[9px] font-bold text-[#A1A1AA] uppercase tracking-wider">
                    Select Campus
                  </div>
                  {campuses.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        onSelectCampus?.(c);
                        setCampusDropdownOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1 text-[11px] font-semibold flex items-center justify-between hover:bg-[#F4F4F5] transition-colors"
                    >
                      <span className={c === currentCampus ? 'text-[#09090B] font-bold' : 'text-[#71717A]'}>
                        {c}
                      </span>
                      {c === currentCampus && <Check className="w-3 h-3 text-[#09090B]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right action controls */}
        <div className="flex items-center gap-1.5">
          {/* Notification bell button */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => {
                setNotificationsOpen((prev) => !prev);
                setNotificationsCount(0);
              }}
              className="w-7 h-7 rounded-lg border border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] flex items-center justify-center text-[#09090B] transition-colors cursor-pointer relative"
              aria-label="Notifications"
            >
              <Bell className="w-3.5 h-3.5" />
              {notificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#09090B] text-white text-[9px] font-bold flex items-center justify-center">
                  {notificationsCount}
                </span>
              )}
            </button>

            {/* Notifications Popover */}
            {notificationsOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-[#E4E4E7] p-3 z-50 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-[#E4E4E7]">
                  <span className="text-xs font-bold text-[#09090B]">Notifications</span>
                  <button
                    type="button"
                    onClick={() => setNotificationsOpen(false)}
                    className="text-[#71717A] hover:text-[#09090B]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="divide-y divide-[#E4E4E7] max-h-60 overflow-y-auto">
                  {notifications.map((n) => (
                    <div key={n.id} className="py-2.5 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-[#09090B]">{n.title}</p>
                        <span className="text-[10px] text-[#A1A1AA]">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-[#71717A] leading-snug">{n.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User profile pill */}
          <button
            type="button"
            onClick={onOpenProfile}
            className="h-9 px-2.5 rounded-full border border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] flex items-center gap-1.5 transition-colors cursor-pointer"
            aria-label="User Profile"
          >
            <div className="w-5 h-5 rounded-full overflow-hidden bg-[#09090B] text-white border border-[#E4E4E7] shrink-0 flex items-center justify-center font-bold text-[10px]">
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
            <span className="text-xs font-bold text-[#09090B] truncate max-w-[80px]">
              {displayName.split(' ')[0]}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
