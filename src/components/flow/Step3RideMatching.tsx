import React from 'react';
import { ArrowLeft, MapPin, ShieldCheck, Plus, ArrowRight, Users, UserPlus, Car } from 'lucide-react';
import { ProgressStepper } from '../navigation/ProgressStepper';
import { IntervalDefinition } from '../../lib/constants';
import { SlotWithDetails } from '../../types/database';

interface Step3RideMatchingProps {
  destination: string;
  selectedDate: string;
  selectedPickup?: string;
  selectedTimeInterval: IntervalDefinition;
  slotGroups: SlotWithDetails[];
  otherGroups?: SlotWithDetails[];
  currentUserId: string;
  onJoinRide: (ride: SlotWithDetails) => void;
  onOpenRide: (ride: SlotWithDetails) => void;
  onStartNewGroup: () => void;
  onChangeTime: () => void;
  onBack: () => void;
}

export const Step3RideMatching: React.FC<Step3RideMatchingProps> = ({
  destination,
  selectedDate,
  selectedPickup = 'SRM AP Gate 3',
  selectedTimeInterval,
  slotGroups,
  otherGroups = [],
  currentUserId,
  onJoinRide,
  onOpenRide,
  onStartNewGroup,
  onChangeTime,
  onBack,
}) => {
  return (
    <div className="space-y-3 animate-in fade-in duration-150">
      {/* Subheader bar - Destination locked from 1st page, NO change button */}
      <div className="flex items-center justify-between pb-0.5">
        <button
          type="button"
          onClick={onBack}
          className="w-7 h-7 rounded-lg border border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] flex items-center justify-center text-[#09090B] transition-colors cursor-pointer"
          aria-label="Back"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>

        <div className="text-center">
          <h2 className="text-sm font-bold text-[#09090B] tracking-tight">{destination}</h2>
          <p className="text-[10px] font-medium text-[#71717A]">{selectedDate} · SRM AP Gate 3</p>
        </div>

        {/* Locked destination placeholder for symmetrical spacing */}
        <div className="w-7 h-7" />
      </div>

      {/* Progress Stepper */}
      <ProgressStepper currentStep={3} />

      {/* Heading Section */}
      <div className="space-y-0.5 pt-0.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-bold text-[#09090B] tracking-tight">
            Departure Groups for {selectedTimeInterval.label}
          </h3>
          <button
            type="button"
            onClick={onChangeTime}
            className="text-[11px] font-bold text-[#09090B] hover:underline cursor-pointer shrink-0 ml-2"
          >
            Change time
          </button>
        </div>
        <p className="text-[10px] text-[#71717A]">
          {slotGroups.length > 0
            ? `${slotGroups.length} pool group${slotGroups.length > 1 ? 's' : ''} heading to ${destination}`
            : `No groups created yet for this slot. Create the first group below!`}
        </p>
      </div>

      {/* LIST OF GROUPS IN THIS SLOT */}
      {slotGroups.length > 0 ? (
        <div className="space-y-2.5">
          {slotGroups.map((group, idx) => {
            const memberCount = group.memberCount || group.members?.length || 1;
            const targetSeats = group.target_size || 4;
            const isFull = memberCount >= targetSeats;
            const isJoined = group.isUserJoined || group.members?.some((m) => m.user_id === currentUserId);
            const creatorName = group.members?.[0]?.profile?.display_name || 'Campus Peer';

            return (
              <div
                key={group.id}
                className={`bg-white rounded-xl border p-3 shadow-2xs space-y-2 transition-all ${
                  isJoined ? 'border-[#09090B] ring-1 ring-[#09090B]/10' : 'border-[#E4E4E7]'
                }`}
              >
                {/* Group Header & Tags */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="bg-[#09090B] text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Group {idx + 1}
                    </span>
                    <span className="text-[10px] font-bold text-[#09090B]">
                      {group.ride_type === 'cab' ? '🚕 Cab' : '🛺 Auto'}
                    </span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      isFull
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    {isFull ? `Full (${memberCount}/${targetSeats})` : `${memberCount}/${targetSeats} seats filled`}
                  </span>
                </div>

                {/* Destination & Departure details */}
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[#09090B] tracking-tight">
                      To {group.destination}
                    </h4>
                    <p className="text-[10px] text-[#71717A] flex items-center gap-1 font-medium">
                      <MapPin className="w-2.5 h-2.5 text-[#71717A]" />
                      <span>{group.pickup_point || selectedPickup}</span>
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold text-[#71717A]">
                    Created by {creatorName.split(' ')[0]}
                  </span>
                </div>

                {/* Members Avatars preview */}
                <div className="bg-[#F4F4F5] rounded-lg p-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1.5 overflow-hidden">
                      {group.members?.slice(0, 4).map((m, mIdx) => (
                        <div
                          key={m.id || mIdx}
                          className="w-5 h-5 rounded-full bg-[#09090B] text-white flex items-center justify-center font-bold text-[8px] ring-1 ring-white shrink-0"
                          title={m.profile?.display_name || 'Member'}
                        >
                          {m.profile?.display_name?.charAt(0) || 'S'}
                        </div>
                      ))}
                    </div>
                    <span className="text-[10px] font-semibold text-[#09090B] truncate max-w-[170px]">
                      {group.members?.map((m) => m.profile?.display_name?.split(' ')[0] || 'Peer').join(', ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[9px] font-bold text-[#22C55E]">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Verified</span>
                  </div>
                </div>

                {/* Actions: Direct join with no modal, or Open group if already joined, or Full banner */}
                <div className="pt-0.5">
                  {isJoined ? (
                    <button
                      type="button"
                      onClick={() => onOpenRide(group)}
                      className="w-full h-8 bg-[#09090B] hover:bg-[#18181B] active:scale-[0.99] text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <span>You're in this group · Open Chat</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  ) : isFull ? (
                    <div className="w-full h-8 bg-gray-100 border border-gray-200 text-[#71717A] rounded-lg font-semibold text-xs flex items-center justify-center cursor-not-allowed">
                      Group is full (No seats available)
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onJoinRide(group)}
                      className="w-full h-8.5 bg-[#09090B] hover:bg-[#18181B] active:scale-[0.99] text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <UserPlus className="w-3 h-3" />
                      <span>Join Group Directly</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Option to create a new group beside/below existing groups in this slot */}
          <div className="pt-1">
            <button
              type="button"
              onClick={onStartNewGroup}
              className="w-full h-9 rounded-xl border border-dashed border-[#09090B]/30 bg-white hover:bg-[#F4F4F5] text-xs font-bold text-[#09090B] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create a new group in this slot</span>
            </button>
          </div>
        </div>
      ) : (
        /* Empty state if no groups exist yet in this slot */
        <div className="bg-white rounded-xl border border-[#E4E4E7] p-4 shadow-2xs space-y-3 text-center">
          <div className="w-9 h-9 rounded-lg bg-[#F4F4F5] text-[#09090B] flex items-center justify-center mx-auto">
            <Users className="w-4.5 h-4.5" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xs sm:text-sm font-bold text-[#09090B]">
              No ride groups yet for {selectedTimeInterval.label}
            </h4>
            <p className="text-[10px] text-[#71717A] max-w-xs mx-auto">
              Be the first to start a departure pool for {destination}! Other campus peers will be able to join your group.
            </p>
          </div>

          <button
            type="button"
            onClick={onStartNewGroup}
            className="w-full h-8.5 bg-[#09090B] hover:bg-[#18181B] text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-3 h-3" />
            <span>Create & Lead This Ride Group</span>
          </button>
        </div>
      )}

      {/* OTHER GROUPS LEAVING ON THIS DATE (if any) */}
      {otherGroups.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-[#E4E4E7]">
          <span className="text-[9px] font-bold text-[#71717A] uppercase tracking-wider">
            OTHER DEPARTURE GROUPS TODAY
          </span>

          <div className="space-y-2">
            {otherGroups.slice(0, 3).map((group) => {
              const mCount = group.memberCount || group.members?.length || 1;
              const tSeats = group.target_size || 4;
              const isGroupFull = mCount >= tSeats;
              const isJoined = group.isUserJoined || group.members?.some((m) => m.user_id === currentUserId);

              return (
                <div
                  key={group.id}
                  className="bg-white rounded-xl border border-[#E4E4E7] p-2.5 shadow-2xs flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#09090B]">
                        {group.start_time.slice(0, 5)} {parseInt(group.start_time) >= 12 ? 'PM' : 'AM'}
                      </span>
                      <span className="text-[9px] font-semibold text-[#71717A]">
                        {group.destination}
                      </span>
                    </div>
                    <p className="text-[9px] text-[#71717A]">
                      {mCount}/{tSeats} seats · {group.ride_type === 'cab' ? 'Cab' : 'Auto'}
                    </p>
                  </div>

                  {isJoined ? (
                    <button
                      type="button"
                      onClick={() => onOpenRide(group)}
                      className="h-7 px-2.5 rounded-lg bg-[#09090B] text-white text-[10px] font-bold cursor-pointer"
                    >
                      Open Chat
                    </button>
                  ) : isGroupFull ? (
                    <span className="text-[10px] font-semibold text-[#71717A] bg-gray-100 px-2 py-1 rounded">
                      Full
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onJoinRide(group)}
                      className="h-7 px-2.5 rounded-lg border border-[#09090B] bg-white text-[#09090B] hover:bg-[#09090B] hover:text-white text-[10px] font-bold cursor-pointer transition-colors"
                    >
                      Join
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
