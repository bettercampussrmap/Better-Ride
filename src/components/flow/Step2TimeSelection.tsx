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
  isRideCompleted,
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

  const handleSlotClick = (interval: IntervalDefinition, isEnded: boolean) => {
    if (isEnded) return;
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

        <div className="w-7 h-7" />
      </div>

      {/* Progress Stepper */}
      <ProgressStepper currentStep={2} />

      {/* 1. DATE SELECTION SECTION */}
      <div className="bg-white rounded-xl border border-[#E4E4E7] p-2.5 sm:p-3 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold text-[#71717A] uppercase tracking-wider">
            DEPARTURE DATE
          </span>
          <span className="text-[10px] font-bold text-[#09090B]">
            {formatDateShortPill(selectedDate)}
          </span>
        </div>

        {/* Segmented Date Picker: Today | Tomorrow | Select Date */}
        <div className="grid grid-cols-3 gap-1 bg-[#F4F4F5] p-1 rounded-lg">
          <button
            type="button"
            onClick={() => {
              onDateChange(todayStr);
              setCustomDateOpen(false);
            }}
            className={`py-1 px-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
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
            className={`py-1 px-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
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
            className={`py-1 px-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
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
      <div className="space-y-1 pt-0.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#09090B] tracking-tight">
            Select Departure Time Window
          </h3>
          <span className="bg-[#F4F4F5] border border-[#E4E4E7] text-[#09090B] text-[8px] font-black tracking-wider px-1.5 py-0.2 rounded-full uppercase">
            LIVE DEMAND
          </span>
        </div>
        <p className="text-[10px] text-[#71717A]">
          {isToday ? 'Select current or upcoming slots for departure today' : 'Choose a 30-minute interval to pool rides'}
        </p>
      </div>

      {/* List of 30-minute departure slots */}
      <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-0.5">
        {intervals.map((interval) => {
          const isSelected = selectedTimeInterval.startTime === interval.startTime;
          const demandText = getDemandForInterval(interval);
          const hasStudents = demandText !== 'No students yet';
          const isEnded = isToday && isRideCompleted(todayStr, interval.endTime);

          return (
            <button
              key={interval.startTime}
              type="button"
              disabled={isEnded}
              onClick={() => handleSlotClick(interval, isEnded)}
              className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                isEnded
                  ? 'bg-[#F4F4F5]/60 text-[#A1A1AA] border-[#E4E4E7]/60 cursor-not-allowed opacity-60'
                  : isSelected
                  ? 'bg-[#09090B] text-white border-[#09090B] shadow-xs cursor-pointer'
                  : 'bg-white text-[#09090B] border-[#E4E4E7] hover:border-[#09090B]/40 shadow-2xs cursor-pointer'
              }`}
            >
              <div className="space-y-0.5">
                <div className="text-xs font-bold tracking-tight flex items-center gap-1.5">
                  <Clock className={`w-3.5 h-3.5 ${isEnded ? 'text-[#A1A1AA]' : isSelected ? 'text-white' : 'text-[#71717A]'}`} />
                  <span>{interval.label}</span>
                  {isEnded && (
                    <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-gray-200 text-[#71717A] uppercase tracking-wide">
                      Slot Ended
                    </span>
                  )}
                </div>
                <div
                  className={`text-[10px] flex items-center gap-1 font-medium ${
                    isEnded
                      ? 'text-[#A1A1AA]'
                      : isSelected
                      ? 'text-white/80'
                      : hasStudents
                      ? 'text-emerald-600 font-semibold'
                      : 'text-[#A1A1AA]'
                  }`}
                >
                  {!isEnded && hasStudents && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                  <span>{isEnded ? 'Ride completed for this interval' : demandText}</span>
                </div>
              </div>

              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                  isEnded
                    ? 'text-[#D4D4D8]'
                    : isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-[#F4F4F5] text-[#71717A]'
                }`}
              >
                <ChevronRight className="w-3 h-3" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
