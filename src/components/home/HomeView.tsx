import React, { useState, useMemo, useRef } from 'react';
import { Search, MapPin, ArrowRight, MessageSquare } from 'lucide-react';
import { POPULAR_STUDENT_SPOTS, CAMPUS_DESTINATIONS } from '../../lib/constants';
import { SlotWithDetails } from '../../types/database';

interface HomeViewProps {
  userName: string;
  selectedDestination: string;
  onSelectDestination: (dest: string) => void;
  onFindRide: (dest?: string) => void;
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
  upcomingRides,
  activeStudentsCount,
  onOpenRideDetails,
  onOpenRideChat,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllSpots, setShowAllSpots] = useState(false);
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Time-based greeting
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
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. Greeting Section */}
      <div className="space-y-0.5 pt-1">
        <p className="text-xs font-semibold text-[#71717A] flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#71717A]" />
          <span>{greeting}</span>
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#09090B] tracking-tight">
          {userName.split(' ')[0]} 👋
        </h1>
      </div>

      {/* 2. Where are you going? Card */}
      <div className="bg-white rounded-2xl border border-[#E4E4E7] p-4 sm:p-5 shadow-2xs space-y-4">
        {/* Card Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-[#09090B] tracking-tight">
            Where are you going?
          </h2>
          <div className="w-8 h-8 rounded-full bg-[#F4F4F5] flex items-center justify-center text-[#71717A]">
            <MapPin className="w-4 h-4 text-[#09090B]" />
          </div>
        </div>

        {/* Search Field */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#71717A]">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleFindRideClick();
            }}
            placeholder="Search destination (e.g. Mangalagiri, Station)..."
            className="w-full pl-10 pr-4 py-3 bg-[#F4F4F5] hover:bg-[#EDEDF0] focus:bg-white rounded-xl border border-transparent focus:border-[#09090B] text-xs sm:text-sm font-medium text-[#09090B] placeholder:text-[#A1A1AA] transition-all outline-none"
          />

          {/* Search Dropdown preview if user is typing */}
          {filteredDestinations.length > 0 && searchQuery && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-lg border border-[#E4E4E7] py-1 z-30 max-h-48 overflow-y-auto">
              {filteredDestinations.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setSearchQuery(d.name);
                    onSelectDestination(d.name);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs hover:bg-[#F4F4F5] flex items-center justify-between transition-colors"
                >
                  <span className="font-semibold text-[#09090B]">{d.name}</span>
                  <span className="text-[10px] text-[#A1A1AA]">{d.approxDistance}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Popular Student Spots */}
        <div className="space-y-2">
          <span className="text-[10px] sm:text-[11px] font-bold text-[#71717A] uppercase tracking-wider">
            POPULAR STUDENT SPOTS
          </span>
          <div className="flex flex-wrap gap-2">
            {displayedSpots.map((spot) => {
              const isSelected =
                searchQuery.toLowerCase().includes(spot.toLowerCase()) ||
                selectedDestination.toLowerCase().includes(spot.toLowerCase());
              return (
                <button
                  key={spot}
                  type="button"
                  onClick={() => handleChipClick(spot)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#09090B] text-white border-[#09090B]'
                      : 'bg-[#FFFFFF] text-[#09090B] border-[#E4E4E7] hover:bg-[#F4F4F5]'
                  }`}
                >
                  <MapPin className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-[#71717A]'}`} />
                  <span>{spot}</span>
                </button>
              );
            })}
            {!showAllSpots && (
              <button
                type="button"
                onClick={() => setShowAllSpots(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-[#E4E4E7] bg-white text-xs font-semibold text-[#71717A] hover:text-[#09090B] hover:border-[#09090B] transition-colors cursor-pointer"
              >
                <span>+ More</span>
              </button>
            )}
          </div>
        </div>

        {/* Find a Ride Button */}
        <button
          type="button"
          onClick={handleFindRideClick}
          className="w-full h-[50px] bg-[#09090B] hover:bg-[#18181B] active:scale-[0.99] text-white rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
        >
          <span>Find a Ride</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* 3. Upcoming Rides Carousel */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs sm:text-sm font-bold text-[#09090B] tracking-wider uppercase">
              UPCOMING RIDES
            </h3>
            <span className="w-5 h-5 rounded-full bg-[#09090B] text-white text-[10px] font-bold flex items-center justify-center">
              {upcomingRides.length}
            </span>
          </div>

          {upcomingRides.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (upcomingRides[0]) onOpenRideDetails(upcomingRides[0]);
              }}
              className="text-xs font-semibold text-[#71717A] hover:text-[#09090B] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Swipe to view all</span>
              <span>→</span>
            </button>
          )}
        </div>

        {/* Horizontal Carousel */}
        {upcomingRides.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E4E4E7] p-6 text-center space-y-2">
            <p className="text-xs font-bold text-[#09090B]">No active ride groups yet</p>
            <p className="text-[11px] text-[#71717A]">
              Choose a destination above to start or find a ride group from campus.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div
              ref={carouselRef}
              onScroll={handleScrollCarousel}
              className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none -mx-1 px-1"
            >
              {upcomingRides.map((ride, idx) => (
                <div
                  key={ride.id}
                  className="min-w-[85%] sm:min-w-[320px] max-w-[340px] shrink-0 snap-center bg-white rounded-2xl border border-[#E4E4E7] p-4 shadow-2xs space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    {/* Top subheader: RIDE X OF Y and Date */}
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-[#71717A] uppercase tracking-wider">
                        RIDE {idx + 1} OF {upcomingRides.length}
                      </span>
                      <span className="text-[#71717A] font-semibold">{ride.departure_date}</span>
                    </div>

                    {/* Main destination and seats */}
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-base sm:text-lg font-bold text-[#09090B] tracking-tight truncate">
                        {ride.destination}
                      </h4>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F4F4F5] text-[11px] font-bold text-[#09090B] shrink-0">
                        <span>👥</span>
                        <span>{ride.memberCount}/{ride.target_size || 4}</span>
                      </span>
                    </div>

                    {/* Departure time & pickup point */}
                    <p className="text-xs text-[#71717A] font-medium flex items-center gap-1.5">
                      <span>{ride.start_time.slice(0, 5)} {parseInt(ride.start_time) >= 12 ? 'PM' : 'AM'}</span>
                      <span>·</span>
                      <span className="truncate">{ride.pickup_point || 'SRM AP Gate 3'}</span>
                    </p>
                  </div>

                  {/* Actions: Details & Chat */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onOpenRideDetails(ride)}
                      className="h-9 px-3 rounded-xl border border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] text-xs font-bold text-[#09090B] transition-colors cursor-pointer flex items-center justify-center"
                    >
                      Details
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenRideChat(ride)}
                      className="h-9 px-3 rounded-xl bg-[#09090B] hover:bg-[#18181B] text-xs font-bold text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination dots */}
            {upcomingRides.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 pt-1">
                {upcomingRides.slice(0, 5).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      activeCarouselIndex === i ? 'w-4 bg-[#09090B]' : 'w-1.5 bg-[#E4E4E7]'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Active Students on Campus Card (Real count) */}
      <div className="bg-white rounded-xl border border-[#E4E4E7] px-4 py-3 text-center shadow-2xs">
        <p className="text-xs font-semibold text-[#09090B] flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#09090B]" />
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
