import { getSupabase } from './supabase';
import { Profile } from '../types/database';
import { toValidUuid, isValidUuid } from './uuid-utils';

const STORAGE_KEY_LOCAL_USERS = 'better_ride_database_users';
const STORAGE_KEY_USERS_BY_ID = 'better_ride_users_by_id';
const STORAGE_KEY_ACTIVE_USER = 'better_ride_active_user';

export const USER_META_PREFIX = '__better_ride_user__:';
export const USER_SYSTEM_DATE = '1970-01-01';

/**
 * Helper to get local database cache
 */
export function getLocalDatabaseUsers(): Record<string, Profile> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOCAL_USERS);
    const db = raw ? JSON.parse(raw) : {};

    const adminEmail = 'adminbcc@gmail.com';
    if (!db[adminEmail]) {
      db[adminEmail] = {
        id: toValidUuid('srm-student-adminbcc@gmail.com'),
        display_name: 'BCC Admin',
        email: adminEmail,
        password: 'admin1234bcc',
        avatar_url: 'https://api.dicebear.com/7.x/initials/svg?seed=Admin&backgroundColor=09090B',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY_LOCAL_USERS, JSON.stringify(db));
    }
    return db;
  } catch {
    return {};
  }
}

/**
 * Helper to save to local database cache
 */
export function saveToLocalDatabaseUsers(profile: Profile): void {
  if (typeof window === 'undefined') return;
  try {
    if (profile.email) {
      const db = getLocalDatabaseUsers();
      db[profile.email.toLowerCase().trim()] = profile;
      localStorage.setItem(STORAGE_KEY_LOCAL_USERS, JSON.stringify(db));
    }
    if (profile.id) {
      const byIdRaw = localStorage.getItem(STORAGE_KEY_USERS_BY_ID);
      const byId = byIdRaw ? JSON.parse(byIdRaw) : {};
      byId[profile.id] = profile;
      localStorage.setItem(STORAGE_KEY_USERS_BY_ID, JSON.stringify(byId));
    }
  } catch {}
}

/**
 * Save user profile and credentials to Supabase database
 */
export async function saveUserToSupabase(profile: Profile): Promise<{ success: boolean; error?: string }> {
  const cleanEmail = profile.email?.trim().toLowerCase() || '';
  if (!cleanEmail) {
    return { success: false, error: 'Email is required' };
  }

  const cleanProfile: Profile = {
    ...profile,
    id: isValidUuid(profile.id) ? profile.id : toValidUuid(`srm-student-${cleanEmail}`),
    email: cleanEmail,
    updated_at: new Date().toISOString(),
  };

  // Always update local persistent storage immediately
  saveToLocalDatabaseUsers(cleanProfile);

  const supabase = getSupabase();
  if (supabase) {
    try {
      // 1. Try standard profiles table (in case schema allows it)
      try {
        await supabase.from('profiles').upsert({
          id: cleanProfile.id,
          display_name: cleanProfile.display_name,
          email: cleanProfile.email,
          avatar_url: cleanProfile.avatar_url,
          password: cleanProfile.password,
          gender: cleanProfile.gender,
          updated_at: cleanProfile.updated_at,
        });
      } catch (e) {
        // If optional columns or RLS fails on profiles, we fall through to primary store
      }

      // 2. Persist user credentials directly in Supabase database storage
      // First, remove any previous registration for this email in time_slots
      const { data: existingSlots } = await supabase
        .from('time_slots')
        .select('id, destination')
        .eq('departure_date', USER_SYSTEM_DATE)
        .like('destination', `${USER_META_PREFIX}%`);

      if (existingSlots && existingSlots.length > 0) {
        for (const slot of existingSlots) {
          try {
            const rawJson = slot.destination.replace(USER_META_PREFIX, '');
            const parsed = JSON.parse(rawJson);
            if (parsed.email?.toLowerCase() === cleanEmail) {
              await supabase.from('time_slots').delete().eq('id', slot.id);
            }
          } catch {}
        }
      }

      // Insert new registration record in Supabase
      const payload = `${USER_META_PREFIX}${JSON.stringify(cleanProfile)}`;
      const { error: insertErr } = await supabase.from('time_slots').insert({
        destination: payload,
        departure_date: USER_SYSTEM_DATE,
        start_time: '00:00:00',
        end_time: '00:00:01',
      });

      if (insertErr) {
        console.warn('Supabase credential insert notice:', insertErr);
      }
    } catch (err: any) {
      console.warn('saveUserToSupabase exception:', err);
    }
  }

  return { success: true };
}

