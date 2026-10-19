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

  let supabaseRides: SlotWithDetails[] = [];

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
        let usersById: Record<string, any> = {};
        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem('better_ride_database_users');
            if (raw) localUsers = JSON.parse(raw);
            const rawById = localStorage.getItem('better_ride_users_by_id');
            if (rawById) usersById = JSON.parse(rawById);
          } catch {}
        }

        supabaseRides = slotsData.map((slot: any) => {
          const slotMembers: SlotMember[] = membersData
            .filter((m) => m.slot_id === slot.id)
            .map((m) => {
              const matchedProf = profileMap.get(m.user_id);
              const matchedById = usersById[m.user_id];
              const matchedLocal = Object.values(localUsers).find(
                (u: any) => u.id === m.user_id
              ) as any;
              const isCurrentUser = safeCurrentUserId && m.user_id === safeCurrentUserId;

              const realName =
                matchedProf?.display_name ||
                matchedById?.display_name ||
                matchedLocal?.display_name;

              const fallbackName = realName
                ? realName
                : isCurrentUser
                ? 'You'
                : 'Student';

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
                ride_pref: slot.ride_type || 'auto',
                target_size: slot.target_size || 4,
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
            target_size: slot.target_size || 4,
            ride_type: slot.ride_type || 'auto',
            pickup_point: 'SRM AP Gate 3',
            created_at: slot.created_at,
            members: slotMembers,
            memberCount: slotMembers.length,
            isUserJoined,
          };
        });
      }
    } catch (err) {
      console.warn('Supabase fetchAllRides error:', err);
    }
  }

  // Merge supabaseRides and localRides so local/offline-created rides are never lost
  const localRides = loadLocalRides();
  const rideMap = new Map<string, SlotWithDetails>();

  // Add local rides first so local creations are preserved
  localRides.forEach((r) => rideMap.set(r.id, r));

  // Add/override with Supabase rides
  supabaseRides.forEach((r) => {
    const existing = rideMap.get(r.id);
    if (existing) {
      const memberMap = new Map<string, any>();
      existing.members?.forEach((m) => memberMap.set(m.user_id || m.id, m));
      r.members?.forEach((m) => memberMap.set(m.user_id || m.id, m));
      rideMap.set(r.id, {
        ...r,
        members: Array.from(memberMap.values()),
        memberCount: memberMap.size,
        isUserJoined: existing.isUserJoined || r.isUserJoined,
      });
    } else {
      rideMap.set(r.id, r);
    }
  });

  const mergedRides = Array.from(rideMap.values()).map((slot) => {
    const isUserJoined = Boolean(
      safeCurrentUserId && slot.members.some((m) => m.user_id === safeCurrentUserId)
    );
    return {
      ...slot,
      isUserJoined,
      memberCount: slot.members.length,
    };
  });

  saveLocalRides(mergedRides);
  return mergedRides;
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
  forceNewGroup?: boolean;
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
    forceNewGroup = false,
  } = params;

  const validUserId = isValidUuid(userId) ? userId : toValidUuid(userId);
  const validTargetSize = Math.min(12, Math.max(2, targetSize));

  const supabase = getSupabase();
  if (supabase) {
    try {
      let slotId: string = targetSlotId || '';
      let slotRecord: any;

      if (slotId && isValidUuid(slotId)) {
        const { data: byId } = await supabase
          .from('time_slots')
          .select('*')
          .eq('id', slotId)
          .maybeSingle();
        slotRecord = byId;
      }

      // If no specific slot requested or forceNewGroup requested, create a brand new distinct slot
      if (!slotRecord || forceNewGroup || !isValidUuid(slotId)) {
        const { data: newSlot, error: createErr } = await supabase
          .from('time_slots')
          .insert({
            destination,
            departure_date: departureDate,
            start_time: startTime,
            end_time: endTime,
            target_size: validTargetSize,
            ride_type: ridePref,
          })
          .select()
          .maybeSingle();

        if (createErr || !newSlot || !newSlot.id || !isValidUuid(newSlot.id)) {
          throw createErr || new Error('Failed to create valid time slot in Supabase');
        }
        slotRecord = newSlot;
        slotId = newSlot.id;
      }

      if (isValidUuid(slotId) && isValidUuid(validUserId)) {
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
            console.warn('Supabase slot_members insert notice:', memberInsertErr);
          }
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

  if (targetSlotId && !forceNewGroup) {
    existingIndex = localRides.findIndex((s) => s.id === targetSlotId);
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
      if ((existing.members.length || 0) < (existing.target_size || 4)) {
        existing.members.push(newMember);
        existing.memberCount = existing.members.length;
        existing.isUserJoined = true;
      }
    }
    saveLocalRides(localRides);
    return existing;
  }

  // Brand new group created
  const newSlotId = toValidUuid(`slot-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
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
 * Fetch messages for a slot from Supabase and local persistent cache
 */
export async function fetchMessagesForSlot(slotId: string): Promise<Message[]> {
  const supabase = getSupabase();
  let supabaseMessages: Message[] = [];

  if (supabase) {
    try {
      const profileMap = new Map<string, any>();
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

      let localUsers: Record<string, any> = {};
      let usersById: Record<string, any> = {};
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('better_ride_database_users');
          if (raw) localUsers = JSON.parse(raw);
          const rawById = localStorage.getItem('better_ride_users_by_id');
          if (rawById) usersById = JSON.parse(rawById);
        } catch {}
      }

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('slot_id', slotId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        supabaseMessages = data.map((d: any) => {
          const matchedProf = profileMap.get(d.user_id);
          const matchedById = usersById[d.user_id];
          const matchedLocal = Object.values(localUsers).find(
            (u: any) => u.id === d.user_id
          ) as any;

          let text = d.content;
          try {
            if (d.content && d.content.startsWith('{')) {
              const parsed = JSON.parse(d.content);
              if (parsed && parsed.text) text = parsed.text;
            }
          } catch {}

          const authorName =
            matchedProf?.display_name ||
            matchedById?.display_name ||
            matchedLocal?.display_name ||
            'Student';

          return {
            id: d.id,
            slot_id: d.slot_id,
            user_id: d.user_id,
            content: text,
            created_at: d.created_at,
            profile: {
              id: d.user_id,
              display_name: authorName,
              email: matchedProf?.email || matchedLocal?.email || null,
              avatar_url: matchedProf?.avatar_url || matchedLocal?.avatar_url || null,
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

  // Load local persistent messages cache
  const localMsgsMap = loadLocalMessages();
  const localSlotMsgs = localMsgsMap[slotId] || [];

  // Merge and deduplicate
  const msgMap = new Map<string, Message>();
  localSlotMsgs.forEach((m) => msgMap.set(m.id || `${m.user_id}-${m.created_at}`, m));
  supabaseMessages.forEach((m) => msgMap.set(m.id || `${m.user_id}-${m.created_at}`, m));

  const merged = Array.from(msgMap.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return merged;
}

/**
 * Post a message to a slot (saves to Supabase and local cache)
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

  const newMsg: Message = {
    id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
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

  // Always save to local cache immediately so it never disappears
  const localMsgs = loadLocalMessages();
  if (!localMsgs[slotId]) localMsgs[slotId] = [];
  localMsgs[slotId].push(newMsg);
  saveLocalMessages(localMsgs);

  const supabase = getSupabase();
  if (supabase && isValidUuid(slotId)) {
    try {
      const { data, error } = await supabase.from('messages').insert({
        slot_id: slotId,
        user_id: validUserId,
        content: trimmed,
      }).select('*').maybeSingle();

      if (!error && data) {
        newMsg.id = data.id;
        newMsg.created_at = data.created_at;
        return newMsg;
      } else if (error) {
        console.warn('Supabase postMessageToSlot error:', error);
      }
    } catch (e) {
      console.warn('Supabase postMessageToSlot exception:', e);
    }
  }

  return newMsg;
}
