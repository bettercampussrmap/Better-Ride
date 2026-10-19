import React from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { ProgressStepper } from '../navigation/ProgressStepper';
import { PREDEFINED_INTERVALS, IntervalDefinition } from '../../lib/constants';
import { SlotWithDetails } from '../../types/database';

interface Step2TimeSelectionProps {
  destination: string;
  selectedDate: string;
  selectedTimeInterval: IntervalDefinition;
  onSelectInterval: (interval: IntervalDefinition) => void;
  existingSlots: SlotWithDetails[];
  onBack: () => void;
  onProceed: () => void;
}

export const Step2TimeSelection: React.FC<Step2TimeSelectionProps> = ({
  destination,
  selectedDate,
  selectedTimeInterval,
  onSelectInterval,
  existingSlots,
  onBack,
  onProceed,
}) => {
  // Common departure windows for student departures from campus (6 AM to 10 PM)
  const intervals = PREDEFINED_INTERVALS.filter((interval) => {
    const hour = parseInt(interval.startTime.split(':')[0], 10);
    return hour >= 6 && hour <= 22;
  });

  // Calculate REAL demand strictly from existing slots in database
  const getDemandForInterval = (interval: IntervalDefinition) => {
    const matchingSlot = existingSlots.find(
      (s) =>
        s.departure_date === selectedDate &&
        s.destination.toLowerCase() === destination.toLowerCase() &&
        s.start_time.slice(0, 5) === interval.startTime.slice(0, 5)
    );

    if (matchingSlot && matchingSlot.memberCount > 0) {
      return `${matchingSlot.memberCount} student${matchingSlot.memberCount > 1 ? 's' : ''} looking`;
    }

    return 'No students yet';
  };

  const handleSlotClick = (interval: IntervalDefinition) => {
    onSelectInterval(interval);
    setTimeout(() => {
      onProceed();
    }, 150);
  };

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

      {/* 5-Step Progress Stepper (Step 3 active) */}
      <ProgressStepper currentStep={3} />

      {/* Heading & Live Demand Pill */}
      <div className="space-y-1 pt-1">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-[#09090B] tracking-tight">
            When are you leaving?
          </h3>
          <span className="bg-[#F4F4F5] border border-[#E4E4E7] text-[#09090B] text-[10px] font-black tracking-wider px-2 py-0.5 rounded-full uppercase">
            LIVE DEMAND
          </span>
        </div>
        <p className="text-xs text-[#71717A] font-medium">
          Select a 30-minute departure window with live demand
        </p>
      </div>

      {/* List of 30-minute departure slots */}
      <div className="space-y-2.5 max-h-[58vh] overflow-y-auto pr-1">
        {intervals.map((interval) => {
          const isSelected = selectedTimeInterval.startTime === interval.startTime;
          const demandText = getDemandForInterval(interval);
          const hasStudents = demandText !== 'No students yet';

          return (
            <button
              key={interval.startTime}
              type="button"
              onClick={() => handleSlotClick(interval)}
              className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                isSelected
                  ? 'bg-[#09090B] text-white border-[#09090B] shadow-md scale-[1.01]'
                  : 'bg-white text-[#09090B] border-[#E4E4E7] hover:border-[#09090B]/40 shadow-2xs'
              }`}
            >
              <div className="space-y-1">
                <div className="text-base font-bold tracking-tight">
                  {interval.label}
                </div>
                <div
                  className={`text-xs flex items-center gap-1.5 font-medium ${
                    isSelected
                      ? 'text-white/80'
                      : hasStudents
                      ? 'text-[#09090B] font-semibold'
                      : 'text-[#A1A1AA]'
                  }`}
                >
                  {hasStudents && <span>👥</span>}
                  <span>{demandText}</span>
                </div>
              </div>

              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-[#F4F4F5] text-[#71717A]'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
