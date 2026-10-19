import { CAMPUS_TIMEZONE } from './constants';

/**
 * Get current date string (YYYY-MM-DD) in Asia/Kolkata timezone
 */
export function getTodayISTDateString(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: CAMPUS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now); // en-CA gives YYYY-MM-DD format
}

/**
 * Get date string offset from today by N days in Asia/Kolkata
 */
export function getOffsetISTDateString(offsetDays: number): string {
  const now = new Date();
  // Adjust by offset days
  now.setDate(now.getDate() + offsetDays);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: CAMPUS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now);
}

/**
 * Format a YYYY-MM-DD date string nicely for SRM-AP campus users
 */
export function formatDateForDisplay(dateString: string): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  // Create date at noon UTC to prevent day shifting in any local timezone
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  const todayStr = getTodayISTDateString();
  const tomorrowStr = getOffsetISTDateString(1);

  const weekday = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: CAMPUS_TIMEZONE,
  }).format(date);

  const formatted = new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: CAMPUS_TIMEZONE,
  }).format(date);

  if (dateString === todayStr) {
    return `Today (${formatted})`;
  } else if (dateString === tomorrowStr) {
    return `Tomorrow (${formatted})`;
  }
  return `${weekday}, ${formatted}`;
}

/**
 * Format a YYYY-MM-DD to "Mon, Oct 19" style for pills
 */
export function formatDateShortPill(dateString: string): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const weekday = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: CAMPUS_TIMEZONE,
  }).format(date);
  const monthDay = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: CAMPUS_TIMEZONE,
  }).format(date);
  return `${weekday}, ${monthDay}`;
}

/**
 * Convert HH:MM or HH:MM:SS to 12-hour format "7:15 AM"
 */
export function formatTime12(timeString: string): string {
  if (!timeString) return '';
  const parts = timeString.split(':');
  const hour = parseInt(parts[0], 10);
  const minute = parts[1] || '00';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${ampm}`;
}

/**
 * Get current time in Asia/Kolkata timezone
 */
export function getCurrentISTTime(): { hours: number; minutes: number; timeStr: string } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: CAMPUS_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
  const second = parseInt(parts.find((p) => p.type === 'second')?.value || '0', 10);
  const pad = (n: number) => n.toString().padStart(2, '0');

  return {
    hours: hour,
    minutes: minute,
    timeStr: `${pad(hour)}:${pad(minute)}:${pad(second)}`,
  };
}

/**
 * Check if a ride slot has completed based on its date and end time in IST.
 * If today is the departure date, the ride is marked complete as soon as the slot end_time has passed
 * (e.g. for a 7:00 to 7:30 PM slot, it completes at 7:30 PM).
 */
export function isRideCompleted(departureDate: string, endTime: string): boolean {
  if (!departureDate) return false;
  const todayStr = getTodayISTDateString();

  if (departureDate < todayStr) return true;
  if (departureDate > todayStr) return false;

  // It is today. Compare endTime to current IST time
  const currentIST = getCurrentISTTime().timeStr;
  const padTime = (t: string) => {
    if (!t) return '00:00:00';
    const parts = t.split(':');
    const h = (parts[0] || '00').padStart(2, '0');
    const m = (parts[1] || '00').padStart(2, '0');
    const s = (parts[2] || '00').padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return currentIST >= padTime(endTime);
}

/**
 * Calculate minutes remaining until a ride starts (returns null if not today or past)
 */
export function getMinutesUntilRide(departureDate: string, startTime: string): number | null {
  const todayStr = getTodayISTDateString();
  if (departureDate !== todayStr || !startTime) return null;

  const current = getCurrentISTTime();
  const parts = startTime.split(':').map(Number);
  const slotHour = parts[0] || 0;
  const slotMinute = parts[1] || 0;

  const currentTotalMins = current.hours * 60 + current.minutes;
  const slotTotalMins = slotHour * 60 + slotMinute;

  return slotTotalMins - currentTotalMins;
}

/**
 * Format message created_at timestamp in Asia/Kolkata
 */
export function formatMessageTime(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: CAMPUS_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}
