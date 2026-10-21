import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase';
import { SlotWithDetails, SlotMember, TimeSlot } from '../../types/database';
import { PREDEFINED_INTERVALS } from '../../lib/constants';
import { SlotCard } from './SlotCard';
import { SlotChatModal } from '../chat/SlotChatModal';
import { JoinGroupModal } from './JoinGroupModal';
import { useToast } from '../ui/Toast';
import { Clock, RefreshCw, Navigation, ArrowLeft, MessageSquare, Sparkles } from 'lucide-react';
import { toValidUuid, isValidUuid } from '../../lib/uuid-utils';
import { leaveRideInSupabase } from '../../lib/rides-service';

interface SlotListProps {
  selectedDestination: string;
  selectedDate: string;
  selectedPeriod: string;
  currentUserId: string;
  onBackToLocations?: () => void;
}

export const SlotList: React.FC<SlotListProps> = ({
  selectedDestination,
  selectedDate,
  selectedPeriod,
  currentUserId,
  onBackToLocations,
}) => {
  const { showToast } = useToast();
  const [dbSlots, setDbSlots] = useState<TimeSlot[]>([]);
  const [memberships, setMemberships] = useState<SlotMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingSlotId, setActionLoadingSlotId] = useState<string | null>(null);

  // Modals state
  const [activeChatSlot, setActiveChatSlot] = useState<SlotWithDetails | null>(null);
  const [joinModalSlot, setJoinModalSlot] = useState<SlotWithDetails | null>(null);

  // Clean, guaranteed UUID for the current user
  const sanitizedCurrentUserId = useMemo(() => {
    return isValidUuid(currentUserId) ? currentUserId : toValidUuid(currentUserId);
  }, [currentUserId]);

  // Fetch departure slots for selected destination & date
  const fetchSlotData = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseConfigured()) {
      // Local fallback mode
      const storageKey = `local_slots_${selectedDestination}_${selectedDate}`;
      const memKey = `local_members_${selectedDestination}_${selectedDate}`;
      const localSlots = localStorage.getItem(storageKey);
      const localMembers = localStorage.getItem(memKey);
      if (localSlots) setDbSlots(JSON.parse(localSlots));
      else setDbSlots([]);
      if (localMembers) setMemberships(JSON.parse(localMembers));
      else setMemberships([]);
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch slots for this destination & date
      const { data: slotsData, error: slotsErr } = await supabase
        .from('time_slots')
        .select('*')
        .eq('departure_date', selectedDate)
        .eq('destination', selectedDestination);

      if (slotsErr) {
        console.warn('Error fetching slots from Supabase, checking local:', slotsErr);
        const storageKey = `local_slots_${selectedDestination}_${selectedDate}`;
        const localSlots = localStorage.getItem(storageKey);
        if (localSlots) setDbSlots(JSON.parse(localSlots));
        setLoading(false);
        return;
      }

      setDbSlots(slotsData || []);

      const slotIds = (slotsData || []).map((s) => s.id);
      if (slotIds.length === 0) {
        setMemberships([]);
        setLoading(false);
        return;
      }

      // 2. Fetch members - with graceful fallback if foreign key relation name differs
      try {
        const { data: membersData, error: membersErr } = await supabase
          .from('slot_members')
          .select('id, slot_id, user_id, joined_at, target_size, ride_pref, pickup_note, profile:profiles(id, display_name, email, avatar_url)')
          .in('slot_id', slotIds);

        let activeMembers: any[] = [];
        if (!membersErr && membersData) {
          activeMembers = membersData;
        } else {
          // Fallback simple select without nested profile
          const { data: simpleData } = await supabase
            .from('slot_members')
            .select('id, slot_id, user_id, joined_at, target_size, ride_pref, pickup_note')
            .in('slot_id', slotIds);
          if (simpleData) {
            activeMembers = simpleData;
          }
        }

        const validSlots = (slotsData || []).filter((slot) => {
          const hasMembers = activeMembers.some((m: any) => m.slot_id === slot.id);
          if (!hasMembers) {
            supabase.from('time_slots').delete().eq('id', slot.id).then(() => {});
            return false;
          }
          return true;
        });

        setDbSlots(validSlots);
        setMemberships(activeMembers);
      } catch (memError) {
        console.warn('Notice loading slot members:', memError);
        setDbSlots(slotsData || []);
      }
    } catch (err: any) {
      console.error('Unexpected error loading slots:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDestination, selectedDate]);

  // Initial load and on destination/date change
  useEffect(() => {
    setLoading(true);
    fetchSlotData();
  }, [fetchSlotData]);

  // Realtime updates
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseConfigured()) return;

    const channelName = `realtime-slots-${selectedDestination.replace(/\s+/g, '-')}-${selectedDate}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'slot_members' },
        () => fetchSlotData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'time_slots' },
        () => fetchSlotData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDestination, selectedDate, fetchSlotData]);

  // Merge predefined intervals with database records for this destination
  const mergedSlots: SlotWithDetails[] = useMemo(() => {
    const filteredIntervals = PREDEFINED_INTERVALS.filter((interval) => {
      if (selectedPeriod === 'all') return true;
      return interval.period === selectedPeriod;
    });

    return filteredIntervals.map((interval) => {
      const existingDbSlot = dbSlots.find(
        (s) =>
          (s.destination === selectedDestination || !s.destination) &&
          s.departure_date === selectedDate &&
          s.start_time.substring(0, 5) === interval.startTime.substring(0, 5)
      );

      const slotId = existingDbSlot ? existingDbSlot.id : `virtual-${selectedDestination}-${interval.startTime}`;
      const slotMembers = existingDbSlot
        ? memberships.filter((m) => m.slot_id === existingDbSlot.id)
        : [];

      // Check if current student is joined (match sanitized UUID or raw ID)
      const isUserJoined = slotMembers.some(
        (m) =>
          m.user_id === sanitizedCurrentUserId ||
          (currentUserId && m.user_id === currentUserId)
      );

      return {
        id: slotId,
        destination: selectedDestination,
        departure_date: selectedDate,
        start_time: interval.startTime,
        end_time: interval.endTime,
        created_at: existingDbSlot?.created_at || new Date().toISOString(),
        members: slotMembers,
        isUserJoined,
        memberCount: slotMembers.length,
      };
    });
  }, [selectedDestination, selectedDate, selectedPeriod, dbSlots, memberships, currentUserId, sanitizedCurrentUserId]);

  // Keep active chat slot updated with fresh members when data updates
  useEffect(() => {
    if (activeChatSlot) {
      const refreshed = mergedSlots.find((s) => s.id === activeChatSlot.id);
      if (refreshed) {
        setActiveChatSlot(refreshed);
      }
    }
  }, [mergedSlots]);

  // User clicked "Start Ride Group" or "Join Group" on a card -> open options modal
  const handleTriggerJoin = (slot: SlotWithDetails) => {
    setJoinModalSlot(slot);
  };

  // User confirmed options in the JoinGroupModal
  const handleConfirmJoinModal = async (options: {
    targetSize: number;
    pickupNote: string;
  }) => {
    if (!joinModalSlot) return;
    const slot = joinModalSlot;
    setActionLoadingSlotId(slot.id);

    const safeUid = sanitizedCurrentUserId;

    // ENFORCE SINGLE-SLOT POLICY:
    // A student can only be joined in 1 departure slot at a time.
    // Clean up any other slot memberships locally first:
    try {
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        if (k.startsWith('local_members_')) {
          const raw = localStorage.getItem(k);
          if (raw) {
            const list = JSON.parse(raw);
            const filtered = list.filter(
              (m: any) => m.user_id !== safeUid && m.user_id !== currentUserId
            );
            localStorage.setItem(k, JSON.stringify(filtered));
          }
        }
      }
    } catch {}

    // Clean up any other slot memberships in Supabase database:
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      if (supabase) {
        try {
          await supabase.from('slot_members').delete().eq('user_id', safeUid);
        } catch (delErr) {
          console.warn('Notice removing prior slot membership in database:', delErr);
        }
      }
    }

    // Helper to store locally
    const saveLocally = () => {
      let slotId = slot.id;
      if (slot.id.startsWith('virtual-') || !isValidUuid(slot.id)) {
        slotId = toValidUuid(`slot-${selectedDestination}-${selectedDate}-${slot.start_time}`);
        const newSlot: TimeSlot = {
          id: slotId,
          destination: selectedDestination,
          departure_date: slot.departure_date,
          start_time: slot.start_time,
          end_time: slot.end_time,
          target_size: options.targetSize,
          created_at: new Date().toISOString(),
        };
        const updatedSlots = [...dbSlots.filter((s) => s.id !== slotId), newSlot];
        setDbSlots(updatedSlots);
        localStorage.setItem(`local_slots_${selectedDestination}_${selectedDate}`, JSON.stringify(updatedSlots));
      }

      const memberId = toValidUuid(`mem-${slotId}-${safeUid}`);
      const newMember: SlotMember = {
        id: memberId,
        slot_id: slotId,
        user_id: safeUid,
        joined_at: new Date().toISOString(),
        target_size: options.targetSize,
        pickup_note: options.pickupNote,
        profile: {
          id: safeUid,
          display_name: 'You (Student)',
          email: 'bettercampus.srmap@gmail.com',
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };

      // Filter out user from all existing memberships so only 1 slot is joined
      const updatedMembers = [
        ...memberships.filter((m) => m.user_id !== safeUid && m.user_id !== currentUserId),
        newMember,
      ];
      setMemberships(updatedMembers);
      localStorage.setItem(`local_members_${selectedDestination}_${selectedDate}`, JSON.stringify(updatedMembers));

      showToast('success', 'Joined Departure Slot!', `Your active slot is set to ${selectedDestination}.`);
      setJoinModalSlot(null);
      setActionLoadingSlotId(null);

      // Auto-open group chat
      const joinedSlotDetails: SlotWithDetails = {
        ...slot,
        id: slotId,
        isUserJoined: true,
        memberCount: (slot.memberCount || 0) + 1,
        members: [...slot.members.filter((m) => m.user_id !== safeUid && m.user_id !== currentUserId), newMember],
      };
      setActiveChatSlot(joinedSlotDetails);
    };

    if (!isSupabaseConfigured()) {
      saveLocally();
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      saveLocally();
      return;
    }

    try {
      let realSlotId = slot.id;

      if (slot.id.startsWith('virtual-') || !isValidUuid(slot.id)) {
        // 1. Check if slot already exists in database
        const { data: existingSlot } = await supabase
          .from('time_slots')
          .select('id')
          .eq('destination', selectedDestination)
          .eq('departure_date', slot.departure_date)
          .eq('start_time', slot.start_time)
          .maybeSingle();

        if (existingSlot) {
          realSlotId = existingSlot.id;
        } else {
          // 2. Insert slot
          let newSlot: any = null;
          let createSlotErr: any = null;
          const ins1 = await supabase
            .from('time_slots')
            .insert({
              destination: selectedDestination,
              departure_date: slot.departure_date,
              start_time: slot.start_time,
              end_time: slot.end_time,
              target_size: options.targetSize,
            })
            .select()
            .single();

          if (ins1.error) {
            const ins2 = await supabase
              .from('time_slots')
              .insert({
                destination: selectedDestination,
                departure_date: slot.departure_date,
                start_time: slot.start_time,
                end_time: slot.end_time,
              })
              .select()
              .single();
            newSlot = ins2.data;
            createSlotErr = ins2.error;
          } else {
            newSlot = ins1.data;
          }

          if (createSlotErr) {
            // Check again if inserted in parallel
            const { data: parallelSlot } = await supabase
              .from('time_slots')
              .select('id')
              .eq('destination', selectedDestination)
              .eq('departure_date', slot.departure_date)
              .eq('start_time', slot.start_time)
              .maybeSingle();

            if (parallelSlot) {
              realSlotId = parallelSlot.id;
            } else {
              console.warn('Slot creation notice, falling back:', createSlotErr);
              saveLocally();
              return;
            }
          } else if (newSlot) {
            realSlotId = newSlot.id;
            try {
              await supabase.from('time_slots').insert({
                destination: `__better_ride_slot_meta__:${JSON.stringify({
                  slot_id: realSlotId,
                  target_size: options.targetSize,
                  ride_type: 'auto',
                })}`,
                departure_date: '1970-01-03',
                start_time: '00:00:00',
                end_time: '00:00:01',
              });
            } catch {}
          }
        }
      }

      // 3. Upsert profile so foreign keys or joins always work
      try {
        await supabase.from('profiles').upsert({
          id: safeUid,
          display_name: 'You (Student)',
          updated_at: new Date().toISOString(),
        });
      } catch {}

      // 4. Insert into slot_members using guaranteed valid safeUid
      const { error: memberErr } = await supabase.from('slot_members').insert({
        slot_id: realSlotId,
        user_id: safeUid,
        target_size: options.targetSize,
        pickup_note: options.pickupNote || null,
      });

      if (memberErr) {
        if (memberErr.code === '23505') {
          showToast('info', 'Already in this slot', 'You are already a member of this time slot.');
        } else {
          console.warn('Membership insert notice, saving locally:', memberErr);
          saveLocally();
          return;
        }
      } else {
        showToast('success', 'Joined Departure Slot!', `Your active slot is set to ${selectedDestination}.`);
        await fetchSlotData();
      }

      setJoinModalSlot(null);

      // Auto-open the group chat
      const updatedSlotDetails: SlotWithDetails = {
        ...slot,
        id: realSlotId,
        isUserJoined: true,
        memberCount: (slot.memberCount || 0) + 1,
      };
      setActiveChatSlot(updatedSlotDetails);
    } catch (err: any) {
      console.warn('Join catch, falling back locally:', err);
      saveLocally();
    } finally {
      setActionLoadingSlotId(null);
    }
  };

  // Handle Leaving a slot
  const handleLeaveSlot = async (slot: SlotWithDetails) => {
    setActionLoadingSlotId(slot.id);
    const safeUid = sanitizedCurrentUserId;

    // 1. Immediately remove from local state & localStorage
    const updatedMembers = memberships.filter(
      (m) => !(m.slot_id === slot.id && (m.user_id === safeUid || m.user_id === currentUserId))
    );
    setMemberships(updatedMembers);
    try {
      localStorage.setItem(`local_members_${selectedDestination}_${selectedDate}`, JSON.stringify(updatedMembers));
    } catch {}

    if (activeChatSlot?.id === slot.id) {
      setActiveChatSlot(null);
    }

    try {
      await leaveRideInSupabase(slot.id, currentUserId, slot.destination, slot.departure_date, slot.start_time);
      await fetchSlotData();
      showToast('info', 'Left time slot', 'You have been removed from this departure group.');
    } catch (err: any) {
      console.warn('Leave slot error:', err);
      showToast('info', 'Left time slot', 'You have been removed from this departure group.');
    } finally {
      setActionLoadingSlotId(null);
    }
  };

  const myJoinedSlots = mergedSlots.filter((s) => s.isUserJoined);

  return (
    <div className="space-y-5 pb-16">
      {/* Top Breadcrumb & Step Navigation Bar */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {onBackToLocations && (
            <button
              onClick={onBackToLocations}
              className="px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-[#F1F7F0] text-xs font-bold text-[#183F2A] flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Change Destination</span>
            </button>
          )}

          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-[#245C3A] tracking-wider block">
              Step 2 of 2 • Select Departure Slot
            </span>
            <h3 className="text-sm sm:text-base font-extrabold text-[#183F2A] truncate flex items-center gap-1.5">
              <Navigation className="w-4 h-4 text-[#245C3A] shrink-0" />
              <span>{selectedDestination}</span>
            </h3>
          </div>
        </div>

        <button
          onClick={() => fetchSlotData()}
          className="text-xs text-[#245C3A] hover:text-[#183F2A] font-semibold flex items-center gap-1.5 cursor-pointer ml-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh Slots</span>
        </button>
      </div>

      {/* Active student group summary banner (Single slot policy) */}
      {myJoinedSlots.length > 0 && (
        <div className="p-4 rounded-2xl bg-[#183F2A] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm border border-[#245C3A]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#E6A15A]">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-white/70 font-semibold uppercase tracking-wider">
                Your Active Departure Slot (1 Slot Allowed)
              </p>
              <h4 className="text-sm sm:text-base font-bold text-white">
                Scheduled for {myJoinedSlots[0].destination} ({myJoinedSlots[0].start_time.substring(0, 5)})
              </h4>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setActiveChatSlot(myJoinedSlots[0])}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#E6A15A] hover:bg-[#d8934c] text-[#183F2A] text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Open Slot Group Chat</span>
            </button>
          </div>
        </div>
      )}

      {/* Slots List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h4 className="text-sm sm:text-base font-bold text-[#183F2A]">
              30-Minute Campus Gate Slots (24 Hours)
            </h4>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-white text-[#245C3A] font-bold border border-[#245C3A]/20 shadow-2xs">
              {mergedSlots.length} available
            </span>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-44 rounded-2xl bg-white/70 border border-gray-200 animate-pulse p-5 space-y-4"
              >
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
                <div className="h-8 bg-gray-100 rounded mt-8" />
              </div>
            ))}
          </div>
        ) : mergedSlots.length === 0 ? (
          <div className="bg-[#FFFEFA] rounded-2xl border border-[#245C3A]/15 p-12 text-center text-[#737B73] space-y-3">
            <Clock className="w-10 h-10 text-gray-300 mx-auto" />
            <h4 className="font-bold text-[#183F2A]">No slots in this period</h4>
            <p className="text-xs max-w-sm mx-auto">
              Try switching your time period filter to "All 24 Hours" or choose another departure date.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {mergedSlots.map((slot) => (
              <SlotCard
                key={slot.id}
                slot={slot}
                currentUserId={sanitizedCurrentUserId}
                isJoining={actionLoadingSlotId === slot.id}
                onJoin={handleTriggerJoin}
                onLeave={handleLeaveSlot}
                onOpenChat={(s) => setActiveChatSlot(s)}
                hasOtherSlotJoined={myJoinedSlots.length > 0 && !slot.isUserJoined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Join / Start Ride Group Options Modal */}
      {joinModalSlot && (
        <JoinGroupModal
          slot={joinModalSlot}
          isOpen={!!joinModalSlot}
          onClose={() => setJoinModalSlot(null)}
          onConfirmJoin={handleConfirmJoinModal}
          isJoining={actionLoadingSlotId === joinModalSlot.id}
          existingJoinedSlot={myJoinedSlots[0] || null}
        />
      )}

      {/* Real-Time Internet Group Chat Modal */}
      {activeChatSlot && (
        <SlotChatModal
          slot={activeChatSlot}
          currentUserId={sanitizedCurrentUserId}
          onClose={() => setActiveChatSlot(null)}
        />
      )}
    </div>
  );
};
