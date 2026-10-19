import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { getTodayISTDateString, isRideCompleted } from '../../lib/date-utils';
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
  subscribeToRideUpdates,
} from '../../lib/rides-service';

interface DashboardProps {
  user: any;
  profile: Profile | null;
  onUpdateProfile?: (profile: Profile) => void;
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
  onUpdateProfile,
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

    // Subscribe to Postgres Realtime changes from Supabase
    const unsubscribe = subscribeToRideUpdates(() => {
      loadRides();
    });

    // Periodic background sync every 5 seconds so waiting lists sync across all devices
    const interval = setInterval(() => {
      loadRides();
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [loadRides]);

  // Mobile Back Button Navigation Handler
  const lastBackPressTimeRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', window.location.href);
    }

    const handlePopState = (e: PopStateEvent) => {
      // 1. If modal is open, close modal
      if (actionModalOpen) {
        setActionModalOpen(false);
        window.history.pushState(null, '', window.location.href);
        return;
      }

      // 2. If inside multi-step flow, go back one step
      if (flowScreen === 'flow_step5') {
        setFlowScreen('flow_step4');
        window.history.pushState(null, '', window.location.href);
        return;
      }
      if (flowScreen === 'flow_step4') {
        setFlowScreen('flow_step3');
        window.history.pushState(null, '', window.location.href);
        return;
      }
      if (flowScreen === 'flow_step3') {
        setFlowScreen('flow_step2');
        window.history.pushState(null, '', window.location.href);
        return;
      }
      if (flowScreen === 'flow_step2') {
        setFlowScreen('flow_step1');
        window.history.pushState(null, '', window.location.href);
        return;
      }
      if (flowScreen === 'flow_step1') {
        setFlowScreen('home_main');
        window.history.pushState(null, '', window.location.href);
        return;
      }

      // 3. If on non-home tab (My Rides or Profile), go back to Home tab
      if (currentTab !== 'home') {
        setCurrentTab('home');
        setFlowScreen('home_main');
        window.history.pushState(null, '', window.location.href);
        return;
      }

      // 4. On root / first page ('home' tab, 'home_main', no modals) -> require 2 presses to exit app
      const now = Date.now();
      if (now - lastBackPressTimeRef.current < 2000) {
        window.history.back();
      } else {
        lastBackPressTimeRef.current = now;
        showToast('info', 'Press back again to exit', 'Press back again to exit Better Ride.');
        window.history.pushState(null, '', window.location.href);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [actionModalOpen, flowScreen, currentTab, showToast]);



  // User's joined upcoming vs past rides (marked complete when slot end time is reached)
  const myUpcomingRides = useMemo(() => {
    return rides.filter((r) => r.isUserJoined && !isRideCompleted(r.departure_date, r.end_time));
  }, [rides]);

  const myPastRides = useMemo(() => {
    return rides.filter((r) => r.isUserJoined && isRideCompleted(r.departure_date, r.end_time));
  }, [rides]);

  // All matching ride groups for current flow selection (supports multiple groups in a single slot)
  const matchingSlotGroups = useMemo(() => {
    return rides.filter(
      (r) =>
        r.destination.toLowerCase() === destination.toLowerCase() &&
        r.departure_date === selectedDate &&
        r.start_time.slice(0, 5) === selectedTimeInterval.startTime.slice(0, 5)
    );
  }, [rides, destination, selectedDate, selectedTimeInterval]);

  const bestMatchRide = useMemo(() => {
    return matchingSlotGroups[0] || null;
  }, [matchingSlotGroups]);

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
    setFlowScreen('flow_step2');
  };

  const handleOpenRideDetails = (ride: SlotWithDetails) => {
    setSelectedRide(ride);
    setFlowScreen('flow_step4');
  };

  const handleOpenRideChat = (ride: SlotWithDetails) => {
    setSelectedRide(ride);
    setFlowScreen('flow_step5');
  };

