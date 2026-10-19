import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Lock,
  MapPin,
  Clock,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import { SlotWithDetails } from '../../types/database';
import {
  formatTime12,
  getTodayISTDateString,
  getOffsetISTDateString,
  formatDateShortPill,
} from '../../lib/date-utils';

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
  slot,
  initialDestination = 'Vijayawada',
  initialDate,
  initialTimeInterval,
  onConfirm,
  onConfirmJoin,
  isSubmitting = false,
  isJoining = false,
}) => {
  const isPending = isSubmitting || isJoining;
  const todayStr = getTodayISTDateString();

  // Form state - destination is permanently locked to initialDestination from Step 1
  const destination = slot?.destination || initialDestination;
  const departureDate = slot?.departure_date || initialDate || todayStr;
  const startTime = slot?.start_time || initialTimeInterval?.startTime || '10:00:00';
  const endTime = slot?.end_time || initialTimeInterval?.endTime || '10:30:00';

  const [ridePref, setRidePref] = useState<string>(slot?.ride_type || 'auto');
  const [targetSize, setTargetSize] = useState<number>(slot?.target_size || 4);

  // Sync state whenever modal opens or slot changes
  useEffect(() => {
    if (slot) {
      setRidePref(slot.ride_type || 'auto');
      setTargetSize(slot.target_size || 4);
    } else {
      setTargetSize(4);
      setRidePref('auto');
    }
  }, [slot, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (onConfirm) {
      await onConfirm({
        slotId: slot?.id,
        destination,
        departureDate,
        startTime,
        endTime,
        targetSize: Math.min(12, Math.max(2, targetSize)),
        ridePref,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white w-full max-w-[360px] rounded-2xl shadow-xl border border-[#E4E4E7] flex flex-col overflow-hidden text-[#09090B] animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-[#E4E4E7] flex items-center justify-between shrink-0 bg-[#FAFAF8]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#09090B] text-white flex items-center justify-center font-bold text-xs shrink-0">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#09090B] tracking-tight">
                Create Ride Group
              </h3>
              <p className="text-[10px] text-[#71717A]">
                Start a separate pool in this time slot
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
          {/* Location & Time locked from step 1 & 2 */}
          <div className="p-3 bg-[#F4F4F5] rounded-xl border border-[#E4E4E7] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-[#71717A] uppercase tracking-wider">
                DESTINATION & TIME WINDOW
              </span>
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#71717A] bg-gray-200 px-1.5 py-0.2 rounded">
                <Lock className="w-2.5 h-2.5 text-[#71717A]" />
                <span>Selected in Step 1</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-[#09090B]">
              <MapPin className="w-3.5 h-3.5 text-[#09090B] shrink-0" />
              <span className="truncate">{destination}</span>
            </div>

            <div className="pt-1 border-t border-[#E4E4E7]/60 flex items-center justify-between text-[10px] text-[#71717A]">
              <span className="flex items-center gap-1 font-semibold text-[#09090B]">
                <Clock className="w-3 h-3 text-[#71717A]" />
                <span>{formatTime12(startTime)} – {formatTime12(endTime)}</span>
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#71717A]" />
                <span>{formatDateShortPill(departureDate)}</span>
              </span>
            </div>
          </div>

          {/* Number of People Selection: 2, 4, 6, 8, max 12 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-[#09090B]">
                Number of People
              </label>
              <span className="text-[10px] font-semibold text-[#71717A]">
                Target: {targetSize} seats (Max 12)
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {[2, 4, 6, 8, 12].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setTargetSize(size)}
                  className={`py-1.5 px-1 rounded-lg text-xs font-bold border transition-all text-center cursor-pointer ${
                    targetSize === size
                      ? 'bg-[#09090B] text-white border-[#09090B] shadow-2xs'
                      : 'bg-[#F4F4F5] text-[#52525B] border-transparent hover:border-[#E4E4E7]'
                  }`}
                >
                  <div className="text-[11px]">{size}</div>
                  <div
                    className={`text-[8px] font-medium ${
                      targetSize === size ? 'text-white/80' : 'text-[#71717A]'
                    }`}
                  >
                    {size === 12 ? 'Max' : 'Seats'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Vehicle Preference (Auto vs Cab) */}
          <div>
            <label className="block text-[11px] font-bold text-[#09090B] mb-1">
              Vehicle Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRidePref('auto')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  ridePref === 'auto'
                    ? 'bg-[#09090B] text-white border-[#09090B] shadow-2xs'
                    : 'bg-[#F4F4F5] text-[#71717A] border-transparent hover:border-[#E4E4E7]'
                }`}
              >
                <span>🛺</span>
                <span>Auto Rickshaw</span>
              </button>

              <button
                type="button"
                onClick={() => setRidePref('cab')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  ridePref === 'cab'
                    ? 'bg-[#09090B] text-white border-[#09090B] shadow-2xs'
                    : 'bg-[#F4F4F5] text-[#71717A] border-transparent hover:border-[#E4E4E7]'
                }`}
              >
                <span>🚕</span>
                <span>Cab / Taxi</span>
              </button>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-1.5">
            <button
              type="submit"
              disabled={isPending}
              className="w-full h-9 rounded-lg bg-[#09090B] hover:bg-[#18181B] active:scale-[0.99] text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isPending ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create New Group ({targetSize} seats)</span>
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
