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
  selectedPickup: string;
  onPickupChange: (pickup: string) => void;
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
          onClick={() => setIsChangingDest((prev) => !prev)}
          className="text-xs font-bold text-[#09090B] hover:underline cursor-pointer"
        >
          Change
        </button>
      </div>

      {/* 5-Step Progress Stepper (Step 2 active) */}
      <ProgressStepper currentStep={2} />

      {/* Destination Change Modal / Inline selector */}
      {isChangingDest && (
        <div className="bg-white rounded-2xl border border-[#E4E4E7] p-4 shadow-sm space-y-3 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#09090B]">Select Destination</span>
            <button
              type="button"
              onClick={() => setIsChangingDest(false)}
              className="text-xs font-medium text-[#71717A] hover:text-[#09090B]"
            >
              Done
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {CAMPUS_DESTINATIONS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  onDestinationChange(d.name);
                  setIsChangingDest(false);
                }}
                className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                  destination === d.name
                    ? 'bg-[#09090B] text-white border-[#09090B]'
                    : 'bg-[#F4F4F5] text-[#09090B] border-transparent hover:border-[#E4E4E7]'
                }`}
              >
                <div className="font-bold truncate">{d.shortName}</div>
                <div className={`text-[10px] ${destination === d.name ? 'text-white/70' : 'text-[#71717A]'}`}>
                  {d.approxDistance}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected Destination Card */}
      <div className="bg-white rounded-2xl border border-[#E4E4E7] p-4 shadow-2xs flex items-center justify-between">
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider">
            SELECTED DESTINATION
          </span>
          <h3 className="text-lg font-bold text-[#09090B]">{destination}</h3>
        </div>
        <button
          type="button"
          onClick={() => setIsChangingDest(true)}
          className="px-3 py-1.5 rounded-lg border border-[#E4E4E7] bg-white text-xs font-bold text-[#09090B] hover:bg-[#F4F4F5] transition-colors cursor-pointer"
        >
          Change
        </button>
      </div>

      {/* When are you travelling? Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#71717A] uppercase tracking-wider">
            WHEN ARE YOU TRAVELLING?
          </span>
          <span className="text-xs font-semibold text-[#09090B]">
            {formatDateShortPill(selectedDate)}
          </span>
        </div>

        {/* Segmented Date Picker: Today | Tomorrow | Select date */}
        <div className="grid grid-cols-3 gap-2 bg-[#F4F4F5] p-1.5 rounded-xl">
          <button
            type="button"
            onClick={() => onDateChange(todayStr)}
            className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              isToday
                ? 'bg-[#09090B] text-white shadow-xs'
                : 'text-[#71717A] hover:text-[#09090B]'
            }`}
          >
            {isToday && <Check className="w-3.5 h-3.5" />}
            <span>Today</span>
          </button>

          <button
            type="button"
            onClick={() => onDateChange(tomorrowStr)}
            className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              isTomorrow
                ? 'bg-[#09090B] text-white shadow-xs'
                : 'text-[#71717A] hover:text-[#09090B]'
            }`}
          >
            {isTomorrow && <Check className="w-3.5 h-3.5" />}
            <span>Tomorrow</span>
          </button>

          <button
            type="button"
            onClick={() => setCustomDateOpen((prev) => !prev)}
            className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              isCustom
                ? 'bg-[#09090B] text-white shadow-xs'
                : 'text-[#71717A] hover:text-[#09090B]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Select date</span>
          </button>
        </div>

        {customDateOpen && (
          <div className="bg-white rounded-xl border border-[#E4E4E7] p-3 animate-in fade-in duration-150">
            <label className="block text-[11px] font-bold text-[#71717A] mb-1">
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
              className="w-full px-3 py-2 border border-[#E4E4E7] rounded-lg text-xs font-semibold text-[#09090B] outline-none"
            />
          </div>
        )}
      </div>

      {/* Campus Pickup Point Section */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#71717A] uppercase tracking-wider">
            CAMPUS PICKUP POINT
          </span>
          <span className="text-xs font-semibold text-[#09090B]">{selectedPickup}</span>
        </div>

        <div className="space-y-2">
          {CAMPUS_PICKUP_POINTS.map((point) => {
            const isSelected = selectedPickup === point.name;
            return (
              <button
                key={point.id}
                type="button"
                onClick={() => onPickupChange(point.name)}
                className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-[#09090B] text-white border-[#09090B] shadow-sm'
                    : 'bg-white text-[#09090B] border-[#E4E4E7] hover:border-[#09090B]/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-white/15 text-white' : 'bg-[#F4F4F5] text-[#71717A]'
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold tracking-tight">{point.name}</h4>
                    <p
                      className={`text-[11px] font-medium ${
                        isSelected ? 'text-white/70' : 'text-[#71717A]'
                      }`}
                    >
                      {point.description}
                    </p>
                  </div>
                </div>

                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-white text-[#09090B] flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Choose Time Slot Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onProceed}
          className="w-full h-[50px] bg-[#09090B] hover:bg-[#18181B] active:scale-[0.99] text-white rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
        >
          <span>Choose Time Slot</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
