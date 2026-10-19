import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MapPin, ChevronDown, Bell, X, Check, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import { Profile, SlotWithDetails } from '../../types/database';
import { getMinutesUntilRide, isRideCompleted, formatTime12 } from '../../lib/date-utils';

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

interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  type: 'urgent' | 'upcoming' | 'completed' | 'info';
  ride?: SlotWithDetails;
  read: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  user,
  profile,
  currentCampus = 'SRM AP',
  rides = [],
  onSelectCampus,
  onOpenProfile,
  onOpenRide,
}) => {
  const [campusDropdownOpen, setCampusDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [clearedNotifIds, setClearedNotifIds] = useState<string[]>([]);
  const [readNotifIds, setReadNotifIds] = useState<string[]>([]);

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

  // Compute dynamic notifications from user's actual rides
  const notifications: NotificationItem[] = useMemo(() => {
    const list: NotificationItem[] = [];

    // 1. Check joined rides
    const joinedRides = rides.filter((r) => r.isUserJoined);

    joinedRides.forEach((ride) => {
      const isCompleted = isRideCompleted(ride.departure_date, ride.end_time);

      if (isCompleted) {
        list.push({
          id: `completed-${ride.id}`,
          title: `Ride Completed: ${ride.destination}`,
          desc: `Your trip has ended. Group chat remains available for fare split and peer messaging.`,
          time: `${ride.departure_date} · ${formatTime12(ride.end_time)}`,
          type: 'completed',
          ride,
          read: readNotifIds.includes(`completed-${ride.id}`),
        });
      } else {
        const minsLeft = getMinutesUntilRide(ride.departure_date, ride.start_time);

        if (minsLeft !== null && minsLeft >= 0 && minsLeft <= 45) {
          list.unshift({
            id: `urgent-${ride.id}`,
            title: `Ride in ${minsLeft <= 1 ? '1' : minsLeft} min ⏳`,
            desc: `Your ride to ${ride.destination} departs at ${formatTime12(ride.start_time)} from ${ride.pickup_point || 'SRM AP Gate 3'}. Head over!`,
            time: 'Departure soon',
            type: 'urgent',
            ride,
            read: readNotifIds.includes(`urgent-${ride.id}`),
          });
        } else {
          list.push({
            id: `upcoming-${ride.id}`,
            title: `Upcoming Pool: ${ride.destination}`,
            desc: `Departs ${ride.departure_date} at ${formatTime12(ride.start_time)}. ${ride.memberCount}/${ride.target_size || 4} seats filled.`,
            time: ride.departure_date,
            type: 'upcoming',
            ride,
            read: readNotifIds.includes(`upcoming-${ride.id}`),
          });
        }
      }
    });

    // Default campus info notification if list is short
    if (list.length === 0) {
      list.push({
        id: 'info-gate3',
        title: 'SRM AP Gate 3 Pickup',
        desc: 'All autos and cabs assemble at Main Gate 3 designated student bay. Search or create a pool to travel together!',
        time: 'Campus Info',
        type: 'info',
        read: readNotifIds.includes('info-gate3'),
      });
    }

    return list.filter((n) => !clearedNotifIds.includes(n.id));
  }, [rides, readNotifIds, clearedNotifIds]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    setReadNotifIds(notifications.map((n) => n.id));
  };

  const handleClearNotifications = () => {
    setClearedNotifIds((prev) => [...prev, ...notifications.map((n) => n.id)]);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAFAF8] border-b border-[#E4E4E7] px-3 py-1.5 transition-all">
      <div className="max-w-[420px] mx-auto flex items-center justify-between gap-2">
        {/* Brand section */}
        <div className="flex items-center gap-2">
          {/* Logo - Scaled to compact 7x7 */}
          <div className="w-7 h-7 rounded-full overflow-hidden border border-[#E4E4E7] bg-white shrink-0 shadow-2xs">
            <img
              src="/better-ride-logo.png"
              alt="Better Ride Logo"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/better-ride-logo.jpg';
              }}
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
          {/* Notification bell button */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => {
                setNotificationsOpen((prev) => !prev);
                handleMarkAllRead();
              }}
              className="w-7 h-7 rounded-lg border border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] flex items-center justify-center text-[#09090B] transition-colors cursor-pointer relative"
              aria-label="Notifications"
            >
              <Bell className="w-3.5 h-3.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-600 text-white text-[8px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Popover */}
            {notificationsOpen && (
              <div className="absolute right-0 top-full mt-2 w-76 sm:w-84 bg-white rounded-2xl shadow-2xl border border-[#E4E4E7] p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E4E4E7]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-[#09090B]">Notifications</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F4F4F5] text-[#09090B]">
                      {notifications.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {notifications.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearNotifications}
                        className="text-[10px] font-bold text-[#71717A] hover:text-[#09090B] transition-colors cursor-pointer"
                      >
                        Clear all
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setNotificationsOpen(false)}
                      className="w-5 h-5 rounded-full bg-[#F4F4F5] flex items-center justify-center text-[#71717A] hover:text-[#09090B] transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs font-medium text-[#71717A]">
                      No new notifications right now
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (n.ride && onOpenRide) {
                            onOpenRide(n.ride);
                            setNotificationsOpen(false);
                          }
                        }}
                        className={`p-2.5 rounded-xl border transition-all ${
                          n.ride
                            ? 'cursor-pointer hover:bg-[#FAFAF8] border-[#E4E4E7] shadow-2xs hover:border-[#09090B]/30'
                            : 'bg-[#FAFAF8]/60 border-[#E4E4E7]/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {n.type === 'urgent' && <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                            {n.type === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                            {n.type === 'upcoming' && <MapPin className="w-3.5 h-3.5 text-[#09090B] shrink-0" />}
                            {n.type === 'info' && <Bell className="w-3.5 h-3.5 text-[#71717A] shrink-0" />}
                            <span className="text-xs font-bold text-[#09090B] truncate">{n.title}</span>
                          </div>
                          <span className="text-[9px] font-semibold text-[#A1A1AA] shrink-0">{n.time}</span>
                        </div>
                        <p className="text-[11px] text-[#52525B] leading-relaxed">{n.desc}</p>
                        {n.ride && (
                          <div className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-[#09090B]">
                            <span>Open ride details</span>
                            <ArrowRight className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

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
