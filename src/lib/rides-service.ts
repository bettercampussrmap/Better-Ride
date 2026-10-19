import { getSupabase } from './supabase';
import { SlotWithDetails, SlotMember, TimeSlot, Message, Profile } from '../types/database';
import { toValidUuid } from './uuid-utils';
import { getTodayISTDateString } from './date-utils';

const STORAGE_KEY_MOCK_RIDES = 'better_ride_mock_slots';
const STORAGE_KEY_MOCK_MESSAGES = 'better_ride_mock_messages';

/**
 * Clean initial mock storage without any demo students or fake pre-booked rides
 */
function getInitialMockRides(): SlotWithDetails[] {
  return [];
}

function getInitialMockMessages(): Record<string, Message[]> {
  return {};
}

let inMemoryRides: SlotWithDetails[] | null = null;
let inMemoryMessages: Record<string, Message[]> | null = null;

// Demo user and slot IDs to purge from previous testing
const DEMO_USER_IDS = new Set(['u-ananya', 'u-rohan', 'u-siddharth', 'u-priya', 'u-tanmay', 'u-kavya']);
const DEMO_SLOT_IDS = new Set([
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
]);

function isDemoRide(r: any): boolean {
  if (!r) return false;
  if (DEMO_SLOT_IDS.has(r.id)) return true;
  if (Array.isArray(r.members)) {
    return r.members.some(
      (m: any) =>
        DEMO_USER_IDS.has(m?.user_id) ||
        m?.profile?.display_name?.includes('Ananya') ||
        m?.profile?.display_name?.includes('Rohan') ||
        m?.profile?.display_name?.includes('Siddharth')
    );
  }
  return false;
}

function loadLocalRides(): SlotWithDetails[] {
  if (inMemoryRides) return inMemoryRides;
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(STORAGE_KEY_MOCK_RIDES);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Purge any legacy demo rides
          const cleanRides = parsed.filter((r) => !isDemoRide(r));
          inMemoryRides = cleanRides;
          saveLocalRides(cleanRides);
          return inMemoryRides;
        }
      } catch {}
    }
  }
  inMemoryRides = getInitialMockRides();
  saveLocalRides(inMemoryRides);
  return inMemoryRides;
}

function saveLocalRides(rides: SlotWithDetails[]) {
  inMemoryRides = rides;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_MOCK_RIDES, JSON.stringify(rides));
    } catch {}
  }
}

function loadLocalMessages(): Record<string, Message[]> {
  if (inMemoryMessages) return inMemoryMessages;
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(STORAGE_KEY_MOCK_MESSAGES);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          // Remove any demo slot IDs
          DEMO_SLOT_IDS.forEach((id) => delete parsed[id]);
          inMemoryMessages = parsed as Record<string, Message[]>;
          saveLocalMessages(inMemoryMessages);
          return inMemoryMessages;
        }
      } catch {}
    }
  }
  inMemoryMessages = getInitialMockMessages();
  saveLocalMessages(inMemoryMessages);
  return inMemoryMessages;
}

function saveLocalMessages(msgs: Record<string, Message[]>) {
  inMemoryMessages = msgs;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_MOCK_MESSAGES, JSON.stringify(msgs));
    } catch {}
  }
}

/**
 * Fetch all rides with real member details (with in-memory mock fallback)
 */
