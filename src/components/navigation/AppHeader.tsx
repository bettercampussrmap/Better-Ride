import React, { useState, useRef, useEffect } from 'react';
import { MapPin, ChevronDown, Check, CheckCircle2, ArrowRight } from 'lucide-react';
import { Profile, SlotWithDetails } from '../../types/database';

interface AppHeaderProps {
  user: any;
  profile: Profile | null;
  currentCampus?: string;
  rides?: SlotWithDetails[];
  onSelectCampus?: (campus: string) => void;
  onOpenProfile?: () => void;
  onOpenRide?: (ride: SlotWithDetails) => void;
  onSignOut?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  user,
  profile,
  currentCampus = 'SRM AP',
  onSelectCampus,
  onOpenProfile,
}) => {
  const [campusDropdownOpen, setCampusDropdownOpen] = useState(false);
  const campusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (campusRef.current && !campusRef.current.contains(e.target as Node)) {
        setCampusDropdownOpen(false);
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

  return (
    <header className="sticky top-0 z-40 bg-[#FAFAF8] border-b border-[#E4E4E7] px-4 py-2.5 transition-all">
      <div className="max-w-[420px] mx-auto flex items-center justify-between gap-2">
        {/* Brand section */}
        <div className="flex items-center gap-2">
          {/* Logo - Scaled to compact 7x7 */}
          <div className="w-7 h-7 rounded-full overflow-hidden border border-[#E4E4E7] bg-white shrink-0 shadow-2xs">
            <img
              src="/assets/aistudio/Gemini_Generated_Image_5av8f85av8f85av8_f440b7ed.png"
              alt="Better Ride Logo"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex flex-col justify-center">
            {/* Brand title - Scaled down */}
            <div className="flex items-center gap-1 leading-none">
              <span className="font-extrabold text-xs sm:text-sm tracking-tight text-[#09090B]">
                Better Ride
              </span>
            </div>

            {/* Campus dropdown trigger */}
            <div className="relative" ref={campusRef}>
              <button
                type="button"
                onClick={() => setCampusDropdownOpen((prev) => !prev)}
                className="inline-flex items-center gap-0.5 text-[9px] font-medium text-[#71717A] hover:text-[#09090B] transition-colors cursor-pointer"
                aria-label="Select Campus"
              >
                <MapPin className="w-2.5 h-2.5 text-[#71717A]" />
                <span className="font-semibold text-[#09090B]">{currentCampus}</span>
                <ChevronDown className="w-2 h-2 text-[#71717A]" />
              </button>

              {campusDropdownOpen && (
                <div className="absolute left-0 top-full mt-1 w-36 bg-white rounded-xl shadow-lg border border-[#E4E4E7] py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2.5 py-0.5 text-[8px] font-bold text-[#A1A1AA] uppercase tracking-wider">
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
                      className="w-full text-left px-2.5 py-1 text-[10px] font-semibold flex items-center justify-between hover:bg-[#F4F4F5] transition-colors cursor-pointer"
                    >
                      <span className={c === currentCampus ? 'text-[#09090B] font-bold' : 'text-[#71717A]'}>
                        {c}
                      </span>
                      {c === currentCampus && <Check className="w-2.5 h-2.5 text-[#09090B]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right action controls */}
        <div className="flex items-center gap-1.5">
          {/* User profile pill - Scaled down */}
          <button
            type="button"
            onClick={onOpenProfile}
            className="h-7.5 px-2 rounded-full border border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] flex items-center gap-1.5 transition-colors cursor-pointer"
            aria-label="User Profile"
          >
            <div className="w-4.5 h-4.5 rounded-full overflow-hidden bg-[#09090B] text-white border border-[#E4E4E7] shrink-0 flex items-center justify-center font-bold text-[9px]">
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
            <span className="text-[11px] font-bold text-[#09090B] truncate max-w-[70px]">
              {displayName.split(' ')[0]}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
