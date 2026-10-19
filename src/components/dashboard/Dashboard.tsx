import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppHeader } from '../navigation/AppHeader';
import { BottomNavigation, NavTab } from '../navigation/BottomNavigation';
import { HomeView } from '../home/HomeView';
import { Step1DestinationDate } from '../flow/Step1DestinationDate';
import { Step2TimeSelection } from '../flow/Step2TimeSelection';
import { Step3RideMatching } from '../flow/Step3RideMatching';
import { Step4JoinedRideDetails } from '../flow/Step4JoinedRideDetails';
import { Step5GroupChat } from '../flow/Step5GroupChat';
import { MyRidesView } from '../rides/MyRidesView';
import { ProfileView } from '../profile/ProfileView';
import { Profile, SlotWithDetails } from '../../types/database';
import { getTodayISTDateString } from '../../lib/date-utils';
import {
  DEFAULT_DESTINATION,
  DEFAULT_PICKUP_POINT,
  PREDEFINED_INTERVALS,
  IntervalDefinition,
} from '../../lib/constants';
import {
  fetchAllRides,
  createAndJoinRide,
  leaveRideInSupabase,
} from '../../lib/rides-service';

interface DashboardProps {
  user: any;
  profile: Profile | null;
  onSignOut: () => void;
}

