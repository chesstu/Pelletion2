import { format, formatDistanceToNow, formatDuration, intervalToDuration } from 'date-fns';

/**
 * Formats a date as a string (e.g., "July 15, 2023")
 */
export function formatDate(date: Date | string): string {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return format(date, 'MMMM d, yyyy');
}

/**
 * Returns a string representing how long ago a date was (e.g., "5 minutes ago", "2 days ago")
 */
export function timeAgo(date: Date | string): string {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return formatDistanceToNow(date, { addSuffix: true });
}

/**
 * Formats a time string to 12-hour format (e.g., "2:00 PM")
 */
export function formatTime(timeString: string): string {
  // If the time is already in 12-hour format (e.g., "2:00 PM"), return it as is
  if (timeString.includes('AM') || timeString.includes('PM')) {
    return timeString;
  }
  
  // Parse the time string (assuming it's in 24-hour format like "14:00")
  const [hours, minutes] = timeString.split(':').map(Number);
  
  // Convert to 12-hour format
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12; // Convert 0 to 12 for 12 AM
  
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Formats a Twitch-style duration string (like "1h24m35s") to a human-readable format
 */
export function formatTwitchDuration(duration: string | null | undefined): string {
  // Handle undefined, null, or non-string values
  if (!duration || typeof duration !== 'string') {
    return '00:30'; // Default duration for clips
  }
  
  // Parse the duration string (e.g., "1h24m35s")
  const regex = /(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/;
  
  try {
    const matches = duration.match(regex);
    
    if (!matches) return '00:30'; // Default if no matches
    
    const hours = matches[1] ? parseInt(matches[1]) : 0;
    const minutes = matches[2] ? parseInt(matches[2]) : 0;
    const seconds = matches[3] ? parseInt(matches[3]) : 0;
    
    // Format as "HH:MM:SS" or "MM:SS" if there are no hours
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  } catch (error) {
    console.error('Error formatting Twitch duration:', error);
    return '00:30'; // Default duration as fallback
  }
}

/**
 * Gets an array of available time slots for a specific date
 * This would normally come from an API that checks availability
 */
export function getAvailableTimeSlots(date: Date): { time: string; available: boolean }[] {
  // This is a mock implementation
  // In a real app, you would fetch this from your backend
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  
  // Different time slots for weekends vs weekdays
  if (isWeekend) {
    return [
      { time: "12:00 PM", available: true },
      { time: "1:00 PM", available: true },
      { time: "2:00 PM", available: true },
      { time: "3:00 PM", available: true },
      { time: "4:00 PM", available: true },
      { time: "5:00 PM", available: true },
      { time: "7:00 PM", available: false }, // Already booked
      { time: "8:00 PM", available: true },
      { time: "9:00 PM", available: true },
    ];
  } else {
    return [
      { time: "5:00 PM", available: true },
      { time: "6:00 PM", available: false }, // Already booked
      { time: "7:00 PM", available: true },
      { time: "8:00 PM", available: true },
      { time: "9:00 PM", available: true },
    ];
  }
}
