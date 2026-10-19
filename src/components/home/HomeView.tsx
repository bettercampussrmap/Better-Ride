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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [feedbackDestination, setFeedbackDestination] = useState<string | null>(null);
  const [showAllSpots, setShowAllSpots] = useState(false);
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

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

  const handleSelectLocation = (destName: string) => {
    onSelectDestination(destName);
    setSearchQuery(destName);
    setIsDropdownOpen(false);
    setFeedbackDestination(destName);
    setTimeout(() => {
      setFeedbackDestination(null);
    }, 4000);
  };

  const handleChipClick = (spot: string) => {
    const match = CAMPUS_DESTINATIONS.find(
      (d) =>
        d.name.toLowerCase().includes(spot.toLowerCase()) ||
        d.shortName.toLowerCase().includes(spot.toLowerCase())
    );
    const chosen = match ? match.name : spot;
    handleSelectLocation(chosen);
  };

  const handleFindRideClick = () => {
    const chosen = searchQuery.trim() || selectedDestination || 'Vijayawada';
    onSelectDestination(chosen);
    onFindRide(chosen);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. Where are you going? Card - Compact & Crisp */}
      <div className="bg-white rounded-2xl border border-[#E4E4E7] p-4 shadow-md space-y-3">
        {/* Card Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-extrabold text-[#09090B] tracking-tight">
            Where are you going?
          </h2>
        </div>

        {/* Search Field - Styled as a clean interactive input bar with visible shadow */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#71717A]">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onFocus={() => setIsDropdownOpen(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsDropdownOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleFindRideClick();
            }}
            placeholder="Search destination (Vijayawada, Mangalagiri)..."
            className="w-full pl-10 pr-3 py-2.5 bg-white hover:bg-white focus:bg-white rounded-xl border border-[#D4D4D8] focus:border-[#09090B] focus:ring-2 focus:ring-[#09090B]/15 text-xs font-semibold text-[#09090B] placeholder:text-[#A1A1AA] transition-all outline-none shadow-sm"
          />

          {/* Search Dropdown preview */}
          {isDropdownOpen && filteredDestinations.length > 0 && searchQuery && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-[#E4E4E7] py-1 z-30 max-h-48 overflow-y-auto">
              <div className="px-2.5 py-1 text-[9px] font-bold text-[#A1A1AA] uppercase tracking-wider">
                Select Destination
              </div>
              {filteredDestinations.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectLocation(d.name);
                  }}
                  className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-[#F4F4F5] flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3 h-3 text-[#71717A] shrink-0" />
                    <span className="font-semibold text-[#09090B] truncate text-xs">{d.name}</span>
                  </div>
                  <span className="text-[10px] text-[#71717A] shrink-0 ml-2 font-medium bg-[#F4F4F5] px-1.5 py-0.5 rounded">
                    {d.approxDistance}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Immediate Visual Confirmation Feedback Badge when clicked */}
        {feedbackDestination && (
          <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold flex items-center justify-between animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-1.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              <span>Destination confirmed: <strong>{feedbackDestination}</strong></span>
            </div>
            <button
              type="button"
              onClick={handleFindRideClick}
              className="text-[10px] font-bold bg-emerald-700 text-white px-2 py-0.5 rounded hover:bg-emerald-800 transition-colors cursor-pointer shrink-0 ml-1.5"
            >
              Continue →
            </button>
          </div>
        )}

        {/* Suggested Destinations: Vijayawada & Mangalagiri Only */}
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {['Vijayawada', 'Mangalagiri'].map((spot) => {
            const isSelected =
              searchQuery.toLowerCase().includes(spot.toLowerCase()) ||
              selectedDestination.toLowerCase().includes(spot.toLowerCase());
            return (
              <button
                key={spot}
                type="button"
                onClick={() => handleChipClick(spot)}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-all cursor-pointer shadow-2xs ${
                  isSelected
                    ? 'bg-[#09090B] text-white border-[#09090B]'
                    : 'bg-[#F4F4F5] text-[#09090B] border-transparent hover:bg-[#E4E4E7]'
                }`}
              >
                <MapPin className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-[#71717A]'}`} />
                <span>{spot}</span>
                {isSelected && <span className="text-[10px]">✓</span>}
              </button>
            );
          })}
        </div>

        {/* Action Button: Find a Ride */}
        <div className="pt-0.5">
          <button
            type="button"
            onClick={handleFindRideClick}
            className="w-full h-8.5 bg-[#09090B] hover:bg-[#18181B] active:scale-[0.99] text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <span>Find a Ride</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 3. Upcoming Rides Carousel - Compact */}
      <div className="space-y-2 pt-2">
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
          <div className="bg-white rounded-xl border border-[#E4E4E7] p-4 text-center space-y-1.5 shadow-2xs">
            <p className="text-xs font-bold text-[#09090B]">No joined upcoming rides yet</p>
            <p className="text-[10px] text-[#71717A] max-w-xs mx-auto">
              You haven't joined any upcoming pools. Search your destination above to find or start a group!
            </p>
            {onCreateGroup && (
              <button
                type="button"
                onClick={onCreateGroup}
                className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#09090B] text-white text-[11px] font-bold cursor-pointer hover:bg-[#18181B] transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Create Group</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <div
              ref={carouselRef}
              onScroll={handleScrollCarousel}
              className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-none -mx-0.5 px-0.5"
            >
              {upcomingRides.map((ride, idx) => {
                const isFull = (ride.memberCount || 0) >= (ride.target_size || 4);
                return (
                  <div
                    key={ride.id}
                    className="min-w-[85%] sm:min-w-[270px] max-w-[290px] shrink-0 snap-center bg-white rounded-xl border border-[#E4E4E7] p-2.5 sm:p-3 shadow-2xs space-y-2 flex flex-col justify-between"
                  >
                    <div className="space-y-1">
                      {/* Top subheader: Date and Seats */}
                      <div className="flex items-center justify-between text-[9px]">
                        <span className="font-bold text-[#71717A] uppercase tracking-wider">
                          POOL {idx + 1} OF {upcomingRides.length}
                        </span>
                        <span className="text-[#71717A] font-semibold">{ride.departure_date}</span>
                      </div>

                      {/* Main destination and seats */}
                      <div className="flex items-start justify-between gap-1.5">
                        <h4 className="text-xs sm:text-sm font-bold text-[#09090B] tracking-tight truncate">
                          {ride.destination}
                        </h4>
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-[#22C55E]/15 text-[#16A34A] shrink-0">
                          <span>👥</span>
                          <span>{ride.memberCount}/{ride.target_size || 4}</span>
                        </span>
                      </div>

                      {/* Departure time & pickup point */}
                      <p className="text-[10px] text-[#71717A] font-medium flex items-center gap-1">
                        <span className="font-semibold text-[#09090B]">
                          {ride.start_time.slice(0, 5)} {parseInt(ride.start_time) >= 12 ? 'PM' : 'AM'}
                        </span>
                        <span>·</span>
                        <span className="truncate">{ride.pickup_point || 'SRM AP Gate 3'}</span>
                      </p>
                    </div>

                    {/* Actions: Joined Open Group + Details & Chat */}
                    <div className="space-y-1 pt-1 border-t border-[#E4E4E7]/60">
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
                          className="h-7 px-2 rounded-lg bg-[#09090B] hover:bg-[#18181B] text-[10px] font-bold text-white transition-colors cursor-pointer flex items-center justify-center gap-1"
                        >
                          <MessageSquare className="w-2.5 h-2.5" />
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
