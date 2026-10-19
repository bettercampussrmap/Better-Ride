import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Clock,
  Calendar,
  Lock,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { SlotWithDetails } from '../../types/database';
import {
  formatTime12,
  getTodayISTDateString,
  getOffsetISTDateString,
  formatDateShortPill,
} from '../../lib/date-utils';
import {
  CAMPUS_DESTINATIONS,
  PREDEFINED_INTERVALS,
} from '../../lib/constants';

export interface RideActionOptions {
  slotId?: string;
  destination: string;
  departureDate: string;
  startTime: string;
  endTime: string;
  targetSize: number;
  ridePref: string;
}

interface JoinGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'join' | 'create';
  slot?: SlotWithDetails | null;
  initialDestination?: string;
  initialDate?: string;
  initialTimeInterval?: { startTime: string; endTime: string };
  onConfirm?: (options: RideActionOptions) => Promise<void>;
  onConfirmJoin?: (options: { targetSize: number; pickupNote: string }) => Promise<void>;
  isSubmitting?: boolean;
  isJoining?: boolean;
  existingJoinedSlot?: SlotWithDetails | null;
}

export const JoinGroupModal: React.FC<JoinGroupModalProps> = ({
  isOpen,
  onClose,
  mode = 'join',
  slot,
  initialDestination = 'Vijayawada',
  initialDate,
  initialTimeInterval,
  onConfirm,
  onConfirmJoin,
  isSubmitting = false,
  isJoining = false,
}) => {
  const isCreate = mode === 'create' || !slot;
  const isPending = isSubmitting || isJoining;
  const todayStr = getTodayISTDateString();
  const tomorrowStr = getOffsetISTDateString(1);

  // Form state
  const [destination, setDestination] = useState(slot?.destination || initialDestination);
  const [departureDate, setDepartureDate] = useState(
    slot?.departure_date || initialDate || todayStr
  );
  const [startTime, setStartTime] = useState(
    slot?.start_time || initialTimeInterval?.startTime || '10:00:00'
  );
  const [endTime, setEndTime] = useState(
    slot?.end_time || initialTimeInterval?.endTime || '10:30:00'
  );
  const [ridePref, setRidePref] = useState<string>(slot?.ride_type || 'auto');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Sync state whenever modal opens or slot changes
  useEffect(() => {
    if (slot) {
      setDestination(slot.destination);
      setDepartureDate(slot.departure_date);
      setStartTime(slot.start_time);
      setEndTime(slot.end_time);
      setRidePref(slot.ride_type || 'auto');
    } else {
      if (initialDestination) setDestination(initialDestination);
      if (initialDate) setDepartureDate(initialDate);
      if (initialTimeInterval) {
        setStartTime(initialTimeInterval.startTime);
        setEndTime(initialTimeInterval.endTime);
      }
    }
  }, [slot, initialDestination, initialDate, initialTimeInterval, isOpen]);

  if (!isOpen) return null;

  const handleTimeSelect = (val: string) => {
    const match = PREDEFINED_INTERVALS.find((i) => i.startTime === val);
    if (match) {
      setStartTime(match.startTime);
      setEndTime(match.endTime);
    } else {
      setStartTime(val);
      const [h, m] = val.split(':').map(Number);
      const endM = (m + 30) % 60;
      const endH = m + 30 >= 60 ? (h + 1) % 24 : h;
      const pad = (n: number) => n.toString().padStart(2, '0');
      setEndTime(`${pad(endH)}:${pad(endM)}:00`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (onConfirm) {
      await onConfirm({
        slotId: slot?.id,
        destination,
        departureDate,
        startTime,
        endTime,
        targetSize: 4,
        ridePref,
      });
    } else if (onConfirmJoin) {
      await onConfirmJoin({
        targetSize: 4,
        pickupNote: 'SRM AP Gate 3',
      });
    }
  };

  const isToday = departureDate === todayStr;
  const isTomorrow = departureDate === tomorrowStr;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white w-full max-w-[380px] rounded-2xl shadow-xl border border-[#E4E4E7] flex flex-col overflow-hidden text-[#09090B] animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-[#E4E4E7] flex items-center justify-between shrink-0 bg-[#FAFAF8]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#09090B] text-white flex items-center justify-center font-bold text-xs shrink-0">
              {isCreate ? <Plus className="w-4 h-4" /> : <Users className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#09090B] tracking-tight">
                {isCreate ? 'Create Ride Group' : 'Join Ride Pool'}
              </h3>
              <p className="text-[10px] text-[#71717A]">
                {isCreate ? 'Start a pool for your peers to join' : `Group to ${destination}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-[#EDEDF0] flex items-center justify-center text-[#71717A] hover:text-[#09090B] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
          {/* JOIN MODE: LOCKED IMMUTABLE DETAILS */}
          {!isCreate && (
            <div className="space-y-2.5">
              <div className="p-3 bg-[#F4F4F5] rounded-xl border border-[#E4E4E7] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-[#71717A] uppercase tracking-wider">
                    TARGET DESTINATION
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#71717A]">
                    <Lock className="w-3 h-3 text-[#A1A1AA]" />
                    <span>Fixed</span>
                  </span>
                </div>
                <h4 className="text-sm font-bold text-[#09090B]">{destination}</h4>

                <div className="pt-1 border-t border-[#E4E4E7] flex items-center justify-between text-[11px] text-[#71717A]">
                  <span className="flex items-center gap-1 font-semibold text-[#09090B]">
                    <Clock className="w-3.5 h-3.5 text-[#71717A]" />
                    <span>
                      {formatTime12(startTime)} – {formatTime12(endTime)}
                    </span>
                  </span>
                  <span className="font-medium">{formatDateShortPill(departureDate)}</span>
                </div>
              </div>

              {/* Waiting List status */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white border border-[#E4E4E7] shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-[#09090B]">
                    {slot?.memberCount || 1} student{(slot?.memberCount || 1) > 1 ? 's' : ''} in pool
                  </span>
                </div>
                <span className="text-[10px] font-medium text-[#71717A]">
                  Main Gate Pickup
                </span>
              </div>
            </div>
          )}

          {/* CREATE MODE: MINIMAL CLEAN INPUTS */}
          {isCreate && (
            <div className="space-y-3">
              {/* Destination Selector (6 allowed locations) */}
              <div>
                <label className="block text-[11px] font-bold text-[#09090B] mb-1">
                  Destination
                </label>
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F4F4F5] border border-transparent focus:border-[#09090B] focus:bg-white text-xs font-semibold text-[#09090B] outline-none"
                >
                  {CAMPUS_DESTINATIONS.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name} ({d.approxDistance})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Selection */}
              <div>
                <label className="block text-[11px] font-bold text-[#09090B] mb-1">
                  Departure Date
                </label>
                <div className="grid grid-cols-3 gap-1 bg-[#F4F4F5] p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setDepartureDate(todayStr);
                      setShowDatePicker(false);
                    }}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isToday && !showDatePicker
                        ? 'bg-[#09090B] text-white shadow-xs'
                        : 'text-[#71717A] hover:text-[#09090B]'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDepartureDate(tomorrowStr);
                      setShowDatePicker(false);
                    }}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isTomorrow && !showDatePicker
                        ? 'bg-[#09090B] text-white shadow-xs'
                        : 'text-[#71717A] hover:text-[#09090B]'
                    }`}
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDatePicker((prev) => !prev)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      (!isToday && !isTomorrow) || showDatePicker
                        ? 'bg-[#09090B] text-white shadow-xs'
                        : 'text-[#71717A] hover:text-[#09090B]'
                    }`}
                  >
                    <Calendar className="w-3 h-3" />
                    <span>Select</span>
                  </button>
                </div>

                {showDatePicker && (
                  <input
                    type="date"
                    value={departureDate}
                    min={todayStr}
                    onChange={(e) => {
                      if (e.target.value) {
                        setDepartureDate(e.target.value);
                        setShowDatePicker(false);
                      }
                    }}
                    className="w-full mt-1.5 px-3 py-1.5 rounded-xl bg-[#F4F4F5] border border-[#E4E4E7] text-xs font-semibold text-[#09090B] outline-none"
                  />
                )}
              </div>

              {/* Time Window Selector */}
              <div>
                <label className="block text-[11px] font-bold text-[#09090B] mb-1">
                  Departure Time Slot
                </label>
                <select
                  value={startTime}
                  onChange={(e) => handleTimeSelect(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F4F4F5] border border-transparent focus:border-[#09090B] focus:bg-white text-xs font-semibold text-[#09090B] outline-none"
                >
                  {PREDEFINED_INTERVALS.filter((i) => {
                    const h = parseInt(i.startTime.split(':')[0], 10);
                    return h >= 6 && h <= 23;
                  }).map((i) => (
                    <option key={i.startTime} value={i.startTime}>
                      {i.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Vehicle Preference (Clean 2-button toggle) */}
          <div>
            <label className="block text-[11px] font-bold text-[#09090B] mb-1">
              Vehicle Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRidePref('auto')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  ridePref === 'auto'
                    ? 'bg-[#09090B] text-white border-[#09090B] shadow-2xs'
                    : 'bg-[#F4F4F5] text-[#71717A] border-transparent hover:border-[#E4E4E7]'
                }`}
              >
                <span>🛺 Auto</span>
              </button>
              <button
                type="button"
                onClick={() => setRidePref('cab')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  ridePref === 'cab'
                    ? 'bg-[#09090B] text-white border-[#09090B] shadow-2xs'
                    : 'bg-[#F4F4F5] text-[#71717A] border-transparent hover:border-[#E4E4E7]'
                }`}
              >
                <span>🚕 Cab / Taxi</span>
              </button>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="w-full h-10 rounded-xl bg-[#09090B] hover:bg-[#18181B] active:scale-[0.99] text-white font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isPending ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isCreate ? 'Create Ride Group' : 'Join Ride Pool'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
