import React from 'react';
import { Compass, Car, User } from 'lucide-react';

export type NavTab = 'home' | 'my_rides' | 'profile';

interface BottomNavigationProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  myRidesCount?: number;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentTab,
  onTabChange,
  myRidesCount = 6,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#FFFFFF] border-t border-[#E4E4E7] pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
      <div className="max-w-[480px] sm:max-w-xl mx-auto grid grid-cols-3 items-center">
        {/* Home Tab */}
        <button
          type="button"
          onClick={() => onTabChange('home')}
          className="flex flex-col items-center justify-center py-1 transition-colors cursor-pointer group"
          aria-label="Home"
        >
          <div
            className={`w-6 h-6 flex items-center justify-center transition-transform ${
              currentTab === 'home' ? 'text-[#09090B] scale-105' : 'text-[#71717A] group-hover:text-[#09090B]'
            }`}
          >
            {/* Compass / Home circle icon matching screenshot */}
            <Compass className={`w-5 h-5 ${currentTab === 'home' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          </div>
          <span
            className={`text-[11px] mt-0.5 ${
              currentTab === 'home' ? 'font-bold text-[#09090B]' : 'font-medium text-[#71717A]'
            }`}
          >
            Home
          </span>
        </button>

        {/* My Rides Tab */}
        <button
          type="button"
          onClick={() => onTabChange('my_rides')}
          className="flex flex-col items-center justify-center py-1 transition-colors cursor-pointer group relative"
          aria-label="My Rides"
        >
          <div className="relative">
            <div
              className={`w-6 h-6 flex items-center justify-center transition-transform ${
                currentTab === 'my_rides' ? 'text-[#09090B] scale-105' : 'text-[#71717A] group-hover:text-[#09090B]'
              }`}
            >
              <Car className={`w-5 h-5 ${currentTab === 'my_rides' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
            </div>
            {myRidesCount > 0 && (
              <span className="absolute -top-1.5 -right-2 px-1 min-w-4 h-4 rounded-full bg-[#09090B] text-white text-[9px] font-bold flex items-center justify-center leading-none">
                {myRidesCount}
              </span>
            )}
          </div>
          <span
            className={`text-[11px] mt-0.5 ${
              currentTab === 'my_rides' ? 'font-bold text-[#09090B]' : 'font-medium text-[#71717A]'
            }`}
          >
            My Rides
          </span>
        </button>

        {/* Profile Tab */}
        <button
          type="button"
          onClick={() => onTabChange('profile')}
          className="flex flex-col items-center justify-center py-1 transition-colors cursor-pointer group"
          aria-label="Profile"
        >
          <div
            className={`w-6 h-6 flex items-center justify-center transition-transform ${
              currentTab === 'profile' ? 'text-[#09090B] scale-105' : 'text-[#71717A] group-hover:text-[#09090B]'
            }`}
          >
            <User className={`w-5 h-5 ${currentTab === 'profile' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          </div>
          <span
            className={`text-[11px] mt-0.5 ${
              currentTab === 'profile' ? 'font-bold text-[#09090B]' : 'font-medium text-[#71717A]'
            }`}
          >
            Profile
          </span>
        </button>
      </div>
    </nav>
  );
};
