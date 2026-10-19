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
      return `${matchingSlot.memberCount} student${matchingSlot.memberCount > 1 ? 's' : ''} looking`;
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
      <ProgressStepper currentStep={3} />

      {/* Heading & Live Demand Pill */}
      <div className="space-y-0.5 pt-0.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-bold text-[#09090B] tracking-tight">
            When are you leaving?
          </h3>
          <span className="bg-[#F4F4F5] border border-[#E4E4E7] text-[#09090B] text-[9px] font-black tracking-wider px-2 py-0.5 rounded-full uppercase">
            LIVE DEMAND
          </span>
        </div>
        <p className="text-[11px] text-[#71717A] font-medium">
          Select a 30-minute departure window
        </p>
      </div>

      {/* List of 30-minute departure slots */}
      <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
        {intervals.map((interval) => {
          const isSelected = selectedTimeInterval.startTime === interval.startTime;
          const demandText = getDemandForInterval(interval);
          const hasStudents = demandText !== 'No students yet';

          return (
            <button
              key={interval.startTime}
              type="button"
              onClick={() => handleSlotClick(interval)}
              className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                isSelected
                  ? 'bg-[#09090B] text-white border-[#09090B] shadow-xs'
                  : 'bg-white text-[#09090B] border-[#E4E4E7] hover:border-[#09090B]/40 shadow-2xs'
              }`}
            >
              <div className="space-y-0.5">
                <div className="text-xs sm:text-sm font-bold tracking-tight">
                  {interval.label}
                </div>
                <div
                  className={`text-[10px] flex items-center gap-1 font-medium ${
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
