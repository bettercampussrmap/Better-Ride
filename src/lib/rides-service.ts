import { getSupabase } from './supabase';
import { SlotWithDetails, SlotMember, TimeSlot, Message, Profile } from '../types/database';
import { toValidUuid } from './uuid-utils';
import { getTodayISTDateString } from './date-utils';

/**
 * Fetch all rides with real member details from Supabase
 */
export async function fetchAllRides(currentUserId?: string): Promise<SlotWithDetails[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    // 1. Fetch time slots
    const { data: slotsData, error: slotsErr } = await supabase
      .from('time_slots')
      .select('*')
      .order('departure_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (slotsErr || !slotsData) {
      console.warn('Error fetching time_slots:', slotsErr);
      return [];
    }

    if (slotsData.length === 0) {
      return [];
    }

    const slotIds = slotsData.map((s) => s.id);

    // 2. Fetch members for these slots
    let membersData: any[] = [];
    try {
      const { data, error } = await supabase
        .from('slot_members')
        .select('id, slot_id, user_id, joined_at, ride_pref, target_size, pickup_note, profile:profiles(id, display_name, email, avatar_url)')
        .in('slot_id', slotIds);

      if (!error && data) {
        membersData = data;
      } else {
        // Fallback without joined profile if relation naming differs
        const { data: fallbackMembers } = await supabase
          .from('slot_members')
          .select('*')
          .in('slot_id', slotIds);
        membersData = fallbackMembers || [];
      }
    } catch (e) {
      console.warn('Error fetching slot_members:', e);
    }

    // 3. Combine slots with members
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
  } catch (err) {
    console.error('fetchAllRides exception:', err);
    return [];
  }
}

/**
 * Create a new slot in Supabase and join the user, or join an existing matching slot
 */
export async function createAndJoinRide(params: {
  destination: string;
  departureDate: string;
  startTime: string;
  endTime: string;
  pickupPoint: string;
  userId: string;
  targetSize?: number;
}): Promise<SlotWithDetails | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const {
      destination,
      departureDate,
      startTime,
      endTime,
      pickupPoint,
      userId,
      targetSize = 4,
    } = params;

    // 1. Check if a slot already exists for this destination, date & time
    const { data: existingSlots } = await supabase
      .from('time_slots')
      .select('*')
      .eq('departure_date', departureDate)
      .eq('destination', destination)
      .eq('start_time', startTime)
      .limit(1);

    let slotId: string;
    let slotRecord: any;

    if (existingSlots && existingSlots.length > 0) {
      slotRecord = existingSlots[0];
      slotId = slotRecord.id;
    } else {
      // 2. Create the slot in time_slots
      const { data: newSlot, error: createErr } = await supabase
        .from('time_slots')
        .insert({
          destination,
          departure_date: departureDate,
          start_time: startTime,
          end_time: endTime,
          target_size: targetSize,
          ride_type: 'auto',
        })
        .select()
        .single();

      if (createErr || !newSlot) {
        console.error('Error creating time slot in Supabase:', createErr);
        throw createErr;
      }
      slotRecord = newSlot;
      slotId = newSlot.id;
    }

    // 3. Insert membership for user if not already joined
    const { data: existingMember } = await supabase
      .from('slot_members')
      .select('id')
      .eq('slot_id', slotId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!existingMember) {
      const { error: joinErr } = await supabase
        .from('slot_members')
        .insert({
          slot_id: slotId,
          user_id: userId,
          target_size: targetSize,
          ride_pref: 'auto',
          pickup_note: pickupPoint,
        });

      if (joinErr) {
        console.warn('Membership insert note:', joinErr);
      }
    }

    // Return the updated slot object
    const all = await fetchAllRides(userId);
    const updated = all.find((s) => s.id === slotId);
    if (updated) return updated;

    return {
      id: slotId,
      destination,
      departure_date: departureDate,
      start_time: startTime,
      end_time: endTime,
      pickup_point: pickupPoint,
      target_size: targetSize,
      ride_type: 'auto',
      created_at: new Date().toISOString(),
      memberCount: 1,
      isUserJoined: true,
      members: [
        {
          id: toValidUuid(`mem-${Date.now()}`),
          slot_id: slotId,
          user_id: userId,
          joined_at: new Date().toISOString(),
          target_size: targetSize,
          pickup_point: pickupPoint,
        },
      ],
    };
  } catch (err) {
    console.error('createAndJoinRide error:', err);
    return null;
  }
}

/**
 * Leave a ride in Supabase
 */
export async function leaveRideInSupabase(slotId: string, userId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('slot_members')
      .delete()
      .eq('slot_id', slotId)
      .eq('user_id', userId);

    if (error) {
      console.warn('leaveRide error:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('leaveRide exception:', e);
    return false;
  }
}

/**
 * Fetch real messages for a slot
 */
export async function fetchMessagesForSlot(slotId: string): Promise<Message[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*, profile:profiles(id, display_name, email, avatar_url)')
      .eq('slot_id', slotId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      return data as Message[];
    }

    // Fallback without profile join
    const { data: rawMessages } = await supabase
      .from('messages')
      .select('*')
      .eq('slot_id', slotId)
      .order('created_at', { ascending: true });

    return (rawMessages as Message[]) || [];
  } catch (e) {
    console.warn('fetchMessagesForSlot error:', e);
    return [];
  }
}

/**
 * Post a message to a slot in Supabase
 */
export async function postMessageToSlot(
  slotId: string,
  userId: string,
  content: string
): Promise<Message | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        slot_id: slotId,
        user_id: userId,
        content: content.trim(),
      })
      .select('*, profile:profiles(id, display_name, email, avatar_url)')
      .single();

    if (!error && data) {
      return data as Message;
    }

    // Simple return if single select fails
    return {
      id: toValidUuid(`msg-${Date.now()}`),
      slot_id: slotId,
      user_id: userId,
      content: content.trim(),
      created_at: new Date().toISOString(),
    };
  } catch (e) {
    console.error('postMessageToSlot error:', e);
    return null;
  }
}
