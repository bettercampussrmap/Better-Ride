import React, { useState } from 'react';
import { Header } from './Header';
import { LocationSelector } from './LocationSelector';
import { DateSelector } from './DateSelector';
import { SlotList } from '../slots/SlotList';
import { getTodayISTDateString, formatDateForDisplay } from '../../lib/date-utils';
import { DEFAULT_DESTINATION, CAMPUS_DESTINATIONS } from '../../lib/constants';
import { Profile } from '../../types/database';
import { MapPin, Navigation, Calendar, ArrowRight, ArrowLeft, Clock, Sparkles } from 'lucide-react';

interface DashboardProps {
  user: any;
  profile: Profile | null;
  onSignOut: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  profile,
  onSignOut,
}) => {
  // Navigation step state: 'location_and_date' (Step 1) | 'slots' (Step 2)
  const [step, setStep] = useState<'location_and_date' | 'slots'>('location_and_date');
  const [selectedDestination, setSelectedDestination] = useState<string>(DEFAULT_DESTINATION);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayISTDateString());
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');

  const selectedLocationObj =
    CAMPUS_DESTINATIONS.find((d) => d.name === selectedDestination) || CAMPUS_DESTINATIONS[0];

  const handleProceedToSlots = () => {
    setStep('slots');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBackToLocations = () => {
    setStep('location_and_date');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F1F7F0] text-[#171A17] selection:bg-[#245C3A] selection:text-white">
      {/* Top Navigation Bar */}
      <Header
        user={user}
        profile={profile}
        onSignOut={onSignOut}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-5 sm:py-7 space-y-6">
        {/* Campus Context Hero Badge */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#245C3A]/20 text-[#183F2A] text-xs font-bold shadow-2xs">
            <MapPin className="w-3.5 h-3.5 text-[#245C3A]" />
            <span>SRM University-AP Main Gate • Amaravati</span>
          </div>

          {/* Stepper Progress Pill */}
          <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-xs px-3 py-1 rounded-full border border-gray-200 text-xs font-semibold text-[#737B73]">
            <span
              onClick={() => setStep('location_and_date')}
              className={`cursor-pointer transition-colors ${
                step === 'location_and_date'
                  ? 'text-[#245C3A] font-bold underline underline-offset-4'
                  : 'hover:text-[#183F2A]'
              }`}
            >
              1. Location & Date
            </span>
            <span>→</span>
            <span
              className={step === 'slots' ? 'text-[#245C3A] font-bold underline underline-offset-4' : 'text-gray-400'}
            >
              2. Departure Slots
            </span>
          </div>
        </div>

        {/* STEP 1: SELECT LOCATION AND DATE */}
        {step === 'location_and_date' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Title */}
            <div className="space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#183F2A] tracking-tight">
                Where are you heading from campus?
              </h2>
              <p className="text-xs sm:text-sm text-[#737B73] font-medium max-w-2xl">
                Choose your destination and date to find students sharing an auto or cab from the Main Gate.
              </p>
            </div>

            {/* Location Cards */}
            <LocationSelector
              selectedDestination={selectedDestination}
              onSelectDestination={setSelectedDestination}
              onConfirmAndContinue={handleProceedToSlots}
            />

            {/* Date Picker Component */}
            <DateSelector
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              selectedPeriod={selectedPeriod}
              onSelectPeriod={setSelectedPeriod}
            />

            {/* ONLY ONE Confirm Button at Bottom of Page */}
            <div className="pt-2">
              <div className="p-4 sm:p-5 rounded-2xl bg-[#183F2A] text-white shadow-lg border border-[#245C3A] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 w-full sm:w-auto">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-[#E6A15A] shrink-0">
                    <Navigation className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-white/70 tracking-wider block">
                      Selected Route & Date
                    </span>
                    <h4 className="text-base sm:text-lg font-bold text-white truncate">
                      {selectedLocationObj.name}
                    </h4>
                    <span className="text-xs text-[#E6A15A] font-medium flex items-center gap-1.5 mt-0.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDateForDisplay(selectedDate)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleProceedToSlots}
                  className="w-full sm:w-auto px-7 py-4 rounded-xl bg-[#E6A15A] hover:bg-[#d8934c] text-[#183F2A] font-extrabold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-[0.98] cursor-pointer shrink-0"
                >
                  <span>Confirm & Proceed to Slot Selection</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: SELECT TIME SLOTS & GROUP CHAT */}
        {step === 'slots' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header summary of selected route */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleBackToLocations}
                  className="p-2 rounded-xl bg-[#F1F7F0] text-[#183F2A] hover:bg-[#245C3A] hover:text-white transition-colors cursor-pointer shrink-0"
                  title="Back to locations and date"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#245C3A] uppercase tracking-wider bg-[#F1F7F0] px-2 py-0.5 rounded">
                      SRM AP Gate → {selectedLocationObj.shortName}
                    </span>
                    <span className="text-xs text-[#737B73] font-medium">
                      • {selectedLocationObj.approxDistance}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-xl font-extrabold text-[#183F2A] tracking-tight mt-0.5">
                    {selectedDestination}
                  </h3>
                  <div className="text-xs text-[#737B73] font-medium flex items-center gap-1.5 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-[#245C3A]" />
                    <span>{formatDateForDisplay(selectedDate)}</span>
                  </div>
                </div>
              </div>

              {/* Quick toggle to change date or destination */}
              <button
                onClick={handleBackToLocations}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#183F2A] text-xs font-bold transition-colors cursor-pointer self-stretch sm:self-auto text-center"
              >
                Change Destination / Date
              </button>
            </div>

            {/* Time Filter Pills */}
            <div className="bg-[#FFFEFA] rounded-2xl p-4 border border-[#245C3A]/15 shadow-2xs">
              <DateSelector
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                selectedPeriod={selectedPeriod}
                onSelectPeriod={setSelectedPeriod}
                hideStepBadge={true}
              />
            </div>

            {/* Time Slots Grid with Real-Time Join & Live Internet Chat */}
            <SlotList
              selectedDestination={selectedDestination}
              selectedDate={selectedDate}
              selectedPeriod={selectedPeriod}
              currentUserId={user?.id}
              onBackToLocations={handleBackToLocations}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-[#245C3A]/10 bg-[#FFFEFA]/80 backdrop-blur-xs py-6 px-4 sm:px-8 text-center text-xs text-[#737B73] space-y-1">
        <div className="flex items-center justify-center gap-2 font-semibold text-[#183F2A]">
          <img
            src="/better-campus-logo.png"
            alt="Better Campus"
            className="w-5 h-5 rounded-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/better-campus-logo.jpg';
            }}
          />
          <span>Better Campus Community • SRM University-AP</span>
        </div>
        <p className="text-[11px] text-[#737B73]">
          Amaravati, Andhra Pradesh • bettercampus.srmap@gmail.com
        </p>
      </footer>
    </div>
  );
};
