import React, { useState } from 'react';
import { Clock, MapPin, MessageSquare, ArrowRight, CheckCircle2 } from 'lucide-react';
import { SlotWithDetails } from '../../types/database';

interface MyRidesViewProps {
  upcomingRides: SlotWithDetails[];
  pastRides: SlotWithDetails[];
  onOpenRideDetails: (ride: SlotWithDetails) => void;
  onOpenRideChat: (ride: SlotWithDetails) => void;
  onFindNewRide: () => void;
}

export const MyRidesView: React.FC<MyRidesViewProps> = ({
  upcomingRides,
  pastRides,
  onOpenRideDetails,
  onOpenRideChat,
  onFindNewRide,
}) => {
  const [segment, setSegment] = useState<'upcoming' | 'past'>('upcoming');

  return (
    <div className="space-y-3 animate-in fade-in duration-150">
      {/* Header - Compact */}
      <div className="space-y-0.5 pt-0.5">
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#09090B] tracking-tight">
          My Rides
        </h1>
        <p className="text-[11px] text-[#71717A] font-medium">
          Your pooled autos and cabs
        </p>
      </div>

      {/* Segmented Control */}
      <div className="grid grid-cols-2 gap-1.5 bg-[#F4F4F5] p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setSegment('upcoming')}
          className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            segment === 'upcoming'
              ? 'bg-[#09090B] text-white shadow-xs'
              : 'text-[#71717A] hover:text-[#09090B]'
          }`}
        >
          <span>Upcoming</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
              segment === 'upcoming' ? 'bg-white/20 text-white' : 'bg-gray-200 text-[#71717A]'
            }`}
          >
            {upcomingRides.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSegment('past')}
          className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            segment === 'past'
              ? 'bg-[#09090B] text-white shadow-xs'
              : 'text-[#71717A] hover:text-[#09090B]'
          }`}
        >
          <span>Past Rides</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
              segment === 'past' ? 'bg-white/20 text-white' : 'bg-gray-200 text-[#71717A]'
            }`}
          >
            {pastRides.length}
          </span>
        </button>
      </div>

      {/* Rides List */}
      {segment === 'upcoming' ? (
        <div className="space-y-2">
          {upcomingRides.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E4E4E7] p-6 text-center space-y-2.5">
              <p className="text-xs font-bold text-[#09090B]">No upcoming pooled rides</p>
              <p className="text-[11px] text-[#71717A]">
                You haven't joined or created any ride groups yet.
              </p>
              <button
                type="button"
                onClick={onFindNewRide}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#09090B] text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                <span>Find a Ride</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ) : (
            upcomingRides.map((ride) => (
              <div
                key={ride.id}
                className="bg-white rounded-xl border border-[#E4E4E7] p-3 shadow-2xs space-y-2"
              >
                {/* Date/time & Filling up pill */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#71717A]">
                    {ride.departure_date} · {ride.start_time.slice(0, 5)} {parseInt(ride.start_time) >= 12 ? 'PM' : 'AM'}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F4F4F5] text-[10px] font-bold text-[#09090B] border border-[#E4E4E7]">
                    <Clock className="w-2.5 h-2.5 text-[#71717A]" />
                    <span>Filling up</span>
                  </span>
                </div>

                {/* Destination */}
                <h3 className="text-sm font-bold text-[#09090B] tracking-tight">
                  {ride.destination}
                </h3>

                {/* Pickup & student count */}
                <div className="flex items-center justify-between text-[11px] text-[#71717A]">
                  <span className="flex items-center gap-1 font-medium truncate max-w-[170px]">
                    <MapPin className="w-3 h-3" />
                    <span>{ride.pickup_point || 'SRM AP Gate 3'}</span>
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-[#09090B]">
                    <span>👥</span>
                    <span>{ride.memberCount || 1}/{ride.target_size || 4}</span>
                  </span>
                </div>

                {/* Bottom actions: View Details | Group Chat */}
                <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-[#E4E4E7]/60">
                  <button
                    type="button"
                    onClick={() => onOpenRideDetails(ride)}
                    className="h-8 px-2.5 rounded-lg border border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] text-[11px] font-bold text-[#09090B] transition-colors cursor-pointer flex items-center justify-center"
                  >
                    View Details
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenRideChat(ride)}
                    className="h-8 px-2.5 rounded-lg bg-[#09090B] hover:bg-[#18181B] text-[11px] font-bold text-white transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>Group Chat</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Past Rides */
        <div className="space-y-2">
          {pastRides.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E4E4E7] p-6 text-center text-[#71717A] text-[11px] font-medium">
              No completed rides in history yet.
            </div>
          ) : (
            pastRides.map((ride) => (
              <div
                key={ride.id}
                className="bg-white rounded-xl border border-[#E4E4E7] p-3 shadow-2xs space-y-1.5 opacity-90"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#71717A]">
                    {ride.departure_date} · {ride.start_time.slice(0, 5)}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F4F4F5] text-[9px] font-bold text-[#71717A]">
                    <CheckCircle2 className="w-2.5 h-2.5 text-[#22C55E]" />
                    <span>Completed</span>
                  </span>
                </div>
                <h4 className="text-sm font-bold text-[#09090B]">{ride.destination}</h4>
                <p className="text-[11px] text-[#71717A]">
                  {ride.pickup_point || 'SRM AP Gate 3'} · {ride.memberCount} students pooled
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
