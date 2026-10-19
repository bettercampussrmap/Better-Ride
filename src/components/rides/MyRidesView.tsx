import React, { useState } from 'react';
import { Clock, MapPin, MessageSquare, ArrowRight, CheckCircle2, Trash2 } from 'lucide-react';
import { SlotWithDetails } from '../../types/database';

interface MyRidesViewProps {
  upcomingRides: SlotWithDetails[];
  pastRides: SlotWithDetails[];
  onOpenRideDetails: (ride: SlotWithDetails) => void;
  onOpenRideChat: (ride: SlotWithDetails) => void;
  onFindNewRide: () => void;
  onDeleteRide?: (rideId: string) => void;
}

export const MyRidesView: React.FC<MyRidesViewProps> = ({
  upcomingRides,
  pastRides,
  onOpenRideDetails,
  onOpenRideChat,
  onFindNewRide,
  onDeleteRide,
}) => {
  const [segment, setSegment] = useState<'upcoming' | 'past'>('upcoming');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = (rideId: string) => {
    if (onDeleteRide) {
      onDeleteRide(rideId);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="space-y-3 animate-in fade-in duration-150">
      {/* Header - Compact */}
      <div className="space-y-0.2 pt-0.5">
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#09090B] tracking-tight">
          My Rides
        </h1>
      </div>

      {/* Segmented Control */}
      <div className="grid grid-cols-2 gap-1 bg-[#F4F4F5] p-1 rounded-lg">
        <button
          type="button"
          onClick={() => setSegment('upcoming')}
          className={`py-1 px-2.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            segment === 'upcoming'
              ? 'bg-[#09090B] text-white shadow-xs'
              : 'text-[#71717A] hover:text-[#09090B]'
          }`}
        >
          <span>Upcoming</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[8px] font-bold ${
              segment === 'upcoming' ? 'bg-white/20 text-white' : 'bg-gray-200 text-[#71717A]'
            }`}
          >
            {upcomingRides.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSegment('past')}
          className={`py-1 px-2.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            segment === 'past'
              ? 'bg-[#09090B] text-white shadow-xs'
              : 'text-[#71717A] hover:text-[#09090B]'
          }`}
        >
          <span>Past Rides</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[8px] font-bold ${
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
            <div className="bg-white rounded-xl border border-[#E4E4E7] p-5 text-center space-y-2 shadow-2xs">
              <p className="text-xs font-bold text-[#09090B]">No upcoming pooled rides</p>
              <p className="text-[10px] text-[#71717A]">
                You haven't joined or created any upcoming ride groups yet.
              </p>
              <button
                type="button"
                onClick={onFindNewRide}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#09090B] hover:bg-[#18181B] text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
              >
                <span>Find a Ride</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ) : (
            upcomingRides.map((ride) => (
              <div
                key={ride.id}
                className="bg-white rounded-xl border border-[#E4E4E7] p-2.5 sm:p-3 shadow-2xs space-y-1.5"
              >
                {/* Date/time & Filling up pill */}
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-semibold text-[#71717A]">
                    {ride.departure_date} · {ride.start_time.slice(0, 5)} {parseInt(ride.start_time) >= 12 ? 'PM' : 'AM'}
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-[#F4F4F5] text-[9px] font-bold text-[#09090B] border border-[#E4E4E7]">
                    <Clock className="w-2.5 h-2.5 text-[#71717A]" />
                    <span>Active Pool</span>
                  </span>
                </div>

                {/* Destination */}
                <h3 className="text-xs sm:text-sm font-bold text-[#09090B] tracking-tight truncate">
                  {ride.destination}
                </h3>

                {/* Pickup & student count */}
                <div className="flex items-center justify-between text-[10px] text-[#71717A]">
                  <span className="flex items-center gap-1 font-medium truncate max-w-[170px]">
                    <MapPin className="w-2.5 h-2.5" />
                    <span>{ride.pickup_point || 'SRM AP Gate 3'}</span>
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-[#09090B]">
                    <span>👥</span>
                    <span>{ride.memberCount || 1}/{ride.target_size || 4} seats</span>
                  </span>
                </div>

                {/* Bottom actions: View Details | Group Chat */}
                <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-[#E4E4E7]/60">
                  <button
                    type="button"
                    onClick={() => onOpenRideDetails(ride)}
                    className="h-7 px-2.5 rounded-lg border border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] text-[10px] font-bold text-[#09090B] transition-colors cursor-pointer flex items-center justify-center"
                  >
                    View Details
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenRideChat(ride)}
                    className="h-7 px-2.5 rounded-lg bg-[#09090B] hover:bg-[#18181B] text-[10px] font-bold text-white transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    <MessageSquare className="w-2.5 h-2.5" />
                    <span>Group Chat</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Past Rides Section with Chat and Delete */
        <div className="space-y-2">
          {pastRides.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E4E4E7] p-5 text-center text-[#71717A] text-[10px] font-medium shadow-2xs">
              No completed rides in your history yet. Completed rides appear here with access to chat and deletion.
            </div>
          ) : (
            pastRides.map((ride) => (
              <div
                key={ride.id}
                className="bg-white rounded-xl border border-[#E4E4E7] p-2.5 sm:p-3 shadow-2xs space-y-1.5"
              >
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-semibold text-[#71717A]">
                    {ride.departure_date} · {ride.start_time.slice(0, 5)} {parseInt(ride.start_time) >= 12 ? 'PM' : 'AM'}
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-emerald-50 text-[9px] font-bold text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                    <span>Completed</span>
                  </span>
                </div>

                <h4 className="text-xs sm:text-sm font-bold text-[#09090B] truncate">
                  {ride.destination}
                </h4>

                <div className="flex items-center justify-between text-[10px] text-[#71717A]">
                  <span className="flex items-center gap-1 truncate max-w-[170px]">
                    <MapPin className="w-2.5 h-2.5" />
                    <span>{ride.pickup_point || 'SRM AP Gate 3'}</span>
                  </span>
                  <span className="font-medium text-[#71717A]">
                    {ride.memberCount || 1} pooled
                  </span>
                </div>

                {/* Actions: Group Chat & Delete completed ride */}
                <div className="pt-1 border-t border-[#E4E4E7]/60 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onOpenRideChat(ride)}
                    className="flex-1 h-7 px-2.5 rounded-lg bg-[#09090B] hover:bg-[#18181B] text-[10px] font-bold text-white transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    <MessageSquare className="w-2.5 h-2.5" />
                    <span>Open Chat</span>
                  </button>

                  {confirmDeleteId === ride.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDelete(ride.id)}
                        className="h-7 px-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold transition-colors cursor-pointer"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="h-7 px-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-[#09090B] text-[10px] font-medium transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(ride.id)}
                      className="h-7 px-2.5 rounded-lg border border-[#E4E4E7] bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-[10px] font-medium text-[#71717A] transition-colors cursor-pointer flex items-center justify-center gap-1"
                      title="Delete from past rides"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
