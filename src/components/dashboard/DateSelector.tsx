import React from 'react';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  getTodayISTDateString,
  getOffsetISTDateString,
  formatDateForDisplay,
} from '../../lib/date-utils';
import { TIME_PERIODS } from '../../lib/constants';

interface DateSelectorProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  selectedPeriod: string;
  onSelectPeriod: (period: any) => void;
  hideStepBadge?: boolean;
}

export const DateSelector: React.FC<DateSelectorProps> = ({
  selectedDate,
  onSelectDate,
  selectedPeriod,
  onSelectPeriod,
  hideStepBadge = false,
}) => {
  const todayStr = getTodayISTDateString();
  const tomorrowStr = getOffsetISTDateString(1);
  const dayAfterStr = getOffsetISTDateString(2);

  const quickDates = [
    { label: 'Today', date: todayStr },
    { label: 'Tomorrow', date: tomorrowStr },
    { label: 'Day After', date: dayAfterStr },
  ];

  const handlePrevDay = () => {
    const parts = selectedDate.split('-').map(Number);
    const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] - 1, 12, 0, 0));
    const nextStr = d.toISOString().split('T')[0];
    onSelectDate(nextStr);
  };

  const handleNextDay = () => {
    const parts = selectedDate.split('-').map(Number);
    const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + 1, 12, 0, 0));
    const nextStr = d.toISOString().split('T')[0];
    onSelectDate(nextStr);
  };

  return (
    <div className="bg-[#FFFEFA] rounded-2xl p-4 sm:p-6 border border-[#245C3A]/15 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            {!hideStepBadge && (
              <div className="w-5 h-5 rounded-full bg-[#245C3A] text-white flex items-center justify-center text-[11px] font-extrabold">
                2
              </div>
            )}
            <label className="text-xs font-bold text-[#183F2A] uppercase tracking-wider block">
              Departure Date & Time Window
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevDay}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-[#F1F7F0] text-gray-600 transition-colors cursor-pointer"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className="text-lg sm:text-xl font-bold text-[#183F2A]">
              {formatDateForDisplay(selectedDate)}
            </h3>
            <button
              onClick={handleNextDay}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-[#F1F7F0] text-gray-600 transition-colors cursor-pointer"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Date Quick Shortcuts & Native Date Picker */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {quickDates.map((q) => {
            const isSelected = selectedDate === q.date;
            return (
              <button
                key={q.label}
                onClick={() => onSelectDate(q.date)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#245C3A] text-white shadow-xs'
                    : 'bg-[#F1F7F0] hover:bg-[#245C3A]/10 text-[#183F2A] border border-[#245C3A]/15'
                }`}
              >
                {q.label}
              </button>
            );
          })}

          {/* Calendar Picker input */}
          <div className="relative inline-flex items-center">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) onSelectDate(e.target.value);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#F1F7F0] border border-[#245C3A]/15 text-[#183F2A] focus:outline-none focus:ring-2 focus:ring-[#245C3A] cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Time Period Filter Chips */}
      <div className="pt-2 border-t border-gray-100 flex items-center gap-2 overflow-x-auto pb-1">
        <Clock className="w-3.5 h-3.5 text-[#737B73] shrink-0 ml-1" />
        <span className="text-xs text-[#737B73] font-medium shrink-0 mr-1">Time of day:</span>
        {TIME_PERIODS.map((period) => {
          const isSelected = selectedPeriod === period.id;
          return (
            <button
              key={period.id}
              onClick={() => onSelectPeriod(period.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-[#183F2A] text-white font-semibold'
                  : 'bg-white hover:bg-gray-100 text-[#737B73] border border-gray-200'
              }`}
            >
              {period.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
