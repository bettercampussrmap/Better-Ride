import React from 'react';
import { ArrowLeft, AlertTriangle, Clock, MessageSquare, ArrowRight, User, CheckCircle2 } from 'lucide-react';
import { SlotWithDetails } from '../../types/database';
import { isRideCompleted } from '../../lib/date-utils';
import { useToast } from '../ui/Toast';

interface Step4JoinedRideDetailsProps {
  ride: SlotWithDetails;
  currentUserId: string;
  userName: string;
  onOpenChat: () => void;
  onLeaveRide: () => void;
  onBack: () => void;
}

export const Step4JoinedRideDetails: React.FC<Step4JoinedRideDetailsProps> = ({
  ride,
  currentUserId,
  userName,
  onOpenChat,
  onLeaveRide,
  onBack,
}) => {
  const { showToast } = useToast();
  const memberCount = ride.memberCount || (ride.members?.length ?? 1);
  const targetSeats = ride.target_size || 4;
  const seatsOpen = Math.max(0, targetSeats - memberCount);
  const isCompleted = isRideCompleted(ride.departure_date, ride.end_time);

  return (
    <div className="space-y-3 animate-in fade-in duration-150">
      {/* Top Bar - Compact */}
      <div className="flex items-center justify-between pb-0.5">
        <button
          type="button"
          onClick={onBack}
          className="w-7 h-7 rounded-lg border border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] flex items-center justify-center text-[#09090B] transition-colors cursor-pointer"
          aria-label="Back"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>

        {/* Joined Status Pill */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#09090B] text-white text-[10px] font-bold shadow-2xs">
          {isCompleted ? (
            <>
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
              <span>Completed</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
              <span>{memberCount}/{targetSeats} Joined</span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() =>
            showToast('info', 'Verified Community', 'All students in this ride pool are verified campus members.')
          }
          className="w-7 h-7 rounded-lg border border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] flex items-center justify-center text-[#71717A] hover:text-[#09090B] transition-colors cursor-pointer"
          aria-label="Safety Alert"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Details Card - Compact */}
      <div className="bg-white rounded-xl border border-[#E4E4E7] p-3.5 shadow-2xs space-y-3">
        {/* Destination Row */}
        <div>
          <span className="text-[9px] font-bold text-[#71717A] uppercase tracking-wider">
            DESTINATION
          </span>
          <h3 className="text-base sm:text-lg font-extrabold text-[#09090B] tracking-tight">
            {ride.destination}
          </h3>
        </div>

        {/* Journey Timeline Panel - Compact */}
        <div className="bg-[#F4F4F5] rounded-lg p-3 space-y-2 relative">
          {/* Pickup */}
          <div className="flex items-start gap-2.5">
            <div className="flex flex-col items-center">
              <span className="w-2 h-2 rounded-full bg-[#09090B] shrink-0 mt-1" />
              <span className="w-[1px] h-6 bg-[#A1A1AA] my-0.5" />
            </div>
            <div className="space-y-0.2">
              <span className="text-[9px] font-bold text-[#71717A] uppercase tracking-wider">
                PICKUP SPOT
              </span>
              <p className="text-xs font-bold text-[#09090B]">
                {ride.pickup_point || 'SRM AP Gate 3'}
              </p>
              <p className="text-[10px] text-[#71717A] flex items-center gap-1 font-medium">
                <Clock className="w-2.5 h-2.5" />
                <span>
                  {ride.departure_date} · {ride.start_time.slice(0, 5)} – {ride.end_time.slice(0, 5)}
                </span>
              </p>
            </div>
          </div>

          {/* Drop */}
          <div className="flex items-start gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#09090B] shrink-0 mt-0.5" />
            <div className="space-y-0.2">
              <span className="text-[9px] font-bold text-[#71717A] uppercase tracking-wider">
                DROP LOCATION
              </span>
              <p className="text-xs font-bold text-[#09090B]">{ride.destination}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Travel Companions Section */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider">
            TRAVEL COMPANIONS ({memberCount}/{targetSeats})
          </span>
        </div>

        {/* Passenger list */}
        <div className="space-y-1.5">
          {ride.members && ride.members.length > 0 ? (
            ride.members.map((member) => {
              const isMe = member.user_id === currentUserId;
              const displayName = member.profile?.name?.trim() || member.profile?.display_name?.trim();
              const isGeneric =
                !displayName ||
                displayName.toLowerCase() === 'student' ||
                displayName.toLowerCase() === 'campus member';
              
              const memberName = isGeneric
                ? (isMe ? userName : member.profile?.email ? member.profile.email.split('@')[0] : 'Member')
                : displayName;
              const memberAvatar = member.profile?.avatar_url;

              return (
                <div
                  key={member.id}
                  className="bg-white rounded-lg border border-[#E4E4E7] p-2.5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-200 border border-[#E4E4E7] flex items-center justify-center font-bold text-xs text-[#09090B]">
                      {memberAvatar ? (
                        <img
                          src={memberAvatar}
                          alt={memberName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span>{memberName.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-[#09090B]">
                          {memberName}
                        </span>
                        {isMe && (
                          <span className="bg-[#09090B] text-white text-[8px] font-black px-1 rounded uppercase">
                            YOU
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#71717A] font-medium">
                        SRM University-AP
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-bold text-[#09090B]">Confirmed</span>
                </div>
              );
            })
          ) : (
            <div className="bg-white rounded-lg border border-[#E4E4E7] p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#09090B] text-white flex items-center justify-center font-bold text-xs">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-[#09090B]">{userName}</span>
                    <span className="bg-[#09090B] text-white text-[8px] font-black px-1 rounded uppercase">
                      YOU
                    </span>
                  </div>
                  <p className="text-[10px] text-[#71717A] font-medium">SRM University-AP</p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-[#09090B]">Confirmed</span>
            </div>
          )}
        </div>

        {/* Open Seats Indicator */}
        {seatsOpen > 0 && (
          <div className="text-[11px] font-semibold text-[#71717A] flex items-center gap-1 px-1 pt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EAB308]" />
            <span>{seatsOpen} seat(s) open for other students (Max {targetSeats})</span>
          </div>
        )}
      </div>

      {/* Primary Action Button - Compact h-8.5 */}
      <div className="pt-1 space-y-1.5">
        <button
          type="button"
          onClick={onOpenChat}
          className="w-full h-8.5 bg-[#09090B] hover:bg-[#18181B] active:scale-[0.99] text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
        >
          <MessageSquare className="w-3 h-3" />
          <span>Open Group Chat</span>
          <ArrowRight className="w-3 h-3" />
        </button>

        {/* Leave this ride */}
        <div className="text-center">
          <button
            type="button"
            onClick={onLeaveRide}
            className="text-[10px] font-bold text-[#DC2626] hover:underline cursor-pointer py-0.5"
          >
            Leave this ride
          </button>
        </div>
      </div>
    </div>
  );
};
