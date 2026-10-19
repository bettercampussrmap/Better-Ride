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
import { JoinGroupModal, RideActionOptions } from '../slots/JoinGroupModal';
import { Profile, SlotWithDetails } from '../../types/database';
import { getTodayISTDateString } from '../../lib/date-utils';
import { useToast } from '../ui/Toast';
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
  const { showToast } = useToast();

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

  // Modal State for Joining / Creating Groups with full options
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionModalMode, setActionModalMode] = useState<'join' | 'create'>('join');
  const [targetSlotForModal, setTargetSlotForModal] = useState<SlotWithDetails | null>(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const userName =
    profile?.display_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Student';

  const currentUserId = user?.id || '';

  // Load real rides
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

  // User's joined upcoming vs past rides
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

  // Open modal for joining a ride (with options: landmark, vehicle, max 12 members)
  const handleOpenJoinRideModal = (ride?: SlotWithDetails) => {
    const slotToJoin = ride || bestMatchRide || null;
    setTargetSlotForModal(slotToJoin);
    if (slotToJoin) {
      setDestination(slotToJoin.destination);
      setSelectedDate(slotToJoin.departure_date);
    }
    setActionModalMode('join');
    setActionModalOpen(true);
  };

  // Open modal for creating a new ride group (with options: destination, date, time, landmark, max 12 members)
  const handleOpenCreateGroupModal = () => {
    setTargetSlotForModal(null);
    setActionModalMode('create');
    setActionModalOpen(true);
  };

  // Handle modal confirmation
  const handleConfirmRideAction = async (options: RideActionOptions) => {
    setIsSubmittingAction(true);
    try {
      const result = await createAndJoinRide({
        destination: options.destination,
        departureDate: options.departureDate,
        startTime: options.startTime,
        endTime: options.endTime,
        pickupPoint: options.pickupPoint,
        userId: currentUserId,
        targetSize: options.targetSize, // capped at 12
        ridePref: options.ridePref,
        pickupNote: options.pickupNote,
        slotId: options.slotId,
        userName,
        userAvatar: profile?.avatar_url || user?.picture,
      });

      await loadRides();
      setActionModalOpen(false);

      if (result) {
        setSelectedRide(result);
        setFlowScreen('flow_step4');
        showToast(
          'success',
          actionModalMode === 'create' ? 'Ride Group Created' : 'Joined Ride Pool',
          `Confirmed for ${result.destination} (${result.departure_date})!`
        );
      }
    } catch (err: any) {
      showToast('error', 'Action failed', err?.message || 'Could not complete ride action.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleLeaveRide = async () => {
    if (!selectedRide) return;
    await leaveRideInSupabase(selectedRide.id, currentUserId);
    await loadRides();
    setSelectedRide(null);
    setFlowScreen('home_main');
    setCurrentTab('home');
    showToast('info', 'Left Ride', 'You have left the ride group.');
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#09090B] flex flex-col justify-between selection:bg-[#09090B] selection:text-white">
      {/* 1. Universal Top Header - Compact */}
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

      {/* 2. Main Content Canvas - Scaled Down & Ergonomic */}
      <main className="flex-1 w-full max-w-[420px] mx-auto px-3.5 py-2.5 pb-20">
        {/* TAB 1: HOME */}
        {currentTab === 'home' && (
          <>
            {flowScreen === 'home_main' && (
              <HomeView
                userName={userName}
                selectedDestination={destination}
                onSelectDestination={setDestination}
                onFindRide={handleStartFindRide}
                onCreateGroup={handleOpenCreateGroupModal}
                onJoinRide={handleOpenJoinRideModal}
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
                onJoinRide={handleOpenJoinRideModal}
                onOpenRide={(ride) => {
                  setSelectedRide(ride);
                  setFlowScreen('flow_step4');
                }}
                onStartNewGroup={handleOpenCreateGroupModal}
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
                onFindNewRide={handleOpenCreateGroupModal}
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

      {/* 3. Fixed Bottom Navigation Bar - Compact */}
      <BottomNavigation
        currentTab={currentTab}
        onTabChange={handleTabChange}
        myRidesCount={myUpcomingRides.length}
      />

      {/* 4. Universal Join & Create Group Options Modal (Max 12 members) */}
      <JoinGroupModal
        isOpen={actionModalOpen}
        onClose={() => setActionModalOpen(false)}
        mode={actionModalMode}
        slot={targetSlotForModal}
        initialDestination={destination}
        initialDate={selectedDate}
        initialTimeInterval={selectedTimeInterval}
        initialPickup={selectedPickup}
        onConfirm={handleConfirmRideAction}
        isSubmitting={isSubmittingAction}
      />
    </div>
  );
};