export async function fetchAllRides(currentUserId?: string): Promise<SlotWithDetails[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      // 1. Fetch time slots
      const { data: slotsData, error: slotsErr } = await supabase
        .from('time_slots')
        .select('*')
        .order('departure_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (!slotsErr && slotsData && slotsData.length > 0) {
        const slotIds = slotsData.map((s) => s.id);

        let membersData: any[] = [];
        try {
          const { data, error } = await supabase
            .from('slot_members')
            .select('id, slot_id, user_id, joined_at, ride_pref, target_size, pickup_note, profile:profiles(id, display_name, email, avatar_url)')
            .in('slot_id', slotIds);

          if (!error && data) {
            membersData = data;
          } else {
            const { data: fallbackMembers } = await supabase
              .from('slot_members')
              .select('*')
              .in('slot_id', slotIds);
            membersData = fallbackMembers || [];
          }
        } catch (e) {
          console.warn('Error fetching slot_members:', e);
        }

        const result: SlotWithDetails[] = slotsData.map((slot: any) => {
          const slotMembers: SlotMember[] = membersData
            .filter((m) => m.slot_id === slot.id)
            .map((m) => ({
              id: m.id,
              slot_id: m.slot_id,
              user_id: m.user_id,
              joined_at: m.joined_at,
              ride_pref: m.ride_pref,
              target_size: m.target_size,
              pickup_note: m.pickup_note,
              pickup_point: slot.pickup_point || 'SRM AP Gate 3',
              profile: m.profile,
            }));

          const isUserJoined = Boolean(
            currentUserId && slotMembers.some((m) => m.user_id === currentUserId)
          );

          return {
            id: slot.id,
            destination: slot.destination,
            departure_date: slot.departure_date,
            start_time: slot.start_time,
            end_time: slot.end_time,
            target_size: slot.target_size || 4,
            ride_type: slot.ride_type || 'auto',
            pickup_point: slot.pickup_point || 'SRM AP Gate 3',
            created_at: slot.created_at,
            members: slotMembers,
            memberCount: slotMembers.length,
            isUserJoined,
          };
        });

        return result;
      }
    } catch (err) {
      console.warn('Supabase fetchAllRides failed, falling back to local store:', err);
    }
  }

  // Fallback to local in-memory/localStorage store
  const localRides = loadLocalRides();
  return localRides.map((slot) => {
    const isUserJoined = Boolean(
      currentUserId && slot.members.some((m) => m.user_id === currentUserId)
    );
    return {
      ...slot,
      isUserJoined,
      memberCount: slot.members.length,
    };
  });
}

/**
 * Create a new slot and join the user, or join an existing matching slot
 */
