export interface Profile {
  id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimeSlot {
  id: string;
  destination: string;
  departure_date: string; // YYYY-MM-DD
  start_time: string;     // HH:MM:SS
  end_time: string;       // HH:MM:SS
  target_size?: number;   // 3 or 4 students
  ride_type?: string;     // 'auto' | 'cab'
  created_at: string;
}

export interface SlotMember {
  id: string;
  slot_id: string;
  user_id: string;
  joined_at: string;
  ride_pref?: string;     // 'auto' | 'cab' | 'any'
  target_size?: number;   // 3, 4, 6
  pickup_note?: string;   // e.g. "Main gate security cabin"
  profile?: Profile;
}

export interface Message {
  id: string;
  slot_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: Profile;
}

export interface SlotWithDetails extends TimeSlot {
  members: SlotMember[];
  isUserJoined: boolean;
  memberCount: number;
}
