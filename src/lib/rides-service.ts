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
    const tempChannel = supabase.channel(`broadcast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
    tempChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        tempChannel.send({
          type: 'broadcast',
          event: 'ride_updated',
          payload: { timestamp: Date.now() },
        });
        setTimeout(() => {
          try {
            supabase.removeChannel(tempChannel);
          } catch {}
        }, 1000);
      }
    });
  } catch (err) {
    console.warn('broadcastRideUpdate notice:', err);
  }
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
    const tempChatChannel = supabase.channel(`chat_bcast_${slotId}_${Date.now()}`);
    tempChatChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        tempChatChannel.send({
          type: 'broadcast',
          event: 'new_msg',
          payload: message,
        });
        setTimeout(() => {
          try {
            supabase.removeChannel(tempChatChannel);
          } catch {}
        }, 1000);
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

      // Build profileMap from all registered users stored in Supabase profiles
      const profileMap = new Map<string, Profile>();

      // Fetch profiles table directly: supports profiles.name & profiles.display_name
      try {
        const { data: profiles } = await supabase.from('profiles').select('*');
        if (profiles) {
          profiles.forEach((p: any) => {
            const actualName =
              (p.name && typeof p.name === 'string' && p.name.trim()) ||
              (p.display_name && typeof p.display_name === 'string' && p.display_name.trim()) ||
              '';
            const normalizedProfile: Profile = {
              id: p.id,
              name: actualName || null,
              display_name: actualName || null,
              email: p.email || null,
              avatar_url: p.avatar_url || null,
              created_at: p.created_at || new Date().toISOString(),
              updated_at: p.updated_at || new Date().toISOString(),
            };
            if (p.id) profileMap.set(p.id, normalizedProfile);
            if (p.email) profileMap.set(p.email.toLowerCase().trim(), normalizedProfile);
          });
        }
      } catch (err) {
        console.warn('fetchAllRides profiles query notice:', err);
      }

      // Also merge any users stored in registration slots
      (rawSlotsData || []).forEach((s: any) => {
        if (s.destination?.startsWith('__better_ride_user__:')) {
          try {
            const rawJson = s.destination.replace('__better_ride_user__:', '');
            const parsed = JSON.parse(rawJson) as Profile;
            if (parsed) {
              const actualName = (parsed.name && parsed.name.trim()) || (parsed.display_name && parsed.display_name.trim()) || '';
              const prof: Profile = {
                id: parsed.id,
                name: actualName || null,
                display_name: actualName || null,
                email: parsed.email || null,
                avatar_url: parsed.avatar_url || null,
                created_at: parsed.created_at || new Date().toISOString(),
                updated_at: parsed.updated_at || new Date().toISOString(),
              };
              if (parsed.id) profileMap.set(parsed.id, prof);
              if (parsed.email) profileMap.set(parsed.email.toLowerCase().trim(), prof);
            }
          } catch {}
        }
      });

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

      // 1.5 Extract slot metadata (target_size, ride_type, etc.) synced across Supabase
      const slotMetaMap = new Map<string, { target_size?: number; ride_type?: string }>();
      (rawSlotsData || []).forEach((s: any) => {
        if (s.destination?.startsWith('__better_ride_slot_meta__:')) {
          try {
            const rawJson = s.destination.replace('__better_ride_slot_meta__:', '');
            const parsed = JSON.parse(rawJson);
            if (parsed && parsed.slot_id) {
              const sz = parsed.target_size ? Number(parsed.target_size) : undefined;
              slotMetaMap.set(parsed.slot_id, {
                target_size: sz && sz >= 2 ? sz : undefined,
                ride_type: parsed.ride_type || undefined,
              });
            }
          } catch {}
        }
      });

      let localSlotMeta: Record<string, { target_size?: number; ride_type?: string }> = {};
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('better_ride_slot_metadata');
          if (raw) localSlotMeta = JSON.parse(raw);
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

        // 2. Fetch slot_members (and ride_members if available)
        let membersData: any[] = [];
        if (slotIds.length > 0) {
          try {
            const { data: mData, error: mErr } = await supabase
              .from('slot_members')
              .select('*')
              .in('slot_id', slotIds);

            if (!mErr && mData) {
              membersData = mData;
            } else {
              const { data: mDataBase } = await supabase
                .from('slot_members')
                .select('id, slot_id, user_id, joined_at')
                .in('slot_id', slotIds);
              if (mDataBase) membersData = mDataBase;
            }
          } catch (e) {
            console.warn('Error fetching slot_members:', e);
          }

          // Check ride_members if slot_members returned no rows or as alias
          try {
            const { data: rmData, error: rmErr } = await supabase
              .from('ride_members')
              .select('*')
              .in('slot_id', slotIds);
            if (!rmErr && rmData && rmData.length > 0) {
              rmData.forEach((rm: any) => {
                if (!membersData.some((m) => m.slot_id === rm.slot_id && m.user_id === rm.user_id)) {
                  membersData.push(rm);
                }
              });
            }
          } catch {}
        }

        // Also check fallback members stored in time_slots (__better_ride_member__:)
        (rawSlotsData || []).forEach((s: any) => {
          if (s.destination?.startsWith('__better_ride_member__:')) {
            try {
              const parsed = JSON.parse(s.destination.replace('__better_ride_member__:', ''));
              if (parsed && parsed.slot_id && slotIds.includes(parsed.slot_id)) {
                const stableId = toValidUuid(`fallback-${parsed.slot_id}-${parsed.user_id}`);
                const existing = membersData.find(
                  (m) => m.slot_id === parsed.slot_id && m.user_id === parsed.user_id
                );
                
                if (existing) {
                  if (parsed.name && !existing.pickup_note?.includes(parsed.name)) {
                    existing.pickup_note = JSON.stringify({ name: parsed.name, avatar: parsed.avatar });
                  }
                } else {
                  if (!membersData.some(m => m.id === stableId)) {
                    membersData.push({
                      id: stableId,
                      slot_id: parsed.slot_id,
                      user_id: parsed.user_id,
                      joined_at: parsed.joined_at || s.created_at,
                      pickup_note: JSON.stringify({ name: parsed.name, avatar: parsed.avatar }),
                      ride_pref: parsed.ride_pref || 'auto',
                    });
                  }
                }
              }
            } catch {}
          }
        });

        supabaseRides = slotsData.map((slot: any) => {
          const slotMeta = slotMetaMap.get(slot.id);
          const cachedSlotMeta = localSlotMeta[slot.id];
          const memberWithTarget = membersData.find((m) => m.slot_id === slot.id && m.target_size);
          let memberNoteTarget: number | null = null;
          const memberWithNote = membersData.find((m) => m.slot_id === slot.id && m.pickup_note);
          if (memberWithNote && typeof memberWithNote.pickup_note === 'string') {
            try {
              const parsed = JSON.parse(memberWithNote.pickup_note);
              if (parsed?.target_size && Number(parsed.target_size) >= 2) {
                memberNoteTarget = Number(parsed.target_size);
              }
            } catch {}
          }

          const finalTargetSize =
            (slot.target_size && Number(slot.target_size) >= 2 ? Number(slot.target_size) : null) ||
            (slotMeta?.target_size && Number(slotMeta.target_size) >= 2 ? Number(slotMeta.target_size) : null) ||
            memberNoteTarget ||
            (memberWithTarget?.target_size && Number(memberWithTarget.target_size) >= 2 ? Number(memberWithTarget.target_size) : null) ||
            (cachedSlotMeta?.target_size && Number(cachedSlotMeta.target_size) >= 2 ? Number(cachedSlotMeta.target_size) : null) ||
            4;

          const finalRideType =
            slot.ride_type ||
            slotMeta?.ride_type ||
            cachedSlotMeta?.ride_type ||
            'auto';

          if (typeof window !== 'undefined') {
            try {
              if (localSlotMeta[slot.id]?.target_size !== finalTargetSize) {
                localSlotMeta[slot.id] = { target_size: finalTargetSize, ride_type: finalRideType };
                localStorage.setItem('better_ride_slot_metadata', JSON.stringify(localSlotMeta));
              }
            } catch {}
          }

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

              const isCurrentUser = Boolean(
                (safeCurrentUserId && m.user_id === safeCurrentUserId) ||
                (currentUserId && m.user_id === currentUserId)
              );

              // 2. User Name Bug fix: ride_members.user_id -> profiles.id -> profiles.name / display_name
              const candidateName =
                matchedProf?.name ||
                matchedProf?.display_name ||
                matchedById?.name ||
                matchedById?.display_name ||
                matchedLocal?.name ||
                matchedLocal?.display_name ||
                embeddedName;

              const hasValidRealName =
                candidateName &&
                candidateName.trim() !== '' &&
                candidateName.trim().toLowerCase() !== 'student' &&
                candidateName.trim().toLowerCase() !== 'campus member';

              const memberActualName = hasValidRealName
                ? candidateName.trim()
                : isCurrentUser
                ? 'You'
                : matchedProf?.email
                ? matchedProf.email.split('@')[0]
                : matchedLocal?.email
                ? matchedLocal.email.split('@')[0]
                : 'Member';

              const prof: Profile = {
                id: m.user_id,
                name: memberActualName,
                display_name: memberActualName,
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
                ride_pref: m.ride_pref || finalRideType,
                target_size: finalTargetSize,
                pickup_note: 'SRM AP Gate 3',
                pickup_point: 'SRM AP Gate 3',
                profile: prof,
              };
            });

          const isUserJoined = Boolean(
            (safeCurrentUserId && slotMembers.some((m) => m.user_id === safeCurrentUserId)) ||
            (currentUserId && slotMembers.some((m) => m.user_id === currentUserId))
          );

          return {
            id: slot.id,
            destination: slot.destination,
            departure_date: slot.departure_date,
            start_time: slot.start_time,
            end_time: slot.end_time,
            target_size: finalTargetSize,
            ride_type: finalRideType,
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

  // Supabase rides are authoritative when database is configured
  let finalRides: SlotWithDetails[] = [];

  if (supabaseRides.length > 0) {
    finalRides = supabaseRides;
    saveLocalRides(finalRides);
  } else {
    // Fallback to local persistent cache when offline
    const localRides = loadLocalRides();
    finalRides = localRides.map((slot) => {
      const isUserJoined = Boolean(
        (safeCurrentUserId && slot.members.some((m) => m.user_id === safeCurrentUserId)) ||
        (currentUserId && slot.members.some((m) => m.user_id === currentUserId))
      );
      return {
        ...slot,
        isUserJoined,
        memberCount: slot.members.length,
      };
    });
  }

  return finalRides;
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
  const effectiveName = (userName && userName.trim() && userName.trim().toLowerCase() !== 'student') ? userName.trim() : 'Student';

  const supabase = getSupabase();
  if (supabase) {
    try {
      // 1. Ensure joining user's profile is saved in public.profiles so other clients see their real name
      try {
        const { error: pErr1 } = await supabase.from('profiles').upsert({
          id: validUserId,
          name: effectiveName,
          display_name: effectiveName,
          avatar_url: userAvatar || null,
          updated_at: new Date().toISOString(),
        });
        if (pErr1) {
          await supabase.from('profiles').upsert({
            id: validUserId,
            display_name: effectiveName,
            avatar_url: userAvatar || null,
            updated_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.warn('Profile sync notice during join:', err);
      }

      let slotId: string = targetSlotId || '';
      let slotRecord: any = null;

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

        // Persist slot metadata record so all clients get target_size and ride_type in real-time
        try {
          await supabase.from('time_slots').insert({
            destination: `__better_ride_slot_meta__:${JSON.stringify({
              slot_id: slotId,
              target_size: validTargetSize,
              ride_type: ridePref,
              created_at: new Date().toISOString(),
            })}`,
            departure_date: '1970-01-03',
            start_time: '00:00:00',
            end_time: '00:00:01',
          });
        } catch (mErr) {
          console.warn('Slot metadata broadcast notice:', mErr);
        }

        // Cache slot metadata in localStorage
        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem('better_ride_slot_metadata');
            const metaMap = raw ? JSON.parse(raw) : {};
            metaMap[slotId] = { target_size: validTargetSize, ride_type: ridePref };
            localStorage.setItem('better_ride_slot_metadata', JSON.stringify(metaMap));
          } catch {}
        }
      }

      if (isValidUuid(slotId) && isValidUuid(validUserId)) {
        // Enforce capacity check on the group: count existing members in database!
        const { data: currentMembers } = await supabase
          .from('slot_members')
          .select('id, user_id')
          .eq('slot_id', slotId);

        const currentCount = currentMembers?.length || 0;
        const alreadyIn = currentMembers?.some((m) => m.user_id === validUserId);

        if (!alreadyIn) {
          // Check target_size from slotRecord, metadata, or param
          let maxCapacity = validTargetSize;
          if (slotRecord?.target_size && Number(slotRecord.target_size) >= 2) {
            maxCapacity = Number(slotRecord.target_size);
          } else if (typeof window !== 'undefined') {
            try {
              const raw = localStorage.getItem('better_ride_slot_metadata');
              if (raw) {
                const map = JSON.parse(raw);
                if (map[slotId]?.target_size) maxCapacity = Number(map[slotId].target_size);
              }
            } catch {}
          }

          if (currentCount >= maxCapacity) {
            throw new Error(`This ride group is already full (${currentCount}/${maxCapacity} seats filled). Please join another group or start a new one.`);
          }

          const memberMetadata = JSON.stringify({
            name: effectiveName,
            avatar: userAvatar || null,
            target_size: validTargetSize,
            ride_pref: ridePref,
          });

          // Insert member into slot_members
          const { error: memberInsertErr } = await supabase.from('slot_members').insert({
            slot_id: slotId,
            user_id: validUserId,
            pickup_note: memberMetadata,
            ride_pref: ridePref,
            target_size: validTargetSize,
          });

          if (memberInsertErr) {
            // Retry with base columns
            await supabase.from('slot_members').insert({
              slot_id: slotId,
              user_id: validUserId,
            });
          }

          // Also try inserting into ride_members view/table if available
          try {
            await supabase.from('ride_members').insert({
              slot_id: slotId,
              user_id: validUserId,
            });
          } catch {}
        }
      }

      // Broadcast ride update so all other devices update immediately via Realtime
      broadcastRideUpdate();

      // Re-fetch all rides from Supabase so all client states are updated
      const all = await fetchAllRides(validUserId);
      const updated = all.find((s) => s.id === slotId);
      if (updated) {
        if (forceNewGroup || !targetSlotId) {
          updated.target_size = validTargetSize;
          updated.ride_type = ridePref;
        }
        return updated;
      }
    } catch (err: any) {
      console.warn('Supabase createAndJoinRide exception:', err);
      throw err;
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
      name: effectiveName,
      display_name: effectiveName,
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
      } else {
        throw new Error('This ride group is already full.');
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
export async function leaveRideInSupabase(
  slotId: string,
  userId: string,
  destination?: string,
  departureDate?: string,
  startTime?: string
): Promise<boolean> {
  const validSlotId = isValidUuid(slotId) ? slotId : toValidUuid(slotId);
  const validUserId = isValidUuid(userId) ? userId : toValidUuid(userId);
  const supabase = getSupabase();

  if (supabase) {
    try {
      // 1. Delete from slot_members matching slot_id and user_id
      await supabase
        .from('slot_members')
        .delete()
        .eq('slot_id', validSlotId)
        .eq('user_id', validUserId);

      if (validSlotId !== slotId || validUserId !== userId) {
        await supabase
          .from('slot_members')
          .delete()
          .eq('slot_id', slotId)
          .eq('user_id', userId);
      }

      // Also delete from ride_members if present
      try {
        await supabase
          .from('ride_members')
          .delete()
          .eq('slot_id', validSlotId)
          .eq('user_id', validUserId);
      } catch {}

      // Clean up any metadata in time_slots
      const { data: memberSlots } = await supabase
        .from('time_slots')
        .select('id, destination')
        .eq('departure_date', '1970-01-03')
        .like('destination', '__better_ride_member__:%');

      if (memberSlots) {
        for (const ms of memberSlots) {
          try {
            const parsed = JSON.parse(ms.destination.replace('__better_ride_member__:', ''));
            if (
              (parsed.slot_id === slotId || parsed.slot_id === validSlotId) &&
              (parsed.user_id === userId || parsed.user_id === validUserId)
            ) {
              await supabase.from('time_slots').delete().eq('id', ms.id);
            }
          } catch {}
        }
      }
    } catch (e) {
      console.warn('leaveRide Supabase exception:', e);
    }
  }

  // Update local store
  const localRides = loadLocalRides();
  const ride = localRides.find((s) => s.id === slotId || s.id === validSlotId);
  if (ride) {
    ride.members = ride.members.filter(
      (m) =>
        m.user_id !== userId &&
        m.user_id !== validUserId
    );
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
      // Use unique channel per subscriber to avoid topic collision
      const channelId = `realtime_rides_${Math.random().toString(36).substring(2, 9)}`;
      channel = supabase
        .channel(channelId)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'slot_members' },
          (payload: any) => {
            console.log('[Realtime] slot_members event:', payload.eventType);
            onUpdate();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'ride_members' },
          (payload: any) => {
            console.log('[Realtime] ride_members event:', payload.eventType);
            onUpdate();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'time_slots' },
          (payload: any) => {
            console.log('[Realtime] time_slots event:', payload.eventType);
            onUpdate();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles' },
          (payload: any) => {
            console.log('[Realtime] profiles event:', payload.eventType);
            onUpdate();
          }
        )
        .on('broadcast', { event: 'ride_updated' }, () => {
          onUpdate();
        })
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            console.log('[Realtime] Subscribed to ride updates channel successfully');
          }
        });
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
      const profileMap = new Map<string, Profile>();

      // 1. Fetch profiles table: messages.user_id -> profiles.id -> profiles.name / display_name
      try {
        const { data: profiles } = await supabase.from('profiles').select('*');
        if (profiles) {
          profiles.forEach((p: any) => {
            const actualName =
              (p.name && typeof p.name === 'string' && p.name.trim()) ||
              (p.display_name && typeof p.display_name === 'string' && p.display_name.trim()) ||
              '';
            const normalizedProfile: Profile = {
              id: p.id,
              name: actualName || null,
              display_name: actualName || null,
              email: p.email || null,
              avatar_url: p.avatar_url || null,
              created_at: p.created_at || new Date().toISOString(),
              updated_at: p.updated_at || new Date().toISOString(),
            };
            if (p.id) profileMap.set(p.id, normalizedProfile);
            if (p.email) profileMap.set(p.email.toLowerCase().trim(), normalizedProfile);
          });
        }
      } catch (err) {
        console.warn('fetchMessages profiles notice:', err);
      }

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

      // 2. Fetch from messages table
      const { data: msgTableData, error: msgTableErr } = await supabase
        .from('messages')
        .select('*')
        .eq('slot_id', slotId)
        .order('created_at', { ascending: true });

      const allRawMsgs: any[] = msgTableData || [];

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

        const candidateAuthorName =
          matchedProf?.name ||
          matchedProf?.display_name ||
          matchedById?.name ||
          matchedById?.display_name ||
          matchedLocal?.name ||
          matchedLocal?.display_name ||
          senderNameFromContent;

        const hasValidAuthorName =
          candidateAuthorName &&
          candidateAuthorName.trim() !== '' &&
          candidateAuthorName.trim().toLowerCase() !== 'student' &&
          candidateAuthorName.trim().toLowerCase() !== 'member';

        const authorName = hasValidAuthorName
          ? candidateAuthorName.trim()
          : matchedProf?.email
          ? matchedProf.email.split('@')[0]
          : matchedLocal?.email
          ? matchedLocal.email.split('@')[0]
          : 'Member';

        return {
          id: d.id,
          slot_id: d.slot_id,
          user_id: effectiveUserId,
          content: text,
          created_at: d.created_at,
          profile: {
            id: effectiveUserId,
            name: authorName,
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

  // Ensure profile is in profiles table
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error: pErr } = await supabase.from('profiles').upsert({
        id: validUserId,
        name: senderName,
        display_name: senderName,
        updated_at: new Date().toISOString(),
      });
      if (pErr) {
        await supabase.from('profiles').upsert({
          id: validUserId,
          display_name: senderName,
          updated_at: new Date().toISOString(),
        });
      }
    } catch {}
  }

  const newMsg: Message = {
    id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    slot_id: slotId,
    user_id: validUserId,
    content: trimmed,
    created_at: new Date().toISOString(),
    profile: {
      id: validUserId,
      name: senderName,
      display_name: senderName,
      email: null,
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };

  // Broadcast immediately so active users see it in sub-50ms!
  broadcastMessageToSlot(slotId, newMsg);

  // Always save to local cache
  const localMsgs = loadLocalMessages();
  if (!localMsgs[slotId]) localMsgs[slotId] = [];
  localMsgs[slotId].push(newMsg);
  saveLocalMessages(localMsgs);

  // Persist to Supabase
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
      }

      broadcastMessageToSlot(slotId, newMsg);
      return newMsg;
    } catch (e) {
      console.warn('Supabase postMessageToSlot exception:', e);
      broadcastMessageToSlot(slotId, newMsg);
    }
  }

  return newMsg;
}

