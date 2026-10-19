import React, { useState } from 'react';
import { ArrowLeft, ChevronRight, Calendar, Check, Clock } from 'lucide-react';
import { ProgressStepper } from '../navigation/ProgressStepper';
import {
  PREDEFINED_INTERVALS,
  IntervalDefinition,
  CAMPUS_DESTINATIONS,
} from '../../lib/constants';
import { SlotWithDetails } from '../../types/database';
import {
  getTodayISTDateString,
  getOffsetISTDateString,
  formatDateShortPill,
} from '../../lib/date-utils';

interface Step2TimeSelectionProps {
  destination: string;
  onDestinationChange?: (dest: string) => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
  selectedTimeInterval: IntervalDefinition;
  onSelectInterval: (interval: IntervalDefinition) => void;
  existingSlots: SlotWithDetails[];
  onBack: () => void;
  onProceed: () => void;
}

export const Step2TimeSelection: React.FC<Step2TimeSelectionProps> = ({
  destination,
  onDestinationChange,
  selectedDate,
  onDateChange,
  selectedTimeInterval,
  onSelectInterval,
  existingSlots,
  onBack,
  onProceed,
}) => {
  const [isChangingDest, setIsChangingDest] = useState(false);
  const [customDateOpen, setCustomDateOpen] = useState(false);

  const todayStr = getTodayISTDateString();
  const tomorrowStr = getOffsetISTDateString(1);

  const isToday = selectedDate === todayStr;
  const isTomorrow = selectedDate === tomorrowStr;
  const isCustom = !isToday && !isTomorrow;

  // Filter daytime and evening intervals from 6 AM to 11:30 PM
  const intervals = PREDEFINED_INTERVALS.filter((interval) => {
    const hour = parseInt(interval.startTime.split(':')[0], 10);
    return hour >= 6 && hour <= 23;
  });

  const getDemandForInterval = (interval: IntervalDefinition) => {
    const matchingSlot = existingSlots.find(
      (s) =>
        s.departure_date === selectedDate &&
        s.destination.toLowerCase() === destination.toLowerCase() &&
        s.start_time.slice(0, 5) === interval.startTime.slice(0, 5)
    );

    if (matchingSlot && matchingSlot.memberCount > 0) {
      return `${matchingSlot.memberCount} student${
        matchingSlot.memberCount > 1 ? 's' : ''
      } in waiting list`;
    }

    return 'No students yet';
  };

  const handleSlotClick = (interval: IntervalDefinition) => {
    onSelectInterval(interval);
    setTimeout(() => {
      onProceed();
    }, 120);
  };

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
          <p className="text-[10px] font-medium text-[#71717A]">
            {formatDateShortPill(selectedDate)} · SRM AP Gate 3
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsChangingDest((prev) => !prev)}
          className="text-xs font-bold text-[#09090B] hover:underline cursor-pointer"
        >
          {isChangingDest ? 'Close' : 'Change'}
        </button>
      </div>

      {/* Progress Stepper */}
      <ProgressStepper currentStep={2} />

      {/* Inline Destination Switcher (if user clicked 'Change') */}
      {isChangingDest && (
        <div className="bg-white rounded-xl border border-[#E4E4E7] p-3 shadow-sm space-y-2 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#09090B]">Choose Destination</span>
            <button
              type="button"
              onClick={() => setIsChangingDest(false)}
              className="text-xs font-semibold text-[#71717A] hover:text-[#09090B]"
            >
              Done
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {CAMPUS_DESTINATIONS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  onDestinationChange?.(d.name);
                  setIsChangingDest(false);
                }}
                className={`p-2 rounded-lg border text-left text-xs font-semibold transition-all cursor-pointer ${
                  destination === d.name
                    ? 'bg-[#09090B] text-white border-[#09090B]'
                    : 'bg-[#F4F4F5] text-[#09090B] border-transparent hover:border-[#E4E4E7]'
                }`}
              >
                <div className="font-bold truncate text-[11px]">{d.name}</div>
                <div
                  className={`text-[9px] ${
                    destination === d.name ? 'text-white/70' : 'text-[#71717A]'
                  }`}
                >
                  {d.approxDistance}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 1. DATE SELECTION SECTION (Compiled inside Time Slot selection page) */}
      <div className="bg-white rounded-xl border border-[#E4E4E7] p-3 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider">
            DEPARTURE DATE
          </span>
          <span className="text-[11px] font-bold text-[#09090B]">
            {formatDateShortPill(selectedDate)}
          </span>
        </div>

        {/* Segmented Date Picker: Today | Tomorrow | Select Date */}
        <div className="grid grid-cols-3 gap-1 bg-[#F4F4F5] p-1 rounded-xl">
          <button
            type="button"
            onClick={() => {
              onDateChange(todayStr);
              setCustomDateOpen(false);
            }}
            className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
              isToday && !customDateOpen
                ? 'bg-[#09090B] text-white shadow-xs'
                : 'text-[#71717A] hover:text-[#09090B]'
            }`}
          >
            {isToday && !customDateOpen && <Check className="w-3 h-3" />}
            <span>Today</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onDateChange(tomorrowStr);
              setCustomDateOpen(false);
            }}
            className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
              isTomorrow && !customDateOpen
                ? 'bg-[#09090B] text-white shadow-xs'
                : 'text-[#71717A] hover:text-[#09090B]'
            }`}
          >
            {isTomorrow && !customDateOpen && <Check className="w-3 h-3" />}
            <span>Tomorrow</span>
          </button>

          <button
            type="button"
            onClick={() => setCustomDateOpen((prev) => !prev)}
            className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
              isCustom || customDateOpen
                ? 'bg-[#09090B] text-white shadow-xs'
                : 'text-[#71717A] hover:text-[#09090B]'
            }`}
          >
            <Calendar className="w-3 h-3" />
            <span>Select date</span>
          </button>
        </div>

        {customDateOpen && (
          <div className="pt-1">
            <input
              type="date"
              value={selectedDate}
              min={todayStr}
              onChange={(e) => {
                if (e.target.value) {
                  onDateChange(e.target.value);
                  setCustomDateOpen(false);
                }
              }}
              className="w-full px-2.5 py-1.5 border border-[#E4E4E7] rounded-lg text-xs font-semibold text-[#09090B] outline-none bg-white"
            />
          </div>
        )}
      </div>

      {/* 2. TIME SLOT SELECTION SECTION */}
      <div className="space-y-1.5 pt-0.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-bold text-[#09090B] tracking-tight">
            Select Departure Time Window
          </h3>
          <span className="bg-[#F4F4F5] border border-[#E4E4E7] text-[#09090B] text-[9px] font-black tracking-wider px-2 py-0.5 rounded-full uppercase">
            LIVE DEMAND
          </span>
        </div>
        <p className="text-[10px] text-[#71717A]">
          Choose a 30-minute interval to find or create matching ride pools
        </p>
      </div>

      {/* List of 30-minute departure slots */}
      <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-0.5">
        {intervals.map((interval) => {
          const isSelected = selectedTimeInterval.startTime === interval.startTime;
          const demandText = getDemandForInterval(interval);
          const hasStudents = demandText !== 'No students yet';

          return (
            <button
              key={interval.startTime}
              type="button"
              onClick={() => handleSlotClick(interval)}
              className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                isSelected
                  ? 'bg-[#09090B] text-white border-[#09090B] shadow-xs'
                  : 'bg-white text-[#09090B] border-[#E4E4E7] hover:border-[#09090B]/40 shadow-2xs'
              }`}
            >
              <div className="space-y-0.5">
                <div className="text-xs font-bold tracking-tight flex items-center gap-1.5">
                  <Clock className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-[#71717A]'}`} />
                  <span>{interval.label}</span>
                </div>
                <div
                  className={`text-[10px] flex items-center gap-1 font-medium ${
                    isSelected
                      ? 'text-white/80'
                      : hasStudents
                      ? 'text-emerald-600 font-semibold'
                      : 'text-[#A1A1AA]'
                  }`}
                >
                  {hasStudents && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                  <span>{demandText}</span>
                </div>
              </div>

              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-[#F4F4F5] text-[#71717A]'
                }`}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
