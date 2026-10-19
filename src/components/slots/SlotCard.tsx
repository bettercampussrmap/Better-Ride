import React from 'react';
import {
  Users,
  MessageSquare,
  CheckCircle,
  LogIn,
  LogOut,
  Sparkles,
  Car,
} from 'lucide-react';
import { SlotWithDetails } from '../../types/database';
import { formatTime12 } from '../../lib/date-utils';

interface SlotCardProps {
  slot: SlotWithDetails;
  currentUserId: string;
  isJoining: boolean;
  onJoin: (slot: SlotWithDetails) => void;
  onLeave: (slot: SlotWithDetails) => void;
  onOpenChat: (slot: SlotWithDetails) => void;
  hasOtherSlotJoined?: boolean;
}

export const SlotCard: React.FC<SlotCardProps> = ({
  slot,
  currentUserId,
  isJoining,
  onJoin,
  onLeave,
  onOpenChat,
  hasOtherSlotJoined = false,
}) => {
  const isJoined = slot.isUserJoined;
  const memberCount = slot.memberCount;
  const timeDisplay = `${formatTime12(slot.start_time)} – ${formatTime12(slot.end_time)}`;

  // Find preferred group size if set by first member
  const groupTargetSize = slot.members[0]?.target_size || 4;

  return (
    <div
      className={`rounded-2xl transition-all duration-200 border flex flex-col justify-between overflow-hidden ${
        isJoined
          ? 'bg-[#FFFEFA] border-[#245C3A] ring-2 ring-[#245C3A]/25 shadow-md'
          : memberCount > 0
          ? 'bg-[#FFFEFA] border-[#245C3A]/30 hover:border-[#245C3A]/60 shadow-xs hover:shadow-sm'
          : 'bg-[#FFFEFA]/90 border-gray-200 hover:border-gray-300 shadow-2xs'
      }`}
    >
      {/* Card Header */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2 mb-2.5">
          {/* Time range */}
          <div>
            <h4 className="text-base sm:text-lg font-bold text-[#183F2A] tracking-tight">
              {timeDisplay}
            </h4>
            <span className="text-[11px] text-[#245C3A] font-semibold flex items-center gap-1">
              To {slot.destination}
            </span>
          </div>

          {/* Joined Badge */}
          {isJoined && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#183F2A] text-[#FFFEFA] shrink-0 shadow-xs">
              <CheckCircle className="w-3.5 h-3.5 text-[#E6A15A]" />
              Joined
            </span>
          )}
        </div>

        {/* Member Status & Count */}
        <div className="mt-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-medium">
            <Users className={`w-4 h-4 ${memberCount > 0 ? 'text-[#245C3A]' : 'text-gray-400'}`} />
            {memberCount > 0 ? (
              <span className="font-semibold text-[#183F2A]">
                {memberCount} {memberCount === 1 ? 'student' : 'students'} joined
              </span>
            ) : (
              <span className="text-[#737B73] italic">No group yet • Be first</span>
            )}
          </div>

          {/* Group Capacity Indicator */}
          {memberCount > 0 && (
            <span className="text-[10px] text-[#245C3A] font-semibold bg-[#F1F7F0] px-2 py-0.5 rounded-md">
              {memberCount < groupTargetSize
                ? `${groupTargetSize - memberCount} spots left`
                : 'Group Full'}
            </span>
          )}
        </div>

        {/* Member Avatars Preview */}
        {memberCount > 0 ? (
          <div className="mt-3.5 pt-3 border-t border-gray-100 flex items-center gap-2">
            <div className="flex -space-x-2 overflow-hidden shrink-0">
              {slot.members.slice(0, 5).map((m) => {
                const name = m.profile?.display_name || m.profile?.email?.split('@')[0] || 'Student';
                const avatar = m.profile?.avatar_url;
                const isMe = m.user_id === currentUserId;
                return (
                  <div
                    key={m.id}
                    title={`${name} ${isMe ? '(You)' : ''}`}
                    className="relative inline-block w-7 h-7 rounded-full ring-2 ring-white bg-[#245C3A] text-white overflow-hidden shadow-xs shrink-0"
                  >
                    {avatar ? (
                      <img src={avatar} alt={name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="w-full h-full flex items-center justify-center text-[10px] font-bold">
                        {name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* First member pickup note preview if exists */}
            <div className="text-[11px] text-[#737B73] truncate flex-1 min-w-0">
              {slot.members[0]?.pickup_note ? (
                <span className="italic truncate block">"{slot.members[0].pickup_note}"</span>
              ) : (
                <span>
                  {slot.members.slice(0, 2).map((m, idx) => (
                    <span key={m.id}>
                      {idx > 0 && ', '}
                      {m.user_id === currentUserId ? 'You' : m.profile?.display_name?.split(' ')[0] || 'Student'}
                    </span>
                  ))}
                  {slot.members.length > 2 && ` +${slot.members.length - 2} more`}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-3.5 pt-2.5 border-t border-dashed border-gray-200">
            <p className="text-[11px] text-[#737B73] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#E6A15A]" />
              Leaving around this time? Click to start a group!
            </p>
          </div>
        )}
      </div>

      {/* Card Actions Footer */}
      <div className="px-4 py-3 bg-[#F1F7F0]/60 border-t border-[#245C3A]/10 flex items-center justify-between gap-2 mt-auto">
        {isJoined ? (
          <>
            <button
              onClick={() => onOpenChat(slot)}
              className="flex-1 py-2.5 px-3 rounded-xl bg-[#245C3A] hover:bg-[#183F2A] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Group Chat</span>
            </button>

            <button
              onClick={() => onLeave(slot)}
              disabled={isJoining}
              className="py-2.5 px-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title="Leave this time slot"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Leave</span>
            </button>
          </>
        ) : (
          <button
            onClick={() => onJoin(slot)}
            disabled={isJoining}
            className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.98] ${
              memberCount > 0
                ? 'bg-[#183F2A] hover:bg-[#245C3A] text-white shadow-xs'
                : 'bg-white hover:bg-[#183F2A] hover:text-white text-[#183F2A] border border-[#245C3A]/30 shadow-2xs'
            }`}
          >
            {isJoining ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-3.5 h-3.5" />
                <span>
                  {hasOtherSlotJoined
                    ? 'Switch to this Slot'
                    : memberCount > 0
                    ? `Join Group (${memberCount})`
                    : 'Start Ride Group'}
                </span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
