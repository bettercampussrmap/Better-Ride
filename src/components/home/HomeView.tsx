import React, { useState, useMemo, useRef } from 'react';
import { Search, MapPin, ArrowRight, MessageSquare, Plus, Users, UserPlus } from 'lucide-react';
import { POPULAR_STUDENT_SPOTS, CAMPUS_DESTINATIONS } from '../../lib/constants';
import { SlotWithDetails } from '../../types/database';

interface HomeViewProps {
  userName: string;
  selectedDestination: string;
  onSelectDestination: (dest: string) => void;
  onFindRide: (dest?: string) => void;
  onCreateGroup?: () => void;
  onJoinRide?: (slot: SlotWithDetails) => void;
  upcomingRides: SlotWithDetails[];
  activeStudentsCount: number;
  onOpenRideDetails: (slot: SlotWithDetails) => void;
  onOpenRideChat: (slot: SlotWithDetails) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  userName,
  selectedDestination,
  onSelectDestination,
  onFindRide,
  onCreateGroup,
  onJoinRide,
  upcomingRides,
  activeStudentsCount,
  onOpenRideDetails,
  onOpenRideChat,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllSpots, setShowAllSpots] = useState(false);
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Filter destinations if user typed something
  const filteredDestinations = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return CAMPUS_DESTINATIONS.filter(
      (d) => d.name.toLowerCase().includes(q) || d.shortName.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const displayedSpots = showAllSpots
    ? CAMPUS_DESTINATIONS.map((d) => d.shortName)
    : POPULAR_STUDENT_SPOTS;

  const handleScrollCarousel = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const cardWidth = container.offsetWidth * 0.82;
    const index = Math.round(container.scrollLeft / cardWidth);
    setActiveCarouselIndex(Math.min(index, Math.max(0, upcomingRides.length - 1)));
  };

  const handleChipClick = (spot: string) => {
    const match = CAMPUS_DESTINATIONS.find(
      (d) => d.name.toLowerCase().includes(spot.toLowerCase()) || d.shortName.toLowerCase().includes(spot.toLowerCase())
    );
    const chosen = match ? match.name : spot;
    onSelectDestination(chosen);
    setSearchQuery(chosen);
  };

  const handleFindRideClick = () => {
    const chosen = searchQuery.trim() || selectedDestination || 'Mangalagiri';
    onSelectDestination(chosen);
    onFindRide(chosen);
  };

  return (
    <div className="space-y-3.5 animate-in fade-in duration-200">
      {/* 1. Greeting Section - Compact */}
      <div className="flex items-center justify-between pt-0.5">
        <div>
          <p className="text-[11px] font-semibold text-[#71717A] flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#71717A]" />
            <span>{greeting}</span>
          </p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#09090B] tracking-tight">
            {userName.split(' ')[0]} 👋
          </h1>
        </div>

        {/* Quick Create Group Button in header */}
        {onCreateGroup && (
          <button
            type="button"
            onClick={onCreateGroup}
            className="h-8 px-3 rounded-lg bg-[#09090B] hover:bg-[#18181B] active:scale-[0.98] text-white text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Group</span>
          </button>
        )}
      </div>

      {/* 2. Where are you going? Card - Compact */}
      <div className="bg-white rounded-xl border border-[#E4E4E7] p-3.5 sm:p-4 shadow-2xs space-y-3">
        {/* Card Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-[#09090B] tracking-tight">
            Where are you going?
          </h2>
          <div className="w-6 h-6 rounded-full bg-[#F4F4F5] flex items-center justify-center text-[#71717A]">
            <MapPin className="w-3.5 h-3.5 text-[#09090B]" />
          </div>
        </div>

        {/* Search Field */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#71717A]">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleFindRideClick();
            }}
            placeholder="Search destination (e.g. Mangalagiri, Station)..."
            className="w-full pl-8 pr-3 py-2 bg-[#F4F4F5] hover:bg-[#EDEDF0] focus:bg-white rounded-xl border border-transparent focus:border-[#09090B] text-xs font-medium text-[#09090B] placeholder:text-[#A1A1AA] transition-all outline-none"
          />

          {/* Search Dropdown preview */}
          {filteredDestinations.length > 0 && searchQuery && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-[#E4E4E7] py-1 z-30 max-h-44 overflow-y-auto">
              {filteredDestinations.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setSearchQuery(d.name);
                    onSelectDestination(d.name);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-[#F4F4F5] flex items-center justify-between transition-colors"
                >
                  <span className="font-semibold text-[#09090B] truncate">{d.name}</span>
                  <span className="text-[10px] text-[#A1A1AA] shrink-0 ml-2">{d.approxDistance}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Popular Student Spots */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider">
            POPULAR STUDENT SPOTS
          </span>
          <div className="flex flex-wrap gap-1.5">
            {displayedSpots.map((spot) => {
              const isSelected =
                searchQuery.toLowerCase().includes(spot.toLowerCase()) ||
                selectedDestination.toLowerCase().includes(spot.toLowerCase());
              return (
                <button
                  key={spot}
                  type="button"
                  onClick={() => handleChipClick(spot)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#09090B] text-white border-[#09090B]'
                      : 'bg-[#FFFFFF] text-[#09090B] border-[#E4E4E7] hover:bg-[#F4F4F5]'
                  }`}
                >
                  <MapPin className={`w-2.5 h-2.5 ${isSelected ? 'text-white' : 'text-[#71717A]'}`} />
                  <span>{spot}</span>
                </button>
              );
            })}
            {!showAllSpots && (
              <button
                type="button"
                onClick={() => setShowAllSpots(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-[#E4E4E7] bg-white text-[11px] font-semibold text-[#71717A] hover:text-[#09090B] transition-colors cursor-pointer"
              >
                <span>+ More</span>
              </button>
            )}
          </div>
        </div>

        {/* Dual Action Buttons: Find a Ride & Create Group - Compact h-9.5 */}
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <button
            type="button"
            onClick={handleFindRideClick}
            className="h-9.5 bg-[#09090B] hover:bg-[#18181B] active:scale-[0.99] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <span>Find a Ride</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onCreateGroup || handleFindRideClick}
            className="h-9.5 bg-[#F4F4F5] hover:bg-[#EDEDF0] active:scale-[0.99] text-[#09090B] border border-[#E4E4E7] rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Group</span>
          </button>
        </div>
      </div>

      {/* 3. Upcoming Rides Carousel - Compact */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h3 className="text-xs font-bold text-[#09090B] tracking-wider uppercase">
              UPCOMING RIDES
            </h3>
            <span className="px-1.5 py-0.2 rounded-full bg-[#09090B] text-white text-[9px] font-bold">
              {upcomingRides.length}
            </span>
          </div>

          {upcomingRides.length > 0 && (
            <span className="text-[10px] font-semibold text-[#71717A]">
              Swipe to explore →
            </span>
          )}
        </div>

        {/* Horizontal Carousel */}
        {upcomingRides.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E4E4E7] p-5 text-center space-y-2">
            <p className="text-xs font-bold text-[#09090B]">No active ride groups yet</p>
            <p className="text-[11px] text-[#71717A]">
              Choose a destination above or click Create Group to start pooling.
            </p>
            {onCreateGroup && (
              <button
                type="button"
                onClick={onCreateGroup}
                className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#09090B] text-white text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Group</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <div
              ref={carouselRef}
              onScroll={handleScrollCarousel}
              className="flex gap-2.5 overflow-x-auto pb-1.5 snap-x snap-mandatory scrollbar-none -mx-0.5 px-0.5"
            >
              {upcomingRides.map((ride, idx) => {
                const isFull = (ride.memberCount || 0) >= (ride.target_size || 4);
                return (
                  <div
                    key={ride.id}
                    className="min-w-[84%] sm:min-w-[280px] max-w-[300px] shrink-0 snap-center bg-white rounded-xl border border-[#E4E4E7] p-3 shadow-2xs space-y-2.5 flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      {/* Top subheader: RIDE X OF Y and Date */}
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-[#71717A] uppercase tracking-wider">
                          POOL {idx + 1} OF {upcomingRides.length}
                        </span>
                        <span className="text-[#71717A] font-semibold">{ride.departure_date}</span>
                      </div>

                      {/* Main destination and seats */}
                      <div className="flex items-start justify-between gap-1.5">
                        <h4 className="text-sm font-bold text-[#09090B] tracking-tight truncate">
                          {ride.destination}
                        </h4>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                          ride.isUserJoined
                            ? 'bg-[#22C55E]/15 text-[#16A34A]'
                            : isFull
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-[#F4F4F5] text-[#09090B]'
                        }`}>
                          <span>👥</span>
                          <span>{ride.memberCount}/{ride.target_size || 4}</span>
                        </span>
                      </div>

                      {/* Departure time & pickup point */}
                      <p className="text-[11px] text-[#71717A] font-medium flex items-center gap-1">
                        <span className="font-semibold text-[#09090B]">
                          {ride.start_time.slice(0, 5)} {parseInt(ride.start_time) >= 12 ? 'PM' : 'AM'}
                        </span>
                        <span>·</span>
                        <span className="truncate">{ride.pickup_point || 'SRM AP Gate 3'}</span>
                      </p>
                    </div>

                    {/* Actions: Join for a ride button + Details & Chat */}
                    <div className="space-y-1.5 pt-0.5">
                      {/* Primary Join for a ride button */}
                      {ride.isUserJoined ? (
                        <button
                          type="button"
                          onClick={() => onOpenRideDetails(ride)}
                          className="w-full h-8 px-2.5 rounded-lg bg-[#F4F4F5] hover:bg-[#EDEDF0] text-[11px] font-bold text-[#09090B] transition-colors cursor-pointer flex items-center justify-center gap-1"
                        >
                          <span>✓ Joined · Open Group</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onJoinRide ? onJoinRide(ride) : onOpenRideDetails(ride)}
                          className="w-full h-8 px-2.5 rounded-lg bg-[#09090B] hover:bg-[#18181B] text-[11px] font-bold text-white transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                        >
                          <UserPlus className="w-3 h-3" />
                          <span>Join for a ride</span>
                        </button>
                      )}

                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenRideDetails(ride)}
                          className="h-7 px-2 rounded-lg border border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] text-[10px] font-semibold text-[#09090B] transition-colors cursor-pointer flex items-center justify-center"
                        >
                          Details
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenRideChat(ride)}
                          className="h-7 px-2 rounded-lg border border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] text-[10px] font-semibold text-[#09090B] transition-colors cursor-pointer flex items-center justify-center gap-1"
                        >
                          <MessageSquare className="w-3 h-3 text-[#71717A]" />
                          <span>Chat</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination dots */}
            {upcomingRides.length > 1 && (
              <div className="flex items-center justify-center gap-1 pt-0.5">
                {upcomingRides.slice(0, 5).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 rounded-full transition-all ${
                      activeCarouselIndex === i ? 'w-3 bg-[#09090B]' : 'w-1 bg-[#E4E4E7]'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Active Students on Campus Card - Compact */}
      <div className="bg-white rounded-xl border border-[#E4E4E7] px-3 py-2 text-center shadow-2xs">
        <p className="text-[11px] font-semibold text-[#09090B] flex items-center justify-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
          <span>
            {activeStudentsCount > 0
              ? `${activeStudentsCount} student${activeStudentsCount > 1 ? 's' : ''} active on campus today`
              : 'Active campus departure network for SRM AP students'}
          </span>
        </p>
      </div>
    </div>
  );
};
