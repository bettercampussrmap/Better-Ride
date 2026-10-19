import React from 'react';
import { ArrowLeft, MapPin, ShieldCheck, Plus, ArrowRight, Clock, Users } from 'lucide-react';
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
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Subheader bar */}
      <div className="flex items-center justify-between pb-1">
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 rounded-xl border border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] flex items-center justify-center text-[#09090B] transition-colors cursor-pointer"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="text-center">
          <h2 className="text-base font-bold text-[#09090B] tracking-tight">{destination}</h2>
          <p className="text-[11px] font-medium text-[#71717A]">{selectedDate} · SRM</p>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="text-xs font-bold text-[#09090B] hover:underline cursor-pointer"
        >
          Change
        </button>
      </div>

      {/* 5-Step Progress Stepper (Step 4 active) */}
      <ProgressStepper currentStep={4} />

      {/* Heading Section */}
      <div className="space-y-1 pt-1">
        <h3 className="text-xl font-bold text-[#09090B] tracking-tight">
          People going your way
        </h3>
        <div className="flex items-center justify-between text-xs text-[#71717A] font-medium">
          <div>
            <p>{destination} · {selectedTimeInterval.label}</p>
            <p>Pickup: {selectedPickup}</p>
          </div>
          <button
            type="button"
            onClick={onChangeTime}
            className="text-xs font-bold text-[#09090B] hover:underline cursor-pointer shrink-0"
          >
            Change time
          </button>
        </div>
      </div>

      {/* BEST MATCH CARD OR CREATE NEW GROUP CARD */}
      {bestMatchRide ? (
        <div className="bg-white rounded-2xl border-2 border-[#09090B] p-4 sm:p-5 shadow-sm space-y-4">
          {/* Match score & Date */}
          <div className="flex items-center justify-between">
            <span className="bg-[#09090B] text-white text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
              Best Match · Active Group
            </span>
            <span className="text-xs text-[#71717A] font-medium">{selectedDate}</span>
          </div>

          {/* Destination & Approx Departure */}
          <div>
            <h4 className="text-xl font-extrabold text-[#09090B] tracking-tight">
              {destination}
            </h4>
            <p className="text-xs text-[#71717A] font-medium mt-0.5">
              Leaving around {bestMatchRide.start_time.slice(0, 5)} {parseInt(bestMatchRide.start_time) >= 12 ? 'PM' : 'AM'}
            </p>
          </div>

          {/* Passenger preview card */}
          <div className="bg-[#F4F4F5] rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#09090B] text-white flex items-center justify-center font-bold text-xs">
                {bestMatchRide.members[0]?.profile?.display_name?.charAt(0) || 'S'}
              </div>
              <div>
                <p className="text-xs font-bold text-[#09090B]">
                  {bestMatchRide.memberCount} student{bestMatchRide.memberCount > 1 ? 's' : ''}
                </p>
                <p className="text-[11px] text-[#71717A]">
                  {bestMatchRide.members[0]?.profile?.display_name || 'Campus Student'}
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-white text-xs font-bold text-[#09090B] border border-[#E4E4E7]">
              {bestMatchRide.memberCount}/{bestMatchRide.target_size || 4} seats
            </span>
          </div>

          {/* Location & Verified Group */}
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="flex items-center gap-1.5 text-[#09090B] font-semibold">
              <MapPin className="w-3.5 h-3.5 text-[#71717A]" />
              <span>{bestMatchRide.pickup_point || selectedPickup}</span>
            </span>
            <span className="text-xs font-semibold text-[#09090B] flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" />
              <span>Verified group</span>
            </span>
          </div>

          {/* Primary Action Button */}
          {bestMatchRide.isUserJoined ? (
            <button
              type="button"
              onClick={() => onOpenRide(bestMatchRide)}
              className="w-full h-12 bg-[#09090B] hover:bg-[#18181B] active:scale-[0.99] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <span>You're in this ride · Open Group</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onJoinRide(bestMatchRide)}
              className="w-full h-12 bg-[#09090B] hover:bg-[#18181B] active:scale-[0.99] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <span>Join this ride</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E4E4E7] p-5 shadow-2xs space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#F4F4F5] text-[#09090B] flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-[#09090B]">
              No ride groups yet for {selectedTimeInterval.label}
            </h4>
            <p className="text-xs text-[#71717A] max-w-xs mx-auto">
              Start this departure group and invite campus peers heading toward {destination}.
            </p>
          </div>

          <button
            type="button"
            onClick={onStartNewGroup}
            className="w-full h-12 bg-[#09090B] hover:bg-[#18181B] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create & Join Ride Group</span>
          </button>
        </div>
      )}

      {/* OTHER GROUPS LEAVING AROUND THIS TIME */}
      {otherGroups.length > 0 && (
        <div className="space-y-2.5 pt-2">
          <span className="text-[10px] sm:text-[11px] font-bold text-[#71717A] uppercase tracking-wider">
            OTHER GROUPS LEAVING TODAY
          </span>

          <div className="space-y-2.5">
            {otherGroups.map((group) => (
              <div
                key={group.id}
                className="bg-white rounded-2xl border border-[#E4E4E7] p-4 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="bg-[#09090B] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
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

                <div>
                  <h5 className="text-sm font-bold text-[#09090B]">{group.destination}</h5>
                </div>

                <div className="flex items-center justify-between text-xs text-[#71717A]">
                  <span className="flex items-center gap-1 font-medium">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{group.pickup_point || selectedPickup}</span>
                  </span>
                  <span className="font-semibold text-[#09090B]">
                    {group.start_time.slice(0, 5)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenRide(group)}
                  className="w-full h-10 rounded-xl border border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] text-xs font-bold text-[#09090B] transition-colors cursor-pointer flex items-center justify-center"
                >
                  Open Group
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Secondary Action: Start another ride group */}
      {bestMatchRide && (
        <div className="pt-1">
          <button
            type="button"
            onClick={onStartNewGroup}
            className="w-full h-11 rounded-xl border border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] text-xs font-bold text-[#09090B] transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Start another ride group instead</span>
          </button>
        </div>
      )}
    </div>
  );
};
