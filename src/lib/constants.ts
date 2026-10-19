// Predefined departure interval definitions and destination locations for SRM University-AP Main Gate

export interface DestinationLocation {
  id: string;
  name: string;
  shortName: string;
  description: string;
  approxDistance: string;
  category: 'transit' | 'city' | 'nearby';
}

export const CAMPUS_DESTINATIONS: DestinationLocation[] = [
  {
    id: 'vijayawada',
    name: 'Vijayawada',
    shortName: 'Vijayawada',
    description: 'Benz Circle, Malls & City Center',
    approxDistance: '~28 km',
    category: 'city',
  },
  {
    id: 'vijayawada-station',
    name: 'Vijayawada Station',
    shortName: 'Vijayawada Station',
    description: 'Vijayawada Railway Junction (BZA)',
    approxDistance: '~32 km',
    category: 'transit',
  },
  {
    id: 'mangalagiri',
    name: 'Mangalagiri',
    shortName: 'Mangalagiri',
    description: 'AIIMS, Bus Stand & Bypass',
    approxDistance: '~14 km',
    category: 'nearby',
  },
  {
    id: 'tadepalli',
    name: 'Tadepalli',
    shortName: 'Tadepalli',
    description: 'Kunchanapalli & Bypass junction',
    approxDistance: '~20 km',
    category: 'nearby',
  },
  {
    id: 'guntur',
    name: 'Guntur',
    shortName: 'Guntur',
    description: 'Guntur City & Railway Station',
    approxDistance: '~34 km',
    category: 'city',
  },
  {
    id: 'amaravati',
    name: 'Amaravati',
    shortName: 'Amaravati',
    description: 'Capital Secretariat & Core City',
    approxDistance: '~16 km',
    category: 'nearby',
  },
];

export interface CampusPickupPoint {
  id: string;
  name: string;
  shortName: string;
  description: string;
}

export const CAMPUS_PICKUP_POINTS: CampusPickupPoint[] = [
  {
    id: 'srm-gate-3',
    name: 'SRM AP Gate 3',
    shortName: 'Gate 3',
    description: 'Designated student pickup area',
  },
  {
    id: 'vit-ap',
    name: 'VIT AP',
    shortName: 'VIT AP',
    description: 'Designated student pickup area',
  },
  {
    id: 'amrita-uni',
    name: 'Amrita Uni',
    shortName: 'Amrita Uni',
    description: 'Designated student pickup area',
  },
];

export const POPULAR_STUDENT_SPOTS = [
  'Vijayawada',
  'Vijayawada Station',
  'Mangalagiri',
  'Tadepalli',
  'Guntur',
  'Amaravati',
];

export const DESTINATION_FARES: Record<string, string> = {
  Vijayawada: '~₹70 – ₹90 / head',
  'Vijayawada Station': '~₹70 – ₹90 / head',
  Mangalagiri: '~₹30 – ₹40 / head',
  Tadepalli: '~₹45 – ₹60 / head',
  Guntur: '~₹80 – ₹110 / head',
  Amaravati: '~₹35 – ₹50 / head',
  default: '~₹40 – ₹60 / head',
};

export const DEFAULT_DESTINATION = 'Vijayawada';
export const DEFAULT_PICKUP_POINT = 'SRM AP Gate 3';

export const MAX_GROUP_MEMBERS = 12;
export const DEFAULT_GROUP_SIZE = 4;
export const ALLOWED_GROUP_SIZES = [2, 4, 6, 8, 12] as const;

export interface IntervalDefinition {
  startTime: string; // HH:MM:00
  endTime: string;   // HH:MM:00
  label: string;     // e.g. "7:00 AM – 7:15 AM"
  period: 'morning' | 'afternoon' | 'evening' | 'night';
}

export const TIME_PERIODS = [
  { id: 'all', label: 'All 24 Hours' },
  { id: 'morning', label: 'Morning (6 AM - 12 PM)' },
  { id: 'afternoon', label: 'Afternoon (12 PM - 5 PM)' },
  { id: 'evening', label: 'Evening (5 PM - 9 PM)' },
  { id: 'night', label: 'Night & Early Morning (9 PM - 6 AM)' },
] as const;

export const CAMPUS_TIMEZONE = 'Asia/Kolkata';

// Generate standard 30-minute intervals covering all 24 hours (00:00 to 24:00)
export function generateStandardIntervals(): IntervalDefinition[] {
  const intervals: IntervalDefinition[] = [];

  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const nextM = m + 30;
      const nextH = nextM === 60 ? (h + 1) % 24 : h;
      const normalizedNextM = nextM === 60 ? 0 : nextM;

      const pad = (n: number) => n.toString().padStart(2, '0');
      const startTime = `${pad(h)}:${pad(m)}:00`;
      // For the 23:30 slot ending at 24:00, use 23:59:59 in SQL/Postgres to avoid 00:00 < 23:30 check constraint error!
      const endTime = h === 23 && m === 30 ? '23:59:59' : `${pad(nextH)}:${pad(normalizedNextM)}:00`;

      // Format 12-hour label
      const format12 = (hour: number, minute: number) => {
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${pad(minute)} ${ampm}`;
      };

      const endHourForDisplay = nextM === 60 ? h + 1 : h;
      const label = `${format12(h, m)} – ${format12(endHourForDisplay, normalizedNextM)}`;

      let period: 'morning' | 'afternoon' | 'evening' | 'night' = 'morning';
      if (h >= 6 && h < 12) period = 'morning';
      else if (h >= 12 && h < 17) period = 'afternoon';
      else if (h >= 17 && h < 21) period = 'evening';
      else period = 'night';

      intervals.push({
        startTime,
        endTime,
        label,
        period,
      });
    }
  }

  return intervals;
}

export const PREDEFINED_INTERVALS = generateStandardIntervals();

