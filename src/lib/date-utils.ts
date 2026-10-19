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
