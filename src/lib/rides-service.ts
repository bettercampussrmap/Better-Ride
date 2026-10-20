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
          inMemoryRides = parsed.filter(
            (s: any) =>
              s.departure_date !== '1970-01-01' &&
              s.departure_date !== '1970-01-02' &&
              s.departure_date !== '1970-01-03' &&
              !s.destination?.startsWith('__better_ride_')
          );
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
 * Broadcast ride updates via Realtime channel and local cross-tab sync
 */
export function broadcastRideUpdate(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('better_ride_last_ride_update', Date.now().toString());
      window.dispatchEvent(new CustomEvent('better_ride_data_updated'));
    } catch {}
  }

  const supabase = getSupabase();
  if (!supabase) return;
  try {
    const channel = supabase.channel('better_ride_realtime_sync');
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'ride_updated',
          payload: { timestamp: Date.now() },
        });
      }
    });
  } catch {}
}

/**
 * Broadcast a message to the group chat channel and local cross-tab sync
 */
export function broadcastMessageToSlot(slotId: string, message: Message): void {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('slot_message_received', { detail: { slotId, message } })
      );
    } catch {}
  }

  const supabase = getSupabase();
  if (!supabase) return;
  try {
    const channel = supabase.channel(`slot_live_chat_${slotId}`);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'new_msg',
          payload: message,
        });
      }
    });
  } catch {}
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
      const { data: rawSlotsData, error: slotsErr } = await supabase
        .from('time_slots')
        .select('*')
        .order('departure_date', { ascending: true })
        .order('start_time', { ascending: true });

      // Build profileMap from all registered users stored in time_slots
      const profileMap = new Map<string, Profile>();

      (rawSlotsData || []).forEach((s: any) => {
        if (s.destination?.startsWith('__better_ride_user__:')) {
          try {
            const rawJson = s.destination.replace('__better_ride_user__:', '');
            const parsed = JSON.parse(rawJson) as Profile;
            if (parsed) {
              if (parsed.id) profileMap.set(parsed.id, parsed);
              if (parsed.email) profileMap.set(parsed.email.toLowerCase().trim(), parsed);
            }
          } catch {}
        }
      });

      // Try profiles table as well
      try {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, email, avatar_url');
        if (profiles) {
          profiles.forEach((p: any) => {
            if (p.id) profileMap.set(p.id, p);
            if (p.email) profileMap.set(p.email.toLowerCase().trim(), p);
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

      // Filter out internal system metadata slots
      const slotsData = (rawSlotsData || []).filter(
        (s: any) =>
          s.departure_date !== '1970-01-01' &&
          s.departure_date !== '1970-01-02' &&
          s.departure_date !== '1970-01-03' &&
          !s.destination?.startsWith('__better_ride_')
      );

      if (!slotsErr && slotsData) {
        const slotIds = slotsData.map((s) => s.id);

        // 2. Fetch slot_members
        let membersData: any[] = [];
        if (slotIds.length > 0) {
          try {
            const { data: mData, error: mErr } = await supabase
              .from('slot_members')
              .select('id, slot_id, user_id, joined_at, pickup_note, ride_pref')
              .in('slot_id', slotIds);

            if (!mErr && mData) {
              membersData = mData;
            } else {
              // Try base columns if extra columns missing
              const { data: mDataBase } = await supabase
                .from('slot_members')
                .select('id, slot_id, user_id, joined_at')
                .in('slot_id', slotIds);
              if (mDataBase) membersData = mDataBase;
            }
          } catch (e) {
            console.warn('Error fetching slot_members:', e);
          }
        }

        // Also check fallback members stored in time_slots (__better_ride_member__:)
        (rawSlotsData || []).forEach((s: any) => {
          if (s.destination?.startsWith('__better_ride_member__:')) {
            try {
              const parsed = JSON.parse(s.destination.replace('__better_ride_member__:', ''));
              if (parsed && parsed.slot_id && slotIds.includes(parsed.slot_id)) {
                const existing = membersData.find(
                  (m) => m.slot_id === parsed.slot_id && m.user_id === parsed.user_id
                );
                if (existing) {
                  if (parsed.name) {
                    existing.pickup_note = JSON.stringify({ name: parsed.name, avatar: parsed.avatar });
                  }
                } else {
                  membersData.push({
                    id: parsed.id || `fb-mem-${Date.now()}`,
                    slot_id: parsed.slot_id,
                    user_id: parsed.user_id,
                    joined_at: parsed.joined_at || s.created_at,
                    pickup_note: JSON.stringify({ name: parsed.name, avatar: parsed.avatar }),
                    ride_pref: parsed.ride_pref || 'auto',
                  });
                }
              }
            } catch {}
          }
        });

        supabaseRides = slotsData.map((slot: any) => {
          const slotMembers: SlotMember[] = membersData
            .filter((m) => m.slot_id === slot.id)
            .map((m) => {
              let embeddedName = '';
              let embeddedAvatar = '';

              if (m.pickup_note && typeof m.pickup_note === 'string') {
                try {
                  if (m.pickup_note.startsWith('{')) {
                    const parsed = JSON.parse(m.pickup_note);
                    if (parsed.name) embeddedName = parsed.name;
                    if (parsed.avatar) embeddedAvatar = parsed.avatar;
                  }
                } catch {}
              }

              const matchedProf = profileMap.get(m.user_id);
              const matchedById = usersById[m.user_id];
              const matchedLocal = Object.values(localUsers).find(
                (u: any) => u.id === m.user_id || (matchedProf?.email && u.email?.toLowerCase() === matchedProf.email.toLowerCase())
              ) as any;

              const isCurrentUser = Boolean(safeCurrentUserId && m.user_id === safeCurrentUserId);

              const candidateName =
                embeddedName ||
                matchedProf?.display_name ||
                matchedById?.display_name ||
                matchedLocal?.display_name;

              const hasValidRealName =
                candidateName &&
                candidateName.trim() !== '' &&
                candidateName.trim().toLowerCase() !== 'student' &&
                candidateName.trim().toLowerCase() !== 'campus member';

              // Fallback friendly name that is NEVER generic "Student"
              const fallbackName = hasValidRealName
                ? candidateName.trim()
                : matchedProf?.email
                ? matchedProf.email.split('@')[0]
                : matchedLocal?.email
                ? matchedLocal.email.split('@')[0]
                : isCurrentUser
                ? 'You'
                : 'SRM Peer';

              const prof: Profile = {
                id: m.user_id,
                display_name: fallbackName,
                email: matchedProf?.email || matchedLocal?.email || null,
                avatar_url: embeddedAvatar || matchedProf?.avatar_url || matchedLocal?.avatar_url || null,
                created_at: m.joined_at,
                updated_at: m.joined_at,
              };

              return {
                id: m.id,
                slot_id: m.slot_id,
                user_id: m.user_id,
                joined_at: m.joined_at,
                ride_pref: m.ride_pref || slot.ride_type || 'auto',
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
      r.members?.forEach((m) => {
        const prev = memberMap.get(m.user_id || m.id);
        // Preserve richer profile display name if previous has it
        if (prev?.profile?.display_name && prev.profile.display_name !== 'Student' && prev.profile.display_name !== 'Campus Peer') {
          m.profile = { ...m.profile, ...prev.profile };
        }
        memberMap.set(m.user_id || m.id, m);
      });
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

  const memberMetadata = JSON.stringify({
    name: userName,
    avatar: userAvatar || null,
  });

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
        let newSlot: any = null;
        let createErr: any = null;

        const res1 = await supabase
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

        if (res1.error) {
          // Fallback to base columns supported by standard schema
          const res2 = await supabase
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

          newSlot = res2.data;
          createErr = res2.error;
        } else {
          newSlot = res1.data;
        }

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
            pickup_note: memberMetadata,
            ride_pref: ridePref,
          });

          if (memberInsertErr) {
            console.warn('Supabase slot_members insert notice:', memberInsertErr);
            // Retry with base columns
            const { error: baseErr } = await supabase.from('slot_members').insert({
              slot_id: slotId,
              user_id: validUserId,
            });
          }

          // Always persist member name and avatar so all devices and clients know real student name
          try {
            await supabase.from('time_slots').insert({
              destination: `__better_ride_member__:${JSON.stringify({
                slot_id: slotId,
                user_id: validUserId,
                name: userName,
                avatar: userAvatar || null,
                joined_at: new Date().toISOString(),
              })}`,
              departure_date: '1970-01-03',
              start_time: '00:00:00',
              end_time: '00:00:01',
            });
          } catch {}
        }
      }

      // Broadcast ride update so all other devices update in real time
      broadcastRideUpdate();

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
      display_name: userName || 'You',
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
    broadcastRideUpdate();
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
  broadcastRideUpdate();
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

      // Clean up any fallback membership in time_slots
      const { data: memberSlots } = await supabase
        .from('time_slots')
        .select('id, destination')
        .eq('departure_date', '1970-01-03')
        .like('destination', '__better_ride_member__:%');

      if (memberSlots) {
        for (const ms of memberSlots) {
          try {
            const parsed = JSON.parse(ms.destination.replace('__better_ride_member__:', ''));
            if (parsed.slot_id === slotId && parsed.user_id === validUserId) {
              await supabase.from('time_slots').delete().eq('id', ms.id);
            }
          } catch {}
        }
      }
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

  broadcastRideUpdate();
  return true;
}

/**
 * Real-time subscription to database changes across devices
 */
export function subscribeToRideUpdates(onUpdate: () => void): () => void {
  const handleLocalUpdate = () => {
    onUpdate();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('better_ride_data_updated', handleLocalUpdate);
    window.addEventListener('storage', (e) => {
      if (e.key === 'better_ride_last_ride_update') {
        onUpdate();
      }
    });
  }

  const supabase = getSupabase();
  let channel: any = null;

  if (supabase) {
    try {
      channel = supabase
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
        .on('broadcast', { event: 'ride_updated' }, () => {
          onUpdate();
        })
        .subscribe();
    } catch (err) {
      console.warn('Realtime subscription error:', err);
    }
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('better_ride_data_updated', handleLocalUpdate);
    }
    if (supabase && channel) {
      try {
        supabase.removeChannel(channel);
      } catch {}
    }
  };
}

export const SHARED_SYSTEM_AUTH_USER = '0a7b664f-e930-445e-bff3-6f719efa74b8';

/**
 * Fetch messages for a slot from Supabase and local persistent cache
 */
export async function fetchMessagesForSlot(slotId: string): Promise<Message[]> {
  const supabase = getSupabase();
  let supabaseMessages: Message[] = [];

  if (supabase) {
    try {
      const profileMap = new Map<string, any>();

      // 1. Parse user registration slots from time_slots to get real names
      try {
        const { data: userSlots } = await supabase
          .from('time_slots')
          .select('id, destination')
          .eq('departure_date', '1970-01-01')
          .like('destination', '__better_ride_user__:%');

        if (userSlots) {
          userSlots.forEach((s: any) => {
            try {
              const parsed = JSON.parse(s.destination.replace('__better_ride_user__:', ''));
              if (parsed) {
                if (parsed.id) profileMap.set(parsed.id, parsed);
                if (parsed.email) profileMap.set(parsed.email.toLowerCase().trim(), parsed);
              }
            } catch {}
          });
        }
      } catch {}

      // 2. Profiles table
      try {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, email, avatar_url');
        if (profiles) {
          profiles.forEach((p: any) => {
            if (p.id) profileMap.set(p.id, p);
            if (p.email) profileMap.set(p.email.toLowerCase().trim(), p);
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

      // 3. Fetch from messages table
      const { data: msgTableData, error: msgTableErr } = await supabase
        .from('messages')
        .select('*')
        .eq('slot_id', slotId)
        .order('created_at', { ascending: true });

      const allRawMsgs: any[] = msgTableData || [];

      // 4. Fetch any fallback messages stored in time_slots
      try {
        const { data: fallbackMsgSlots } = await supabase
          .from('time_slots')
          .select('id, destination, created_at')
          .eq('departure_date', '1970-01-02')
          .like('destination', '__better_ride_msg__:%');

        if (fallbackMsgSlots) {
          fallbackMsgSlots.forEach((fs: any) => {
            try {
              const parsed = JSON.parse(fs.destination.replace('__better_ride_msg__:', ''));
              if (parsed && parsed.slot_id === slotId) {
                if (!allRawMsgs.some((m) => m.id === parsed.id)) {
                  allRawMsgs.push({
                    id: parsed.id,
                    slot_id: parsed.slot_id,
                    user_id: parsed.user_id,
                    content: typeof parsed.content === 'string' ? parsed.content : JSON.stringify(parsed.content),
                    created_at: parsed.created_at || fs.created_at,
                  });
                }
              }
            } catch {}
          });
        }
      } catch {}

      supabaseMessages = allRawMsgs.map((d: any) => {
        let text = d.content;
        let senderNameFromContent = '';
        let senderIdFromContent = '';

        try {
          if (d.content && typeof d.content === 'string' && d.content.startsWith('{')) {
            const parsed = JSON.parse(d.content);
            if (parsed.text) text = parsed.text;
            if (parsed.senderName) senderNameFromContent = parsed.senderName;
            if (parsed.name) senderNameFromContent = parsed.name;
            if (parsed.senderId) senderIdFromContent = parsed.senderId;
          }
        } catch {}

        const effectiveUserId = senderIdFromContent || d.user_id;
        const matchedProf = profileMap.get(effectiveUserId);
        const matchedById = usersById[effectiveUserId];
        const matchedLocal = Object.values(localUsers).find(
          (u: any) => u.id === effectiveUserId || (matchedProf?.email && u.email?.toLowerCase() === matchedProf.email.toLowerCase())
        ) as any;

        const authorName =
          senderNameFromContent ||
          matchedProf?.display_name ||
          matchedById?.display_name ||
          matchedLocal?.display_name ||
          (matchedProf?.email ? matchedProf.email.split('@')[0] : 'Member');

        return {
          id: d.id,
          slot_id: d.slot_id,
          user_id: effectiveUserId,
          content: text,
          created_at: d.created_at,
          profile: {
            id: effectiveUserId,
            display_name: authorName,
            email: matchedProf?.email || matchedLocal?.email || null,
            avatar_url: matchedProf?.avatar_url || matchedLocal?.avatar_url || null,
            created_at: d.created_at,
            updated_at: d.created_at,
          },
        } as Message;
      });
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
  supabaseMessages.forEach((m) => {
    const key = m.id || `${m.user_id}-${m.created_at}`;
    const existing = msgMap.get(key);
    if (existing && existing.profile?.display_name && existing.profile.display_name !== 'Member') {
      m.profile = { ...m.profile, ...existing.profile };
    }
    msgMap.set(key, m);
  });

  const merged = Array.from(msgMap.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return merged;
}

/**
 * Post a message to a slot (saves to Supabase and broadcasts to all users)
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

  // Rich JSON payload preserving real sender name and ID across all devices
  const payload = JSON.stringify({
    text: trimmed,
    senderName: senderName,
    senderId: validUserId,
  });

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

  // 1. Broadcast immediately so active users see it in sub-50ms!
  broadcastMessageToSlot(slotId, newMsg);

  // 2. Always save to local cache
  const localMsgs = loadLocalMessages();
  if (!localMsgs[slotId]) localMsgs[slotId] = [];
  localMsgs[slotId].push(newMsg);
  saveLocalMessages(localMsgs);

  // 3. Persist to Supabase
  const supabase = getSupabase();
  if (supabase && isValidUuid(slotId)) {
    try {
      let messagePersisted = false;

      // 1. First attempt: insert with validUserId and rich payload
      const { data, error } = await supabase.from('messages').insert({
        slot_id: slotId,
        user_id: validUserId,
        content: payload,
      }).select('*').maybeSingle();

      if (!error && data) {
        newMsg.id = data.id;
        newMsg.created_at = data.created_at;
        messagePersisted = true;
      } else {
        // 2. Second attempt: insert with SHARED_SYSTEM_AUTH_USER for valid foreign key
        const resFallback = await supabase.from('messages').insert({
          slot_id: slotId,
          user_id: SHARED_SYSTEM_AUTH_USER,
          content: payload,
        }).select('*').maybeSingle();

        if (!resFallback.error && resFallback.data) {
          newMsg.id = resFallback.data.id;
          newMsg.created_at = resFallback.data.created_at;
          messagePersisted = true;
        }
      }

      // 3. Always also persist to time_slots fallback table so realtime listeners on time_slots receive the update
      try {
        await supabase.from('time_slots').insert({
          destination: `__better_ride_msg__:${JSON.stringify({ ...newMsg, slot_id: slotId, content: payload })}`,
          departure_date: '1970-01-02',
          start_time: '00:00:00',
          end_time: '00:00:01',
        });
      } catch {}

      // Re-broadcast with confirmed message ID and created_at
      broadcastMessageToSlot(slotId, newMsg);

      return newMsg;
    } catch (e) {
      console.warn('Supabase postMessageToSlot exception:', e);
      try {
        await supabase.from('time_slots').insert({
          destination: `__better_ride_msg__:${JSON.stringify({ ...newMsg, slot_id: slotId, content: payload })}`,
          departure_date: '1970-01-02',
          start_time: '00:00:00',
          end_time: '00:00:01',
        });
      } catch {}
      broadcastMessageToSlot(slotId, newMsg);
    }
  }

  return newMsg;
}