  // Direct Join without modal: user directly joins an existing group
  const handleDirectJoinGroup = async (group: SlotWithDetails) => {
    const memberCount = group.memberCount || group.members?.length || 1;
    const targetSeats = group.target_size || 4;

    if (memberCount >= targetSeats) {
      showToast('error', 'Group Full', 'This ride group is already at maximum capacity.');
      return;
    }

    setIsSubmittingAction(true);
    try {
      const result = await createAndJoinRide({
        destination: group.destination,
        departureDate: group.departure_date,
        startTime: group.start_time,
        endTime: group.end_time,
        userId: currentUserId,
        targetSize: group.target_size,
        ridePref: group.ride_type || 'auto',
        slotId: group.id,
        userName,
        userAvatar: profile?.avatar_url || user?.picture,
      });

      await loadRides();
      if (result) {
        setSelectedRide(result);
        setFlowScreen('flow_step4');
        showToast('success', 'Joined Group', `You joined the ride pool to ${result.destination}!`);
      }
    } catch (err: any) {
      showToast('error', 'Join Failed', err?.message || 'Could not join group.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Open modal for creating a new ride group (options: vehicle type, number of people)
  const handleOpenCreateGroupModal = () => {
    setTargetSlotForModal(null);
    setActionModalMode('create');
    setActionModalOpen(true);
  };

  // Handle modal confirmation for creating a brand new group
  const handleConfirmRideAction = async (options: RideActionOptions) => {
    setIsSubmittingAction(true);
    try {
      const result = await createAndJoinRide({
        destination: destination, // Always locks to selected destination
        departureDate: selectedDate,
        startTime: selectedTimeInterval.startTime,
        endTime: selectedTimeInterval.endTime,
        userId: currentUserId,
        targetSize: options.targetSize,
        ridePref: options.ridePref,
        forceNewGroup: true, // Guarantees creation of a separate group in this slot
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
          'Ride Group Created',
          `New group created for ${result.destination} (${result.target_size} seats)!`
        );
      }
    } catch (err: any) {
      showToast('error', 'Action failed', err?.message || 'Could not create ride group.');
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

  const handleDeletePastRide = async (slotId: string) => {
    try {
      await leaveRideInSupabase(slotId, currentUserId);
      await loadRides();
      if (selectedRide?.id === slotId) {
        setSelectedRide(null);
        setFlowScreen('home_main');
      }
      showToast('info', 'Ride Deleted', 'Completed ride removed from your history.');
    } catch (err: any) {
      showToast('error', 'Delete Failed', err?.message || 'Could not remove ride.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#09090B] flex flex-col justify-between selection:bg-[#09090B] selection:text-white">
      {/* 1. Universal Top Header - Compact with real notifications */}
      <AppHeader
        user={user}
        profile={profile}
        currentCampus={selectedCampus}
        rides={rides}
        onSelectCampus={setSelectedCampus}
        onOpenRide={handleOpenRideDetails}
        onOpenProfile={() => {
          setCurrentTab('profile');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onSignOut={onSignOut}
      />

      {/* 2. Main Content Canvas - Centered & Ergonomically Spaced */}
      <main className="flex-1 w-full max-w-[420px] mx-auto px-4 py-4 sm:py-5 pb-24 space-y-4 sm:space-y-5">
        {/* TAB 1: HOME */}
        {currentTab === 'home' && (
          <>
            {flowScreen === 'home_main' && (
              <HomeView
                userName={userName}
                selectedDestination={destination}
                onSelectDestination={setDestination}
                onFindRide={handleStartFindRide}
                onJoinRide={handleDirectJoinGroup}
                upcomingRides={myUpcomingRides}
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
                onDestinationChange={setDestination}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                selectedTimeInterval={selectedTimeInterval}
                onSelectInterval={setSelectedTimeInterval}
                existingSlots={rides}
                onBack={() => setFlowScreen('home_main')}
                onProceed={() => setFlowScreen('flow_step3')}
              />
            )}

            {flowScreen === 'flow_step3' && (
              <Step3RideMatching
                destination={destination}
                selectedDate={selectedDate}
                selectedPickup={selectedPickup}
                selectedTimeInterval={selectedTimeInterval}
                slotGroups={matchingSlotGroups}
                otherGroups={otherGroupsLeavingToday}
                currentUserId={currentUserId}
                onJoinRide={handleDirectJoinGroup}
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
                onFindNewRide={() => {
                  setCurrentTab('home');
                  setFlowScreen('home_main');
                }}
                onDeleteRide={handleDeletePastRide}
              />
            )}
          </>
        )}

        {/* TAB 3: PROFILE */}
        {currentTab === 'profile' && (
          <ProfileView
            user={user}
            profile={profile}
            currentCampus={selectedCampus}
            onUpdateCampus={setSelectedCampus}
            onUpdateProfile={onUpdateProfile}
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

      {/* 4. Universal Join & Create Group Options Modal */}
      <JoinGroupModal
        isOpen={actionModalOpen}
        onClose={() => setActionModalOpen(false)}
        mode={actionModalMode}
        slot={targetSlotForModal || (actionModalMode === 'join' ? bestMatchRide : null)}
        initialDestination={destination}
        initialDate={selectedDate}
        initialTimeInterval={selectedTimeInterval}
        onConfirm={handleConfirmRideAction}
        isSubmitting={isSubmittingAction}
      />
    </div>
  );
};