type FlowScreen =
  | 'home_main'
  | 'flow_step1'
  | 'flow_step2'
  | 'flow_step3'
  | 'flow_step4'
  | 'flow_step5';

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  profile,
  onSignOut,
}) => {
  // Navigation state
  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [flowScreen, setFlowScreen] = useState<FlowScreen>('home_main');
  const [selectedCampus, setSelectedCampus] = useState('SRM AP');

  // Flow parameters
  const [destination, setDestination] = useState<string>(DEFAULT_DESTINATION);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayISTDateString());
  const [selectedPickup, setSelectedPickup] = useState<string>(DEFAULT_PICKUP_POINT);
  const [selectedTimeInterval, setSelectedTimeInterval] = useState<IntervalDefinition>(() => {
    return (
      PREDEFINED_INTERVALS.find((i) => i.startTime === '10:00:00') ||
      PREDEFINED_INTERVALS[20]
    );
  });

  // Active / Selected ride for Details or Chat
  const [selectedRide, setSelectedRide] = useState<SlotWithDetails | null>(null);

  // All REAL rides in state
  const [rides, setRides] = useState<SlotWithDetails[]>([]);
  const [loadingRides, setLoadingRides] = useState(true);

  const userName =
    profile?.display_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Student';

  const currentUserId = user?.id || '';

  // Load real rides from Supabase
  const loadRides = useCallback(async () => {
    setLoadingRides(true);
    const data = await fetchAllRides(currentUserId);
    setRides(data);
    setLoadingRides(false);
  }, [currentUserId]);

  useEffect(() => {
    loadRides();
  }, [loadRides]);

  // Real active students count on campus today
  const activeStudentsCount = useMemo(() => {
    const today = getTodayISTDateString();
    const todaySlots = rides.filter((r) => r.departure_date === today);
    const userIds = new Set<string>();
    todaySlots.forEach((slot) => {
      slot.members.forEach((m) => userIds.add(m.user_id));
    });
    return userIds.size;
  }, [rides]);

  // Real user's joined upcoming vs past rides
  const todayStr = getTodayISTDateString();
  const myUpcomingRides = useMemo(() => {
    return rides.filter((r) => r.isUserJoined && r.departure_date >= todayStr);
  }, [rides, todayStr]);

  const myPastRides = useMemo(() => {
    return rides.filter((r) => r.isUserJoined && r.departure_date < todayStr);
  }, [rides, todayStr]);

  // Matching rides for current flow selection
  const bestMatchRide = useMemo(() => {
    return (
      rides.find(
        (r) =>
          r.destination.toLowerCase() === destination.toLowerCase() &&
          r.departure_date === selectedDate &&
          r.start_time.slice(0, 5) === selectedTimeInterval.startTime.slice(0, 5)
      ) || null
    );
  }, [rides, destination, selectedDate, selectedTimeInterval]);

  const otherGroupsLeavingToday = useMemo(() => {
    return rides.filter(
      (r) =>
        r.destination.toLowerCase() === destination.toLowerCase() &&
        r.departure_date === selectedDate &&
        r.start_time.slice(0, 5) !== selectedTimeInterval.startTime.slice(0, 5)
    );
  }, [rides, destination, selectedDate, selectedTimeInterval]);

  // Handlers for Navigation & Flow
  const handleTabChange = (tab: NavTab) => {
    setCurrentTab(tab);
    if (tab === 'home') {
      setFlowScreen('home_main');
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleStartFindRide = (dest?: string) => {
    if (dest) setDestination(dest);
    setFlowScreen('flow_step1');
  };

  const handleOpenRideDetails = (ride: SlotWithDetails) => {
    setSelectedRide(ride);
    setFlowScreen('flow_step4');
  };

  const handleOpenRideChat = (ride: SlotWithDetails) => {
    setSelectedRide(ride);
    setFlowScreen('flow_step5');
  };

  const handleJoinOrCreateRide = async () => {
    const joined = await createAndJoinRide({
      destination,
      departureDate: selectedDate,
      startTime: selectedTimeInterval.startTime,
      endTime: selectedTimeInterval.endTime,
      pickupPoint: selectedPickup,
      userId: currentUserId,
      targetSize: 4,
    });

    await loadRides();

    if (joined) {
      setSelectedRide(joined);
      setFlowScreen('flow_step4');
    }
  };

  const handleLeaveRide = async () => {
    if (!selectedRide) return;
    await leaveRideInSupabase(selectedRide.id, currentUserId);
    await loadRides();
    setSelectedRide(null);
    setFlowScreen('home_main');
    setCurrentTab('home');
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#09090B] flex flex-col justify-between selection:bg-[#09090B] selection:text-white">
      {/* 1. Universal Top Header */}
      <AppHeader
        user={user}
        profile={profile}
        currentCampus={selectedCampus}
        onSelectCampus={setSelectedCampus}
        onOpenProfile={() => {
          setCurrentTab('profile');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onSignOut={onSignOut}
      />

      {/* 2. Main Content Canvas */}
      <main className="flex-1 w-full max-w-[480px] sm:max-w-xl mx-auto px-4 py-4 pb-24">
        {/* TAB 1: HOME */}
        {currentTab === 'home' && (
          <>
            {flowScreen === 'home_main' && (
              <HomeView
                userName={userName}
                selectedDestination={destination}
                onSelectDestination={setDestination}
                onFindRide={handleStartFindRide}
                upcomingRides={rides}
                activeStudentsCount={activeStudentsCount}
                onOpenRideDetails={handleOpenRideDetails}
                onOpenRideChat={handleOpenRideChat}
              />
            )}

            {flowScreen === 'flow_step1' && (
              <Step1DestinationDate
                destination={destination}
                onDestinationChange={setDestination}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                selectedPickup={selectedPickup}
                onPickupChange={setSelectedPickup}
                onBack={() => setFlowScreen('home_main')}
                onProceed={() => setFlowScreen('flow_step2')}
              />
            )}

            {flowScreen === 'flow_step2' && (
              <Step2TimeSelection
                destination={destination}
                selectedDate={selectedDate}
                selectedTimeInterval={selectedTimeInterval}
                onSelectInterval={setSelectedTimeInterval}
                existingSlots={rides}
                onBack={() => setFlowScreen('flow_step1')}
                onProceed={() => setFlowScreen('flow_step3')}
              />
            )}

            {flowScreen === 'flow_step3' && (
              <Step3RideMatching
                destination={destination}
                selectedDate={selectedDate}
                selectedPickup={selectedPickup}
                selectedTimeInterval={selectedTimeInterval}
                bestMatchRide={bestMatchRide}
                otherGroups={otherGroupsLeavingToday}
                isUserInRide={Boolean(bestMatchRide?.isUserJoined)}
                onJoinRide={handleJoinOrCreateRide}
                onOpenRide={(ride) => {
                  setSelectedRide(ride);
                  setFlowScreen('flow_step4');
                }}
                onStartNewGroup={handleJoinOrCreateRide}
                onChangeTime={() => setFlowScreen('flow_step2')}
                onBack={() => setFlowScreen('flow_step2')}
              />
            )}

            {flowScreen === 'flow_step4' && (
              <Step4JoinedRideDetails
                ride={selectedRide || bestMatchRide || rides[0]}
                currentUserId={currentUserId}
                userName={userName}
                onOpenChat={() => setFlowScreen('flow_step5')}
                onLeaveRide={handleLeaveRide}
                onBack={() => setFlowScreen('home_main')}
              />
            )}

            {flowScreen === 'flow_step5' && (
              <Step5GroupChat
                ride={selectedRide || bestMatchRide || rides[0]}
                currentUserId={currentUserId}
                userName={userName}
                onBack={() => setFlowScreen('flow_step4')}
              />
            )}
          </>
        )}

        {/* TAB 2: MY RIDES */}
        {currentTab === 'my_rides' && (
          <>
            {flowScreen === 'flow_step4' && selectedRide ? (
              <Step4JoinedRideDetails
                ride={selectedRide}
                currentUserId={currentUserId}
                userName={userName}
                onOpenChat={() => setFlowScreen('flow_step5')}
                onLeaveRide={handleLeaveRide}
                onBack={() => setFlowScreen('home_main')}
              />
            ) : flowScreen === 'flow_step5' && selectedRide ? (
              <Step5GroupChat
                ride={selectedRide}
                currentUserId={currentUserId}
                userName={userName}
                onBack={() => setFlowScreen('flow_step4')}
              />
            ) : (
              <MyRidesView
                upcomingRides={myUpcomingRides}
                pastRides={myPastRides}
                onOpenRideDetails={handleOpenRideDetails}
                onOpenRideChat={handleOpenRideChat}
                onFindNewRide={() => {
                  setCurrentTab('home');
                  setFlowScreen('flow_step1');
                }}
              />
            )}
          </>
        )}

        {/* TAB 3: PROFILE */}
        {currentTab === 'profile' && (
          <ProfileView
            user={user}
            profile={profile}
            onSignOut={onSignOut}
          />
        )}
      </main>

      {/* 3. Fixed Bottom Navigation Bar */}
      <BottomNavigation
        currentTab={currentTab}
        onTabChange={handleTabChange}
        myRidesCount={myUpcomingRides.length}
      />
    </div>
  );
};
