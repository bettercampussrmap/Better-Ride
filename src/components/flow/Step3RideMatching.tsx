import React from 'react';
import { ArrowLeft, MapPin, ShieldCheck, Plus, ArrowRight, Clock, Users, UserPlus } from 'lucide-react';
import { ProgressStepper } from '../navigation/ProgressStepper';
import { IntervalDefinition } from '../../lib/constants';
import { SlotWithDetails } from '../../types/database';

interface Step3RideMatchingProps {
  destination: string;
  selectedDate: string;
  selectedPickup: string;
  selectedTimeInterval: IntervalDefinition;
  bestMatchRide: SlotWithDetails | null;
  otherGroups: SlotWithDetails[];
  isUserInRide: boolean;
  onJoinRide: (ride?: SlotWithDetails) => void;
  onOpenRide: (ride: SlotWithDetails) => void;
  onStartNewGroup: () => void;
  onChangeTime: () => void;
  onBack: () => void;
}

export const Step3RideMatching: React.FC<Step3RideMatchingProps> = ({
  destination,
  selectedDate,
  selectedPickup,
  selectedTimeInterval,
  bestMatchRide,
  otherGroups,
  isUserInRide,
  onJoinRide,
  onOpenRide,
  onStartNewGroup,
  onChangeTime,
  onBack,
}) => {
  return (
    <div className="space-y-3 animate-in fade-in duration-150">
      {/* Subheader bar - Compact */}
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
          <p className="text-[10px] font-medium text-[#71717A]">{selectedDate} · SRM</p>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="text-xs font-bold text-[#09090B] hover:underline cursor-pointer"
        >
          Change
        </button>
      </div>

      {/* Progress Stepper */}
      <ProgressStepper currentStep={4} />

      {/* Heading Section */}
      <div className="space-y-0.5 pt-0.5">
        <h3 className="text-sm sm:text-base font-bold text-[#09090B] tracking-tight">
          People going your way
        </h3>
        <div className="flex items-center justify-between text-[11px] text-[#71717A] font-medium">
          <div>
            <p>{destination} · {selectedTimeInterval.label}</p>
            <p>Pickup: {selectedPickup}</p>
          </div>
          <button
            type="button"
            onClick={onChangeTime}
            className="text-xs font-bold text-[#09090B] hover:underline cursor-pointer shrink-0 ml-2"
          >
            Change time
          </button>
        </div>
      </div>

      {/* BEST MATCH CARD OR CREATE NEW GROUP CARD - Compact */}
      {bestMatchRide ? (
        <div className="bg-white rounded-xl border-2 border-[#09090B] p-3.5 shadow-xs space-y-3">
          {/* Match score & Date */}
          <div className="flex items-center justify-between">
            <span className="bg-[#09090B] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
              Best Match · Active Group
            </span>
            <span className="text-[11px] text-[#71717A] font-medium">{selectedDate}</span>
          </div>

          {/* Destination & Approx Departure */}
          <div>
            <h4 className="text-base font-extrabold text-[#09090B] tracking-tight">
              {destination}
            </h4>
            <p className="text-[11px] text-[#71717A] font-medium">
              Leaving around {bestMatchRide.start_time.slice(0, 5)} {parseInt(bestMatchRide.start_time) >= 12 ? 'PM' : 'AM'}
            </p>
          </div>

          {/* Passenger preview card */}
          <div className="bg-[#F4F4F5] rounded-lg p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#09090B] text-white flex items-center justify-center font-bold text-xs shrink-0">
                {bestMatchRide.members[0]?.profile?.display_name?.charAt(0) || 'S'}
              </div>
              <div>
                <p className="text-xs font-bold text-[#09090B]">
                  {bestMatchRide.memberCount} student{bestMatchRide.memberCount > 1 ? 's' : ''} joined
                </p>
                <p className="text-[10px] text-[#71717A]">
                  {bestMatchRide.members[0]?.profile?.display_name || 'Campus Peer'}
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-white text-[11px] font-bold text-[#09090B] border border-[#E4E4E7]">
              {bestMatchRide.memberCount}/{bestMatchRide.target_size || 4} seats
            </span>
          </div>

          {/* Location & Verified Group */}
          <div className="flex items-center justify-between text-[11px] pt-0.5">
            <span className="flex items-center gap-1 text-[#09090B] font-semibold">
              <MapPin className="w-3 h-3 text-[#71717A]" />
              <span className="truncate max-w-[170px]">{bestMatchRide.pickup_point || selectedPickup}</span>
            </span>
            <span className="font-semibold text-[#09090B] flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-[#22C55E]" />
              <span>Verified group</span>
            </span>
          </div>

          {/* Primary Action Button - Compact h-9.5 */}
          {bestMatchRide.isUserJoined ? (
            <button
              type="button"
              onClick={() => onOpenRide(bestMatchRide)}
              className="w-full h-9.5 bg-[#09090B] hover:bg-[#18181B] active:scale-[0.99] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <span>You're in this ride · Open Group</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onJoinRide(bestMatchRide)}
              className="w-full h-9.5 bg-[#09090B] hover:bg-[#18181B] active:scale-[0.99] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Join for a ride</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E4E4E7] p-4 shadow-2xs space-y-3 text-center">
          <div className="w-10 h-10 rounded-xl bg-[#F4F4F5] text-[#09090B] flex items-center justify-center mx-auto">
            <Users className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-[#09090B]">
              No ride groups yet for {selectedTimeInterval.label}
            </h4>
            <p className="text-[11px] text-[#71717A] max-w-xs mx-auto">
              Start this departure group and invite campus peers heading toward {destination}.
            </p>
          </div>

          <button
            type="button"
            onClick={onStartNewGroup}
            className="w-full h-9.5 bg-[#09090B] hover:bg-[#18181B] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create & Join Ride Group</span>
          </button>
        </div>
      )}

      {/* OTHER GROUPS LEAVING AROUND THIS TIME */}
      {otherGroups.length > 0 && (
        <div className="space-y-2 pt-1">
          <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider">
            OTHER GROUPS LEAVING TODAY
          </span>

          <div className="space-y-2">
            {otherGroups.map((group) => (
              <div
                key={group.id}
                className="bg-white rounded-xl border border-[#E4E4E7] p-3 shadow-2xs space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="bg-[#09090B] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase">
                      Active
                    </span>
                    <span className="text-xs font-bold text-[#09090B]">
                      {group.start_time.slice(0, 5)} – {group.end_time.slice(0, 5)}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-[#09090B]">
                    {group.memberCount}/{group.target_size || 4} seats
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#71717A]">
                  <span className="flex items-center gap-1 font-medium truncate max-w-[180px]">
                    <MapPin className="w-3 h-3" />
                    <span>{group.pickup_point || selectedPickup}</span>
                  </span>
                  <span className="font-semibold text-[#09090B]">
                    {group.destination}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => onOpenRide(group)}
                    className="h-8 rounded-lg border border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] text-xs font-bold text-[#09090B] transition-colors cursor-pointer flex items-center justify-center"
                  >
                    View Group
                  </button>
                  <button
                    type="button"
                    onClick={() => onJoinRide(group)}
                    className="h-8 rounded-lg bg-[#09090B] hover:bg-[#18181B] text-xs font-bold text-white transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>Join</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Secondary Action: Start another ride group */}
      {bestMatchRide && (
        <div className="pt-0.5">
          <button
            type="button"
            onClick={onStartNewGroup}
            className="w-full h-9 rounded-xl border border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] text-xs font-bold text-[#09090B] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create another ride group instead</span>
          </button>
        </div>
      )}
    </div>
  );
};
