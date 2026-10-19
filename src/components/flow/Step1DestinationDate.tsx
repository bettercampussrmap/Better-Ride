import React, { useState } from 'react';
import { ArrowLeft, MapPin, Calendar, Check, ArrowRight } from 'lucide-react';
import { ProgressStepper } from '../navigation/ProgressStepper';
import { CAMPUS_PICKUP_POINTS, CAMPUS_DESTINATIONS, POPULAR_STUDENT_SPOTS } from '../../lib/constants';
import { getTodayISTDateString, getOffsetISTDateString, formatDateShortPill } from '../../lib/date-utils';

interface Step1DestinationDateProps {
  destination: string;
  onDestinationChange: (dest: string) => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
  selectedPickup?: string;
  onPickupChange?: (pickup: string) => void;
  onBack: () => void;
  onProceed: () => void;
}

export const Step1DestinationDate: React.FC<Step1DestinationDateProps> = ({
  destination,
  onDestinationChange,
  selectedDate,
  onDateChange,
  selectedPickup,
  onPickupChange,
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
          onClick={() => setIsChangingDest((prev) => !prev)}
          className="text-xs font-bold text-[#09090B] hover:underline cursor-pointer"
        >
          Change
        </button>
      </div>

      {/* Progress Stepper */}
      <ProgressStepper currentStep={2} />

      {/* Destination Change Modal / Inline selector */}
      {isChangingDest && (
        <div className="bg-white rounded-xl border border-[#E4E4E7] p-3 shadow-sm space-y-2 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#09090B]">Select Destination</span>
            <button
              type="button"
              onClick={() => setIsChangingDest(false)}
              className="text-xs font-semibold text-[#71717A] hover:text-[#09090B] cursor-pointer"
            >
              Done
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
            {CAMPUS_DESTINATIONS.map((d) => {
              const isSelected = destination === d.name;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    onDestinationChange(d.name);
                    setIsChangingDest(false);
                  }}
                  className={`p-2 rounded-lg border text-left text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#09090B] text-white border-[#09090B] shadow-2xs'
                      : 'bg-[#F4F4F5] text-[#09090B] border-transparent hover:border-[#E4E4E7]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold truncate text-[11px]">{d.shortName}</span>
                    {isSelected && <span className="text-[10px] text-emerald-400 font-bold">✓</span>}
                  </div>
                  <div className={`text-[9px] ${isSelected ? 'text-white/70' : 'text-[#71717A]'}`}>
                    {d.approxDistance}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Destination Card - Compact */}
      <div className="bg-white rounded-xl border border-[#E4E4E7] p-2.5 sm:p-3 shadow-2xs flex items-center justify-between">
        <div className="space-y-0.2">
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-bold text-[#71717A] uppercase tracking-wider">
              SELECTED DESTINATION
            </span>
            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded">
              ✓ Active
            </span>
          </div>
          <h3 className="text-xs sm:text-sm font-bold text-[#09090B]">{destination}</h3>
        </div>
        <button
          type="button"
          onClick={() => setIsChangingDest(true)}
          className="px-2.5 py-1 rounded-lg border border-[#E4E4E7] bg-white text-[10px] font-bold text-[#09090B] hover:bg-[#F4F4F5] transition-colors cursor-pointer"
        >
          Change
        </button>
      </div>

      {/* When are you travelling? Section */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider">
            WHEN ARE YOU TRAVELLING?
          </span>
          <span className="text-[11px] font-semibold text-[#09090B]">
            {formatDateShortPill(selectedDate)}
          </span>
        </div>

        {/* Segmented Date Picker: Today | Tomorrow | Select date */}
        <div className="grid grid-cols-3 gap-1.5 bg-[#F4F4F5] p-1 rounded-xl">
          <button
            type="button"
            onClick={() => onDateChange(todayStr)}
            className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
              isToday
                ? 'bg-[#09090B] text-white shadow-xs'
                : 'text-[#71717A] hover:text-[#09090B]'
            }`}
          >
            {isToday && <Check className="w-3 h-3" />}
            <span>Today</span>
          </button>

          <button
            type="button"
            onClick={() => onDateChange(tomorrowStr)}
            className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
              isTomorrow
                ? 'bg-[#09090B] text-white shadow-xs'
                : 'text-[#71717A] hover:text-[#09090B]'
            }`}
          >
            {isTomorrow && <Check className="w-3 h-3" />}
            <span>Tomorrow</span>
          </button>

          <button
            type="button"
            onClick={() => setCustomDateOpen((prev) => !prev)}
            className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
              isCustom
                ? 'bg-[#09090B] text-white shadow-xs'
                : 'text-[#71717A] hover:text-[#09090B]'
            }`}
          >
            <Calendar className="w-3 h-3" />
            <span>Select date</span>
          </button>
        </div>

        {customDateOpen && (
          <div className="bg-white rounded-xl border border-[#E4E4E7] p-2.5 animate-in fade-in duration-150">
            <label className="block text-[10px] font-bold text-[#71717A] mb-1">
              Choose departure date:
            </label>
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
              className="w-full px-2.5 py-1.5 border border-[#E4E4E7] rounded-lg text-xs font-semibold text-[#09090B] outline-none"
            />
          </div>
        )}
      </div>

      {/* Choose Time Slot Button - Compact h-9.5 */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onProceed}
          className="w-full h-9.5 bg-[#09090B] hover:bg-[#18181B] active:scale-[0.99] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
        >
          <span>Choose Time Slot</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
