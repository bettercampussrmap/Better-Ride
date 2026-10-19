import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Clock,
  MapPin,
  Check,
  Sparkles,
  MessageSquare,
  AlertCircle,
  ChevronRight,
  Car,
  Plus,
  Minus,
} from 'lucide-react';
import { SlotWithDetails } from '../../types/database';
import { formatTime12, getTodayISTDateString, getOffsetISTDateString } from '../../lib/date-utils';
import { CAMPUS_DESTINATIONS, CAMPUS_PICKUP_POINTS, PREDEFINED_INTERVALS, MAX_GROUP_MEMBERS } from '../../lib/constants';

export interface RideActionOptions {
  slotId?: string;
  destination: string;
  departureDate: string;
  startTime: string;
  endTime: string;
  pickupPoint: string;
  pickupNote: string;
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
  initialPickup?: string;
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
  initialDestination = 'Mangalagiri',
  initialDate,
  initialTimeInterval,
  initialPickup = 'SRM AP Gate 3',
  onConfirm,
  onConfirmJoin,
  isSubmitting = false,
  isJoining = false,
  existingJoinedSlot,
}) => {
  const isCreate = mode === 'create' || !slot;
  const isPending = isSubmitting || isJoining;

  // Form state
  const [destination, setDestination] = useState(slot?.destination || initialDestination);
  const [departureDate, setDepartureDate] = useState(
    slot?.departure_date || initialDate || getTodayISTDateString()
  );
  const [startTime, setStartTime] = useState(
    slot?.start_time || initialTimeInterval?.startTime || '10:00:00'
  );
  const [endTime, setEndTime] = useState(
    slot?.end_time || initialTimeInterval?.endTime || '10:30:00'
  );
  const [pickupPoint, setPickupPoint] = useState(
    slot?.pickup_point || initialPickup || 'SRM AP Gate 3'
  );
  const [pickupNote, setPickupNote] = useState(slot?.members?.[0]?.pickup_note || '');
  const [targetSize, setTargetSize] = useState<number>(() => {
    if (slot?.target_size) return Math.min(MAX_GROUP_MEMBERS, Math.max(2, slot.target_size));
    return 4;
  });
  const [ridePref, setRidePref] = useState<string>(slot?.ride_type || 'auto');

  // Sync state whenever modal opens or slot changes
  useEffect(() => {
    if (slot) {
      setDestination(slot.destination);
      setDepartureDate(slot.departure_date);
      setStartTime(slot.start_time);
      setEndTime(slot.end_time);
      setPickupPoint(slot.pickup_point || 'SRM AP Gate 3');
      setTargetSize(Math.min(MAX_GROUP_MEMBERS, Math.max(2, slot.target_size || 4)));
    } else {
      if (initialDestination) setDestination(initialDestination);
      if (initialDate) setDepartureDate(initialDate);
      if (initialTimeInterval) {
        setStartTime(initialTimeInterval.startTime);
        setEndTime(initialTimeInterval.endTime);
      }
      if (initialPickup) setPickupPoint(initialPickup);
    }
  }, [slot, initialDestination, initialDate, initialTimeInterval, initialPickup, isOpen]);

  if (!isOpen) return null;

  const quickLandmarks = [
    'Gate 3 Security Cabin',
    'Near Campus ATM',
    'Hostel Gate',
    'Admin Block',
  ];

  const allowedSizes = [3, 4, 6, 8, 10, 12];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalSize = Math.min(MAX_GROUP_MEMBERS, Math.max(2, targetSize));
    if (onConfirm) {
      await onConfirm({
        slotId: slot?.id,
        destination,
        departureDate,
        startTime,
        endTime,
        pickupPoint,
        pickupNote: pickupNote.trim(),
        targetSize: finalSize,
        ridePref,
      });
    } else if (onConfirmJoin) {
      await onConfirmJoin({
        targetSize: finalSize,
        pickupNote: pickupNote.trim(),
      });
    }
  };

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white w-full max-w-[400px] rounded-2xl shadow-xl border border-[#E4E4E7] max-h-[90vh] flex flex-col overflow-hidden text-[#09090B] animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header - Compact */}
        <div className="px-4 py-3 border-b border-[#E4E4E7] flex items-center justify-between shrink-0 bg-[#FAFAF8]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#09090B] text-white flex items-center justify-center font-bold text-xs shrink-0">
              {isCreate ? <Plus className="w-4 h-4" /> : <Users className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#09090B] tracking-tight">
                {isCreate ? 'Create Ride Group' : 'Join for a Ride'}
              </h3>
              <p className="text-[10px] text-[#71717A]">
                {isCreate ? 'Set up options & invite peers' : `Group: ${destination}`}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-3.5 text-xs">
          {/* Destination */}
          <div>
            <label className="block text-[11px] font-bold text-[#09090B] mb-1">
              Destination
            </label>
            {isCreate ? (
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
            ) : (
              <div className="px-3 py-2 rounded-xl bg-[#F4F4F5] border border-[#E4E4E7] font-bold text-[#09090B] flex items-center justify-between">
                <span>{destination}</span>
                <span className="text-[10px] text-[#71717A] font-medium">{slot?.departure_date}</span>
              </div>
            )}
          </div>

          {/* Date & Time if creating */}
          {isCreate && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-[#09090B] mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={departureDate}
                  min={getTodayISTDateString()}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-[#F4F4F5] border border-transparent focus:border-[#09090B] focus:bg-white text-xs font-medium text-[#09090B] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#09090B] mb-1">
                  Departure Time
                </label>
                <select
                  value={startTime}
                  onChange={(e) => handleTimeSelect(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-[#F4F4F5] border border-transparent focus:border-[#09090B] focus:bg-white text-xs font-medium text-[#09090B] outline-none"
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

          {/* Group Member Limit (Maximum 12 members) */}
          <div className="space-y-1.5 bg-[#F4F4F5] p-3 rounded-xl border border-[#E4E4E7]">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#09090B] block">
                  Member Limit (Max 12)
                </span>
                <span className="text-[10px] text-[#71717A]">
                  Capacity limit for this pool: up to {MAX_GROUP_MEMBERS} members
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTargetSize((prev) => Math.max(2, prev - 1))}
                  disabled={targetSize <= 2}
                  className="w-6 h-6 rounded-lg bg-white border border-[#E4E4E7] hover:bg-gray-100 flex items-center justify-center text-[#09090B] disabled:opacity-40 cursor-pointer"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-6 text-center font-extrabold text-sm text-[#09090B]">
                  {targetSize}
                </span>
                <button
                  type="button"
                  onClick={() => setTargetSize((prev) => Math.min(MAX_GROUP_MEMBERS, prev + 1))}
                  disabled={targetSize >= MAX_GROUP_MEMBERS}
                  className="w-6 h-6 rounded-lg bg-white border border-[#E4E4E7] hover:bg-gray-100 flex items-center justify-center text-[#09090B] disabled:opacity-40 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Quick chips for sizes up to 12 */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {allowedSizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTargetSize(s)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                    targetSize === s
                      ? 'bg-[#09090B] text-white border-[#09090B]'
                      : 'bg-white text-[#71717A] border-[#E4E4E7] hover:text-[#09090B]'
                  }`}
                >
                  {s} seats {s === 12 ? '(Max)' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Vehicle / Ride Preference */}
          <div>
            <label className="block text-[11px] font-bold text-[#09090B] mb-1">
              Vehicle Preference
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'auto', label: '🛺 Auto' },
                { id: 'cab', label: '🚕 Cab' },
                { id: 'shuttle', label: '🚐 Van' },
                { id: 'any', label: '✨ Any' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setRidePref(opt.id)}
                  className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border text-center transition-all cursor-pointer ${
                    ridePref === opt.id
                      ? 'bg-[#09090B] text-white border-[#09090B]'
                      : 'bg-[#F4F4F5] text-[#71717A] border-transparent hover:border-[#E4E4E7]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Luggage / Ride Note */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-[#09090B]">
              Luggage / Ride Note (Optional)
            </label>

            {/* Quick landmark chips */}
            <div className="flex flex-wrap gap-1 pt-0.5">
              {quickLandmarks.map((lm) => (
                <button
                  key={lm}
                  type="button"
                  onClick={() => setPickupNote(lm)}
                  className={`px-2 py-0.5 rounded-md text-[9px] font-medium transition-colors cursor-pointer ${
                    pickupNote === lm
                      ? 'bg-[#09090B] text-white'
                      : 'bg-[#F4F4F5] text-[#71717A] hover:bg-[#E4E4E7]'
                  }`}
                >
                  {lm}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={pickupNote}
              onChange={(e) => setPickupNote(e.target.value)}
              placeholder="Landmark or luggage note (e.g. 1 trolley, at gate)"
              maxLength={80}
              className="w-full px-3 py-1.5 rounded-xl bg-[#F4F4F5] border border-transparent focus:border-[#09090B] focus:bg-white text-xs font-medium text-[#09090B] placeholder:text-[#A1A1AA] outline-none"
            />
          </div>

          {/* Actions - Compact button */}
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
                  <span>
                    {isCreate ? 'Create & Open Ride Group' : 'Confirm & Join for a Ride'}
                  </span>
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