export async function createAndJoinRide(params: {
  destination: string;
  departureDate: string;
  startTime: string;
  endTime: string;
  pickupPoint: string;
  userId: string;
  targetSize?: number;
  ridePref?: string;
  pickupNote?: string;
  slotId?: string;
  userName?: string;
  userAvatar?: string;
}): Promise<SlotWithDetails | null> {
  const {
    destination,
    departureDate,
    startTime,
    endTime,
    pickupPoint,
    userId,
    targetSize = 4,
    ridePref = 'auto',
    pickupNote = '',
    slotId: targetSlotId,
    userName = 'Student',
    userAvatar,
  } = params;

  const validTargetSize = Math.min(12, Math.max(2, targetSize));

  const supabase = getSupabase();
  if (supabase) {
    try {
      let slotId: string = targetSlotId || '';
      let slotRecord: any;

      if (slotId) {
        const { data: byId } = await supabase
          .from('time_slots')
          .select('*')
          .eq('id', slotId)
          .maybeSingle();
        slotRecord = byId;
      }

      if (!slotRecord) {
        // Check by destination, date & time
        const { data: existingSlots } = await supabase
          .from('time_slots')
          .select('*')
          .eq('departure_date', departureDate)
          .eq('destination', destination)
          .eq('start_time', startTime)
          .limit(1);

        if (existingSlots && existingSlots.length > 0) {
          slotRecord = existingSlots[0];
          slotId = slotRecord.id;
        } else {
          const { data: newSlot, error: createErr } = await supabase
            .from('time_slots')
            .insert({
              destination,
              departure_date: departureDate,
              start_time: startTime,
              end_time: endTime,
              target_size: validTargetSize,
              ride_type: ridePref,
              pickup_point: pickupPoint,
            })
            .select()
            .single();

          if (createErr || !newSlot) {
            throw createErr;
          }
          slotRecord = newSlot;
          slotId = newSlot.id;
        }
      }

      // Insert membership
      const { data: existingMember } = await supabase
        .from('slot_members')
        .select('id')
        .eq('slot_id', slotId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!existingMember) {
        await supabase.from('slot_members').insert({
          slot_id: slotId,
          user_id: userId,
          target_size: validTargetSize,
          ride_pref: ridePref,
          pickup_note: pickupNote || pickupPoint,
        });
      }

      const all = await fetchAllRides(userId);
      const updated = all.find((s) => s.id === slotId);
      if (updated) return updated;
    } catch (err) {
      console.warn('Supabase createAndJoinRide failed, using local store fallback:', err);
    }
  }

  // Local fallback store
  const localRides = loadLocalRides();
  let existingIndex = -1;

  if (targetSlotId) {
    existingIndex = localRides.findIndex((s) => s.id === targetSlotId);
  }

  if (existingIndex < 0) {
    existingIndex = localRides.findIndex(
      (s) =>
        s.destination.toLowerCase() === destination.toLowerCase() &&
        s.departure_date === departureDate &&
        s.start_time.slice(0, 5) === startTime.slice(0, 5)
    );
  }

  const newMember: SlotMember = {
    id: toValidUuid(`mem-${Date.now()}`),
    slot_id: '',
    user_id: userId,
    joined_at: new Date().toISOString(),
    ride_pref: ridePref,
    target_size: validTargetSize,
    pickup_note: pickupNote || pickupPoint,
    pickup_point: pickupPoint,
    profile: {
      id: userId,
      display_name: userName || 'You (Student)',
      email: null,
      avatar_url: userAvatar || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };

  if (existingIndex >= 0) {
    const existing = localRides[existingIndex];
    newMember.slot_id = existing.id;
    if (!existing.members.some((m) => m.user_id === userId)) {
      existing.members.push(newMember);
      existing.memberCount = existing.members.length;
      existing.isUserJoined = true;
    }
    // Update targetSize if user specified a larger capacity up to 12
    if (validTargetSize > (existing.target_size || 4)) {
      existing.target_size = validTargetSize;
    }
    saveLocalRides(localRides);
    return existing;
  }

  const newSlotId = toValidUuid(`slot-${Date.now()}`);
  newMember.slot_id = newSlotId;

  const newRide: SlotWithDetails = {
    id: newSlotId,
    destination,
    departure_date: departureDate,
    start_time: startTime,
    end_time: endTime,
    target_size: validTargetSize,
    ride_type: ridePref,
    pickup_point: pickupPoint,
    created_at: new Date().toISOString(),
    memberCount: 1,
    isUserJoined: true,
    members: [newMember],
  };

  localRides.unshift(newRide);
  saveLocalRides(localRides);
  return newRide;
}

/**
 * Leave a ride in Supabase (with local fallback)
 */
export async function leaveRideInSupabase(slotId: string, userId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase
        .from('slot_members')
        .delete()
        .eq('slot_id', slotId)
        .eq('user_id', userId);
    } catch (e) {
      console.warn('leaveRide Supabase exception:', e);
    }
  }

  // Update local store as well
  const localRides = loadLocalRides();
  const ride = localRides.find((s) => s.id === slotId);
  if (ride) {
    ride.members = ride.members.filter((m) => m.user_id !== userId);
    ride.memberCount = ride.members.length;
    ride.isUserJoined = false;
    saveLocalRides(localRides);
  }
  return true;
}

/**
 * Fetch messages for a slot (with local fallback)
 */
export async function fetchMessagesForSlot(slotId: string): Promise<Message[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*, profile:profiles(id, display_name, email, avatar_url)')
        .eq('slot_id', slotId)
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        return data as Message[];
      }
    } catch (e) {
      console.warn('fetchMessagesForSlot Supabase notice:', e);
    }
  }

  const allMsgs = loadLocalMessages();
  return allMsgs[slotId] || [];
}

/**
 * Post a message to a slot (with local fallback)
 */
export async function postMessageToSlot(
  slotId: string,
  userId: string,
  content: string
): Promise<Message | null> {
  const trimmed = content.trim();
  if (!trimmed) return null;

  const localMsg: Message = {
    id: toValidUuid(`msg-${Date.now()}`),
    slot_id: slotId,
    user_id: userId,
    content: trimmed,
    created_at: new Date().toISOString(),
    profile: {
      id: userId,
      display_name: 'You',
      email: null,
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          slot_id: slotId,
          user_id: userId,
          content: trimmed,
        })
        .select('*, profile:profiles(id, display_name, email, avatar_url)')
        .single();

      if (!error && data) {
        return data as Message;
      }
    } catch (e) {
      console.warn('postMessageToSlot Supabase notice:', e);
    }
  }

  // Local fallback
  const allMsgs = loadLocalMessages();
  if (!allMsgs[slotId]) {
    allMsgs[slotId] = [];
  }
  allMsgs[slotId].push(localMsg);
  saveLocalMessages(allMsgs);
  return localMsg;
}
