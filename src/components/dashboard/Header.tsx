import React, { useState, useRef, useEffect } from 'react';
import { LogOut, ChevronDown, MapPin, User as UserIcon } from 'lucide-react';
import { signOut } from '../../lib/supabase';
import { clearGoogleUser } from '../../lib/google-auth';
import { useToast } from '../ui/Toast';
import { Profile } from '../../types/database';

interface HeaderProps {
  user: any;
  profile: Profile | null;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  profile,
  onSignOut,
}) => {
  const { showToast } = useToast();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOutClick = async () => {
    setDropdownOpen(false);
    clearGoogleUser();
    try {
      await signOut();
    } catch {}
    showToast('info', 'Signed out successfully');
    onSignOut();
  };

  const displayName =
    profile?.display_name ||
    user?.user_metadata?.full_name ||
    user?.name ||
    user?.email?.split('@')[0] ||
    'Student';
  const email = profile?.email || user?.email || '';
  const avatarUrl =
    profile?.avatar_url ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    user?.picture;

  return (
    <header className="sticky top-0 z-40 bg-[#FFFEFA]/90 backdrop-blur-md border-b border-[#245C3A]/15 px-4 sm:px-8 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden border-2 border-[#245C3A]/20 bg-white p-0.5 shadow-xs shrink-0">
            <img
              src="/better-campus-logo.png"
              alt="Better Campus Community"
              className="w-full h-full object-contain rounded-full"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/better-campus-logo.jpg';
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base sm:text-lg text-[#183F2A] tracking-tight">
                Travel Buddy Finder
              </span>
              <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-[#F1F7F0] text-[#245C3A] rounded-full border border-[#245C3A]/15">
                <MapPin className="w-3 h-3 text-[#245C3A]" /> SRM-AP Campus Gate
              </span>
            </div>
            <p className="text-[11px] text-[#737B73] font-medium hidden sm:block">
              Better Campus Community
            </p>
          </div>
        </div>

        {/* User profile dropdown & Sign Out */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl hover:bg-[#F1F7F0] border border-transparent hover:border-[#245C3A]/15 transition-all cursor-pointer"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-8 h-8 rounded-full object-cover border border-[#245C3A]/20"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#245C3A] text-white flex items-center justify-center font-bold text-xs">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-xs font-semibold text-[#183F2A] max-w-[120px] truncate hidden md:inline">
              {displayName}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-gray-500 transition-transform ${
                dropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-100 text-[#171A17]">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-xs font-bold text-[#183F2A] truncate">{displayName}</p>
                <p className="text-[11px] text-[#737B73] truncate mt-0.5">{email}</p>
                <span className="inline-block mt-2 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                  Google Account Active
                </span>
              </div>

              <div className="pt-1">
                <button
                  onClick={handleSignOutClick}
                  className="w-full px-4 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer font-medium"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
