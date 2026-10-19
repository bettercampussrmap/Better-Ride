import React from 'react';
import { ArrowLeft, AlertTriangle, ShieldCheck, Clock, MessageSquare, ArrowRight, User } from 'lucide-react';
import { DESTINATION_FARES } from '../../lib/constants';
import { SlotWithDetails } from '../../types/database';
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
  const fare = DESTINATION_FARES[ride.destination] || DESTINATION_FARES.default;
  const memberCount = ride.memberCount || (ride.members?.length ?? 1);
  const targetSeats = ride.target_size || 4;
  const seatsOpen = Math.max(0, targetSeats - memberCount);

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-1">
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 rounded-xl border border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] flex items-center justify-center text-[#09090B] transition-colors cursor-pointer"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Joined Status Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#09090B] text-white text-xs font-bold shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
          <span>{memberCount}/{targetSeats} Joined</span>
        </div>

        <button
          type="button"
          onClick={() =>
            showToast('info', 'Verified Community', 'All students in this ride pool are verified campus members.')
          }
          className="w-9 h-9 rounded-xl border border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] flex items-center justify-center text-[#71717A] hover:text-[#09090B] transition-colors cursor-pointer"
          aria-label="Safety Alert"
        >
          <AlertTriangle className="w-4 h-4" />
        </button>
      </div>

      {/* Main Details Card */}
      <div className="bg-white rounded-2xl border border-[#E4E4E7] p-4 sm:p-5 shadow-2xs space-y-4">
        {/* Destination & Estimated Fare Row */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider">
              DESTINATION
            </span>
            <h3 className="text-xl font-extrabold text-[#09090B] tracking-tight">
              {ride.destination}
            </h3>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider">
              ESTIMATED FARE
            </span>
            <p className="text-sm font-extrabold text-[#09090B] tracking-tight">
              {fare}
            </p>
          </div>
        </div>

        {/* Journey Timeline Panel */}
        <div className="bg-[#F4F4F5] rounded-xl p-4 space-y-3 relative">
          {/* Pickup */}
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-[#09090B] shrink-0 mt-1" />
              <span className="w-[1.5px] h-9 bg-[#A1A1AA] my-1" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider">
                PICKUP SPOT
              </span>
              <p className="text-sm font-bold text-[#09090B]">
                {ride.pickup_point || 'SRM AP Gate 3'}
              </p>
              <p className="text-[11px] text-[#71717A] flex items-center gap-1 font-medium">
                <Clock className="w-3 h-3" />
                <span>
                  {ride.departure_date} · {ride.start_time.slice(0, 5)} – {ride.end_time.slice(0, 5)}
                </span>
              </p>
            </div>
          </div>

          {/* Drop */}
          <div className="flex items-start gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#09090B] shrink-0 mt-1" />
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider">
                DROP LOCATION
              </span>
              <p className="text-sm font-bold text-[#09090B]">{ride.destination}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Travel Companions Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#71717A] uppercase tracking-wider">
            TRAVEL COMPANIONS ({memberCount}/{targetSeats})
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F4F4F5] text-[11px] font-bold text-[#09090B] border border-[#E4E4E7]">
            <ShieldCheck className="w-3 h-3 text-[#22C55E]" />
            <span>Verified</span>
          </span>
        </div>

        {/* Real passenger list */}
        <div className="space-y-2">
          {ride.members && ride.members.length > 0 ? (
            ride.members.map((member) => {
              const isMe = member.user_id === currentUserId;
              const memberName =
                member.profile?.display_name ||
                (isMe ? userName : 'Student');
              const memberAvatar = member.profile?.avatar_url;

              return (
                <div
                  key={member.id}
                  className="bg-white rounded-xl border border-[#E4E4E7] p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-200 border border-[#E4E4E7] flex items-center justify-center font-bold text-xs text-[#09090B]">
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
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#09090B]">
                          {memberName}
                        </span>
                        {isMe && (
                          <span className="bg-[#09090B] text-white text-[9px] font-black px-1.5 py-0.2 rounded uppercase">
                            YOU
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#71717A] font-medium">
                        SRM University-AP
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-[#09090B]">Confirmed</span>
                </div>
              );
            })
          ) : (
            <div className="bg-white rounded-xl border border-[#E4E4E7] p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#09090B] text-white flex items-center justify-center font-bold text-xs">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#09090B]">{userName}</span>
                    <span className="bg-[#09090B] text-white text-[9px] font-black px-1.5 py-0.2 rounded uppercase">
                      YOU
                    </span>
                  </div>
                  <p className="text-[11px] text-[#71717A] font-medium">SRM University-AP</p>
                </div>
              </div>
              <span className="text-xs font-bold text-[#09090B]">Confirmed</span>
            </div>
          )}
        </div>

        {/* Open Seats Indicator */}
        {seatsOpen > 0 && (
          <div className="text-xs font-semibold text-[#71717A] flex items-center gap-1.5 px-1 pt-0.5">
            <span className="w-2 h-2 rounded-full bg-[#EAB308]" />
            <span>{seatsOpen} seat(s) open for other students</span>
          </div>
        )}
      </div>

      {/* Trip Coordination 3-Card Grid */}
      <div className="space-y-1.5">
        <span className="text-[10px] sm:text-[11px] font-bold text-[#71717A] uppercase tracking-wider">
          TRIP COORDINATION
        </span>
        <div className="grid grid-cols-3 gap-2">
          {/* Card 1 */}
          <div className="bg-white rounded-xl border border-[#E4E4E7] p-3 text-center space-y-1 shadow-2xs">
            <div className="text-xs font-bold text-[#09090B]">1. Gate 3</div>
            <p className="text-[10px] text-[#71717A] font-medium leading-tight">
              Meet 5m prior
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-xl border border-[#E4E4E7] p-3 text-center space-y-1 shadow-2xs">
            <div className="text-xs font-bold text-[#09090B]">2. Hail Auto</div>
            <p className="text-[10px] text-[#71717A] font-medium leading-tight">
              Share together
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-xl border border-[#E4E4E7] p-3 text-center space-y-1 shadow-2xs">
            <div className="text-xs font-bold text-[#09090B]">3. Split ₹</div>
            <p className="text-[10px] text-[#71717A] font-medium leading-tight">
              GPay / UPI split
            </p>
          </div>
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="pt-2 space-y-3">
        <button
          type="button"
          onClick={onOpenChat}
          className="w-full h-[50px] bg-[#09090B] hover:bg-[#18181B] active:scale-[0.99] text-white rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Open Group Chat</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Destructive Action: Leave this ride */}
        <div className="text-center">
          <button
            type="button"
            onClick={onLeaveRide}
            className="text-xs font-bold text-[#DC2626] hover:underline cursor-pointer py-1"
          >
            Leave this ride
          </button>
        </div>
      </div>
    </div>
  );
};
