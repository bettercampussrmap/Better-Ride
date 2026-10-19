import { getSupabase } from './supabase';
import { SlotWithDetails, SlotMember, Message, Profile } from '../types/database';
import { toValidUuid, isValidUuid } from './uuid-utils';
import { getTodayISTDateString } from './date-utils';

const STORAGE_KEY_MOCK_RIDES = 'better_ride_mock_slots';
const STORAGE_KEY_MOCK_MESSAGES = 'better_ride_mock_messages';

let inMemoryRides: SlotWithDetails[] | null = null;
let inMemoryMessages: Record<string, Message[]> | null = null;

function loadLocalRides(): SlotWithDetails[] {
  if (inMemoryRides) return inMemoryRides;
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(STORAGE_KEY_MOCK_RIDES);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          inMemoryRides = parsed;
          return inMemoryRides;
        }
      } catch {}
    }
  }
  inMemoryRides = [];
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
          inMemoryMessages = parsed as Record<string, Message[]>;
          return inMemoryMessages;
        }
      } catch {}
    }
  }
  inMemoryMessages = {};
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
 * Fetch all rides with real member details directly from Supabase (with resilient fallback)
 */
export async function fetchAllRides(currentUserId?: string): Promise<SlotWithDetails[]> {
  const supabase = getSupabase();
  const safeCurrentUserId = currentUserId
    ? isValidUuid(currentUserId)
      ? currentUserId
      : toValidUuid(currentUserId)
    : undefined;

  if (supabase) {
    try {
      // 1. Fetch time slots from Supabase
      const { data: slotsData, error: slotsErr } = await supabase
        .from('time_slots')
        .select('*')
        .order('departure_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (!slotsErr && slotsData) {
        const slotIds = slotsData.map((s) => s.id);

        // 2. Fetch slot_members safely (using exact columns present in remote database)
        let membersData: any[] = [];
        if (slotIds.length > 0) {
          try {
            const { data: mData, error: mErr } = await supabase
              .from('slot_members')
              .select('id, slot_id, user_id, joined_at')
              .in('slot_id', slotIds);

            if (!mErr && mData) {
              membersData = mData;
            }
          } catch (e) {
            console.warn('Error fetching slot_members:', e);
          }
        }

        // 3. Retrieve profiles if available to enrich display names
        const profileMap = new Map<string, Profile>();
        try {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, display_name, email, avatar_url');
          if (profiles) {
            profiles.forEach((p: any) => {
              if (p.id) profileMap.set(p.id, p);
            });
          }
        } catch {}

        // Check local users cache for friendly names
        let localUsers: Record<string, any> = {};
        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem('better_ride_database_users');
            if (raw) localUsers = JSON.parse(raw);
          } catch {}
        }

        const result: SlotWithDetails[] = slotsData.map((slot: any) => {
          const slotMembers: SlotMember[] = membersData
            .filter((m) => m.slot_id === slot.id)
            .map((m, idx) => {
              const matchedProf = profileMap.get(m.user_id);
              const matchedLocal = Object.values(localUsers).find(
                (u: any) => u.id === m.user_id
              ) as any;
              const isCurrentUser = safeCurrentUserId && m.user_id === safeCurrentUserId;

              const fallbackName = isCurrentUser
                ? 'You (Student)'
                : matchedProf?.display_name ||
                  matchedLocal?.display_name ||
                  `Student ${idx + 1}`;

              const prof: Profile = {
                id: m.user_id,
                display_name: fallbackName,
                email: matchedProf?.email || matchedLocal?.email || null,
                avatar_url: matchedProf?.avatar_url || matchedLocal?.avatar_url || null,
                created_at: m.joined_at,
                updated_at: m.joined_at,
              };

              return {
                id: m.id,
                slot_id: m.slot_id,
                user_id: m.user_id,
                joined_at: m.joined_at,
                ride_pref: 'auto',
                target_size: 4,
                pickup_note: 'SRM AP Gate 3',
                pickup_point: 'SRM AP Gate 3',
                profile: prof,
              };
            });

          const isUserJoined = Boolean(
            safeCurrentUserId && slotMembers.some((m) => m.user_id === safeCurrentUserId)
          );

          return {
            id: slot.id,
            destination: slot.destination,
            departure_date: slot.departure_date,
            start_time: slot.start_time,
            end_time: slot.end_time,
            target_size: 4,
            ride_type: 'auto',
            pickup_point: 'SRM AP Gate 3',
            created_at: slot.created_at,
            members: slotMembers,
            memberCount: slotMembers.length,
            isUserJoined,
          };
        });

        // Keep local cache fresh with latest data from Supabase
        saveLocalRides(result);
        return result;
      }
    } catch (err) {
      console.warn('Supabase fetchAllRides error, falling back to local store:', err);
    }
  }

  // Fallback to local store if offline
  const localRides = loadLocalRides();
  return localRides.map((slot) => {
    const isUserJoined = Boolean(
      safeCurrentUserId && slot.members.some((m) => m.user_id === safeCurrentUserId)
    );
    return {
      ...slot,
      isUserJoined,
      memberCount: slot.members.length,
    };
  });
}