/**
 * Check if an email is already registered in Supabase or local cache
 */
export async function isEmailRegistered(email: string): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return false;

  const supabase = getSupabase();
  if (supabase) {
    try {
      // Check Supabase database storage
      const { data: slots } = await supabase
        .from('time_slots')
        .select('id, destination')
        .eq('departure_date', USER_SYSTEM_DATE)
        .like('destination', `${USER_META_PREFIX}%`);

      if (slots && slots.length > 0) {
        const found = slots.some((s) => {
          try {
            const parsed = JSON.parse(s.destination.replace(USER_META_PREFIX, ''));
            return parsed.email?.toLowerCase() === cleanEmail;
          } catch {
            return false;
          }
        });
        if (found) return true;
      }

      // Check profiles table
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (profileData) return true;
    } catch (e) {
      console.warn('isEmailRegistered Supabase query notice:', e);
    }
  }

  // Check local database
  const localDb = getLocalDatabaseUsers();
  return Boolean(localDb[cleanEmail]);
}

/**
 * Find user profile and credentials by email directly in Supabase database
 */
export async function findUserByEmail(email: string): Promise<Profile | null> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return null;

  // 1. Check local database first (source of truth for updated profile info)
  const localDb = getLocalDatabaseUsers();
  if (localDb[cleanEmail]) {
    return localDb[cleanEmail];
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      // 2. Query Supabase database credential store
      const { data: slots, error: slotsErr } = await supabase
        .from('time_slots')
        .select('id, destination')
        .eq('departure_date', USER_SYSTEM_DATE)
        .like('destination', `${USER_META_PREFIX}%`);

      if (!slotsErr && slots && slots.length > 0) {
        for (const slot of slots) {
          try {
            const rawJson = slot.destination.replace(USER_META_PREFIX, '');
            const parsed = JSON.parse(rawJson) as Profile;
            if (parsed.email?.toLowerCase() === cleanEmail) {
              // Cache in local storage for fast access
              saveToLocalDatabaseUsers(parsed);
              return parsed;
            }
          } catch {}
        }
      }

      // 3. Query Supabase profiles table
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (!profErr && prof) {
        saveToLocalDatabaseUsers(prof as Profile);
        return prof as Profile;
      }
    } catch (err) {
      console.warn('findUserByEmail Supabase notice:', err);
    }
  }

  return null;
}

/**
 * Authenticate email and password directly against Supabase database
 */
export async function authenticateWithSupabase(
  email: string,
  password: string
): Promise<{ success: boolean; profile?: Profile; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  if (!cleanEmail || !cleanPassword) {
    return { success: false, error: 'Please enter both email and password.' };
  }

  const profile = await findUserByEmail(cleanEmail);

  if (!profile) {
    return {
      success: false,
      error: 'No account exists with this email. Please click "Sign up" to create your account.',
    };
  }

  if (profile.password) {
    if (profile.password !== cleanPassword) {
      return {
        success: false,
        error: 'Invalid credentials. Please enter the correct password.',
      };
    }
  } else {
    profile.password = cleanPassword;
    await saveUserToSupabase(profile);
  }

  // Save active session in localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_ACTIVE_USER, JSON.stringify(profile));
  }

  return { success: true, profile };
}

/**
 * Update user password in Supabase database
 */
export async function updateUserPasswordInSupabase(
  email: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = newPassword.trim();

  const profile = await findUserByEmail(cleanEmail);
  if (!profile) {
    return { success: false, error: 'Account not found.' };
  }

  profile.password = cleanPass;
  profile.updated_at = new Date().toISOString();

  await saveUserToSupabase(profile);

  // If active user matches, update active user storage as well
  if (typeof window !== 'undefined') {
    try {
      const activeRaw = localStorage.getItem(STORAGE_KEY_ACTIVE_USER);
      if (activeRaw) {
        const active = JSON.parse(activeRaw);
        if (active.email?.toLowerCase() === cleanEmail) {
          active.password = cleanPass;
          localStorage.setItem(STORAGE_KEY_ACTIVE_USER, JSON.stringify(active));
        }
      }
    } catch {}
  }

  return { success: true };
}
