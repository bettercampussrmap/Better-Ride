import React, { useState } from 'react';
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
} from 'lucide-react';
import { SlotWithDetails } from '../../types/database';
import { formatTime12 } from '../../lib/date-utils';

interface JoinGroupModalProps {
  slot: SlotWithDetails;
  isOpen: boolean;
  onClose: () => void;
  onConfirmJoin: (options: {
    targetSize: number;
    pickupNote: string;
  }) => Promise<void>;
  isJoining: boolean;
  existingJoinedSlot?: SlotWithDetails | null;
}

export const JoinGroupModal: React.FC<JoinGroupModalProps> = ({
  slot,
  isOpen,
  onClose,
  onConfirmJoin,
  isJoining,
  existingJoinedSlot,
}) => {
  const isStartingNewGroup = slot.memberCount === 0;
  const isSwitching = existingJoinedSlot && existingJoinedSlot.id !== slot.id;

  // Initial group target size: preserve first member's preference if joining existing group
  const defaultTargetSize = slot.members[0]?.target_size || 4;
  const [selectedSize, setSelectedSize] = useState<number>(defaultTargetSize);
  const [pickupNote, setPickupNote] = useState<string>('');

  if (!isOpen) return null;

  const quickLandmarks = [
    'Main Gate Security Cabin',
    'Near Campus ATM',
    'Hostel 2 Gate',
    'Hostel 4 Ground',
    'Admin Block Roundabout',
  ];

  // Purely number of persons - NO prices, NO vehicle types tied to count
  const sizeOptions = [
    { count: 3, label: '3 Persons', desc: 'Up to 3 members' },
    { count: 4, label: '4 Persons', desc: 'Up to 4 members (Standard)' },
    { count: 5, label: '5 Persons', desc: 'Up to 5 members' },
    { count: 6, label: '6 Persons', desc: 'Up to 6 members' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirmJoin({
      targetSize: selectedSize,
      pickupNote: pickupNote.trim(),
    });
  };

  const timeDisplay = `${formatTime12(slot.start_time)} – ${formatTime12(slot.end_time)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Modal / Bottom Sheet Box */}
      <div className="bg-[#FFFEFA] w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-[#245C3A]/25 max-h-[92vh] sm:max-h-[85vh] flex flex-col overflow-hidden text-[#171A17] animate-in slide-in-from-bottom duration-250">
        {/* Mobile Pull Indicator */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-gray-100 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#F1F7F0] text-[#245C3A] flex items-center justify-center shrink-0">
              {isStartingNewGroup ? <Sparkles className="w-5 h-5 text-[#E6A15A]" /> : <Users className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-extrabold text-[#183F2A] tracking-tight truncate">
                {isSwitching
                  ? 'Switch Travel Group'
                  : isStartingNewGroup
                  ? 'Start a Ride Group'
                  : 'Join Departure Group'}
              </h3>
              <p className="text-[11px] text-[#737B73] truncate">
                SRM University-AP Campus Gate • {timeDisplay}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Scrollable Content */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {/* Active Single Slot Warning if User is already in another slot */}
          {isSwitching && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-2.5 text-xs">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong>Single Slot Policy:</strong> You are currently scheduled for the{' '}
                <strong>
                  {formatTime12(existingJoinedSlot.start_time)} – {formatTime12(existingJoinedSlot.end_time)}
                </strong>{' '}
                slot ({existingJoinedSlot.destination}). Confirming will automatically move you to this new slot.
              </div>
            </div>
          )}

          {/* Slot Summary Info Box */}
          <div className="p-3.5 rounded-2xl bg-[#F1F7F0] border border-[#245C3A]/15 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#183F2A]">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#245C3A]" />
                Destination: {slot.destination}
              </span>
              <span className="flex items-center gap-1 text-[#245C3A]">
                <Clock className="w-3.5 h-3.5" />
                {timeDisplay}
              </span>
            </div>
            {!isStartingNewGroup && (
              <div className="text-[11px] text-[#737B73] pt-1 border-t border-[#245C3A]/10 flex items-center gap-1.5">
                <Users className="w-3 h-3 text-[#245C3A]" />
                <span>
                  Currently <strong>{slot.memberCount} member{slot.memberCount > 1 ? 's' : ''}</strong> joined in this group.
                </span>
              </div>
            )}
          </div>

          {/* Select Number of Members */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#183F2A] uppercase tracking-wider">
              Select Number of Members
            </label>
            <p className="text-[11px] text-[#737B73]">
              Choose the group size for this departure slot.
            </p>

            <div className="grid grid-cols-2 gap-2 sm:gap-2.5 pt-1">
              {sizeOptions.map((opt) => {
                const isSelected = selectedSize === opt.count;
                return (
                  <button
                    key={opt.count}
                    type="button"
                    onClick={() => setSelectedSize(opt.count)}
                    className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer active:scale-[0.98] ${
                      isSelected
                        ? 'bg-[#183F2A] text-white border-[#183F2A] shadow-xs'
                        : 'bg-white hover:bg-[#F1F7F0] text-[#171A17] border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-extrabold text-sm flex items-center gap-1.5">
                        <Users className={`w-3.5 h-3.5 ${isSelected ? 'text-[#E6A15A]' : 'text-[#245C3A]'}`} />
                        {opt.label}
                      </span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-[#E6A15A]" />
                      )}
                    </div>
                    <span className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-[#737B73]'}`}>
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pickup Landmark / Note (Optional) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#183F2A] uppercase tracking-wider">
              Pickup Landmark or Note (Optional)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {quickLandmarks.map((lm) => (
                <button
                  key={lm}
                  type="button"
                  onClick={() => setPickupNote(lm)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                    pickupNote === lm
                      ? 'bg-[#245C3A] text-white'
                      : 'bg-gray-100 text-[#737B73] hover:bg-gray-200'
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
              placeholder="e.g. Near ATM, blue backpack"
              maxLength={100}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-gray-200 text-xs text-[#171A17] focus:outline-none focus:ring-2 focus:ring-[#245C3A]"
            />
          </div>

          {/* Group Chat Access Notice */}
          <div className="p-3 rounded-xl bg-[#F1F7F0] border border-[#245C3A]/15 flex items-start gap-2.5 text-[11px] text-[#183F2A]">
            <MessageSquare className="w-4 h-4 text-[#245C3A] shrink-0 mt-0.5" />
            <div>
              <strong>Slot Group Chat:</strong> You can plan and coordinate directly in the dedicated group chat as soon as you confirm.
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isJoining}
              className="w-full py-3.5 px-5 rounded-2xl bg-[#245C3A] hover:bg-[#183F2A] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
            >
              {isJoining ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>
                    {isSwitching
                      ? 'Switch to This Slot'
                      : isStartingNewGroup
                      ? 'Confirm & Start Group'
                      : 'Confirm & Join Group'}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