/**
 * Create a new slot in Supabase and join the user, or join an existing matching slot
 */
export async function createAndJoinRide(params: {
  destination: string;
  departureDate: string;
  startTime: string;
  endTime: string;
  userId: string;
  targetSize?: number;
  ridePref?: string;
  slotId?: string;
  userName?: string;
  userAvatar?: string;
}): Promise<SlotWithDetails | null> {
  const {
    destination,
    departureDate,
    startTime,
    endTime,
    userId,
    targetSize = 4,
    ridePref = 'auto',
    slotId: targetSlotId,
    userName = 'Student',
    userAvatar,
  } = params;

  const validUserId = isValidUuid(userId) ? userId : toValidUuid(userId);
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
        // Check if an existing slot matches destination, departure_date & start_time
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
          // Insert slot into Supabase with standard supported schema columns
          const { data: newSlot, error: createErr } = await supabase
            .from('time_slots')
            .insert({
              destination,
              departure_date: departureDate,
              start_time: startTime,
              end_time: endTime,
            })
            .select()
            .single();

          if (createErr || !newSlot) {
            console.error('Supabase time_slots insert error:', createErr);
            throw createErr;
          }
          slotRecord = newSlot;
          slotId = newSlot.id;
        }
      }

      // Check if user is already in slot_members for this slot
      const { data: existingMember } = await supabase
        .from('slot_members')
        .select('id')
        .eq('slot_id', slotId)
        .eq('user_id', validUserId)
        .maybeSingle();

      if (!existingMember) {
        const { error: memberInsertErr } = await supabase.from('slot_members').insert({
          slot_id: slotId,
          user_id: validUserId,
        });

        if (memberInsertErr) {
          console.error('Supabase slot_members insert error:', memberInsertErr);
          throw memberInsertErr;
        }
      }

      // Re-fetch all rides from Supabase so all client states are updated
      const all = await fetchAllRides(validUserId);
      const updated = all.find((s) => s.id === slotId);
      if (updated) return updated;
    } catch (err) {
      console.warn('Supabase createAndJoinRide exception, using local store fallback:', err);
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
    user_id: validUserId,
    joined_at: new Date().toISOString(),
    ride_pref: ridePref,
    target_size: validTargetSize,
    pickup_note: 'SRM AP Gate 3',
    pickup_point: 'SRM AP Gate 3',
    profile: {
      id: validUserId,
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
    if (!existing.members.some((m) => m.user_id === validUserId)) {
      existing.members.push(newMember);
      existing.memberCount = existing.members.length;
      existing.isUserJoined = true;
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
    pickup_point: 'SRM AP Gate 3',
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
  const validUserId = isValidUuid(userId) ? userId : toValidUuid(userId);
  const supabase = getSupabase();

  if (supabase) {
    try {
      await supabase
        .from('slot_members')
        .delete()
        .eq('slot_id', slotId)
        .eq('user_id', validUserId);
    } catch (e) {
      console.warn('leaveRide Supabase exception:', e);
    }
  }

  // Update local store as well
  const localRides = loadLocalRides();
  const ride = localRides.find((s) => s.id === slotId);
  if (ride) {
    ride.members = ride.members.filter((m) => m.user_id !== validUserId);
    ride.memberCount = ride.members.length;
    ride.isUserJoined = false;
    saveLocalRides(localRides);
  }
  return true;
}

/**
 * Real-time subscription to database changes across devices
 */
export function subscribeToRideUpdates(onUpdate: () => void): () => void {
  const supabase = getSupabase();
  if (!supabase) return () => {};

  try {
    const channel = supabase
      .channel('better_ride_realtime_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'slot_members' },
        () => {
          onUpdate();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'time_slots' },
        () => {
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  } catch (err) {
    console.warn('Realtime subscription error:', err);
    return () => {};
  }
}

export const SHARED_SYSTEM_AUTH_USER = 'c52674ed-5f25-4340-8be9-4bf707126266';

/**
 * Fetch messages for a slot directly from Supabase (with resilient parsing & fallback)
 */
export async function fetchMessagesForSlot(slotId: string): Promise<Message[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('slot_id', slotId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        return data.map((d: any) => {
          let author = 'Student';
          let authorId = d.user_id;
          let text = d.content;

          try {
            if (d.content && d.content.startsWith('{')) {
              const parsed = JSON.parse(d.content);
              if (parsed && typeof parsed === 'object') {
                if (parsed.text) text = parsed.text;
                if (parsed.author) author = parsed.author;
                if (parsed.authorId) authorId = parsed.authorId;
              }
            }
          } catch {}

          return {
            id: d.id,
            slot_id: d.slot_id,
            user_id: authorId,
            content: text,
            created_at: d.created_at,
            profile: {
              id: authorId,
              display_name: author,
              email: null,
              avatar_url: null,
              created_at: d.created_at,
              updated_at: d.created_at,
            },
          } as Message;
        });
      }
    } catch (e) {
      console.warn('fetchMessagesForSlot Supabase notice:', e);
    }
  }

  const allMsgs = loadLocalMessages();
  return allMsgs[slotId] || [];
}

/**
 * Post a message to a slot in Supabase (synced across all joined devices)
 */
export async function postMessageToSlot(
  slotId: string,
  userId: string,
  content: string,
  userName?: string
): Promise<Message | null> {
  const trimmed = content.trim();
  if (!trimmed) return null;
  const validUserId = isValidUuid(userId) ? userId : toValidUuid(userId);
  const senderName = userName || 'Student';

  const payload = JSON.stringify({
    author: senderName,
    authorId: validUserId,
    text: trimmed,
  });

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          slot_id: slotId,
          user_id: SHARED_SYSTEM_AUTH_USER,
          content: payload,
        })
        .select('*')
        .single();

      if (!error && data) {
        return {
          id: data.id,
          slot_id: data.slot_id,
          user_id: validUserId,
          content: trimmed,
          created_at: data.created_at,
          profile: {
            id: validUserId,
            display_name: senderName,
            email: null,
            avatar_url: null,
            created_at: data.created_at,
            updated_at: data.created_at,
          },
        };
      } else if (error) {
        console.error('postMessageToSlot Supabase error:', error);
      }
    } catch (e) {
      console.warn('postMessageToSlot Supabase notice:', e);
    }
  }

  // Local fallback
  const localMsg: Message = {
    id: toValidUuid(`msg-${Date.now()}`),
    slot_id: slotId,
    user_id: validUserId,
    content: trimmed,
    created_at: new Date().toISOString(),
    profile: {
      id: validUserId,
      display_name: senderName,
      email: null,
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };

  const allMsgs = loadLocalMessages();
  if (!allMsgs[slotId]) {
    allMsgs[slotId] = [];
  }
  allMsgs[slotId].push(localMsg);
  saveLocalMessages(allMsgs);
  return localMsg;
}
