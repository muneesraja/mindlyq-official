import { 
  format,
  parseISO,
  isValid,
  differenceInMinutes,
  addMinutes,
  isWithinInterval,
  isBefore,
  isAfter,
  isEqual
} from 'date-fns';

import {
  formatInTimeZone,
  toZonedTime, // equivalent to utcToZonedTime
  fromZonedTime // equivalent to zonedTimeToUtc
} from 'date-fns-tz';
import { prisma } from './db';

/**
 * Default timezone to use if user doesn't have a preference
 */
const DEFAULT_TIMEZONE = 'Etc/UTC';

/**
 * Common timezone mappings for quick reference
 */
const COMMON_TIMEZONE_MAPPINGS: Record<string, string> = {
  // India
  "india": "Asia/Kolkata",
  "ist": "Asia/Kolkata",
  "indian standard time": "Asia/Kolkata",
  "mumbai": "Asia/Kolkata",
  "delhi": "Asia/Kolkata",
  "bangalore": "Asia/Kolkata",
  "chennai": "Asia/Kolkata",
  "kolkata": "Asia/Kolkata",
  "hyderabad": "Asia/Kolkata",
  
  // USA
  "usa": "America/New_York",
  "us": "America/New_York",
  "united states": "America/New_York",
  "est": "America/New_York",
  "eastern time": "America/New_York",
  "eastern standard time": "America/New_York",
  "new york": "America/New_York",
  "washington dc": "America/New_York",
  "boston": "America/New_York",
  "miami": "America/New_York",
  "atlanta": "America/New_York",
  
  "pst": "America/Los_Angeles",
  "pacific time": "America/Los_Angeles",
  "pacific standard time": "America/Los_Angeles",
  "los angeles": "America/Los_Angeles",
  "san francisco": "America/Los_Angeles",
  "seattle": "America/Los_Angeles",
  "california": "America/Los_Angeles",
  
  "cst": "America/Chicago",
  "central time": "America/Chicago",
  "central standard time": "America/Chicago",
  "chicago": "America/Chicago",
  "dallas": "America/Chicago",
  "houston": "America/Chicago",
  
  "mst": "America/Denver",
  "mountain time": "America/Denver",
  "mountain standard time": "America/Denver",
  "denver": "America/Denver",
  "phoenix": "America/Phoenix",
  
  // Europe
  "uk": "Europe/London",
  "united kingdom": "Europe/London",
  "gmt": "Europe/London",
  "bst": "Europe/London",
  "london": "Europe/London",
  "england": "Europe/London",
  "scotland": "Europe/London",
  "wales": "Europe/London",
  "ireland": "Europe/Dublin",
  "dublin": "Europe/Dublin",
  
  // Additional common timezones
  "germany": "Europe/Berlin",
  "france": "Europe/Paris",
  "japan": "Asia/Tokyo",
  "australia": "Australia/Sydney",
  "china": "Asia/Shanghai",
  "brazil": "America/Sao_Paulo",
  "mexico": "America/Mexico_City",
  "russia": "Europe/Moscow",
  "canada": "America/Toronto",
};

/**
 * Get current time in the specified timezone
 * @param timezone The timezone to get the current time in
 * @returns Date object representing current time in the specified timezone
 */
export function getCurrentTimeInTimezone(timezone: string): Date {
  const now = new Date();
  return toZonedTime(now, timezone);
}

/**
 * Format a date in the specified timezone
 * @param date The date to format
 * @param timezone The timezone to format the date in
 * @param formatString The format string to use (default: 'yyyy-MM-dd HH:mm:ss')
 * @returns Formatted date string
 */
export function formatDateInTimezone(
  date: Date, 
  timezone: string, 
  formatString: string = 'yyyy-MM-dd HH:mm:ss'
): string {
  return formatInTimeZone(date, timezone, formatString);
}

/**
 * Format a date in a user-friendly way
 * @param date The date to format
 * @param timezone The timezone to format the date in
 * @returns User-friendly formatted date string
 */
export function formatDateForUser(date: Date, timezone: string): string {
  return formatInTimeZone(
    date, 
    timezone, 
    'MMMM d, yyyy h:mm a'
  );
}

/**
 * Convert a date from local timezone to UTC
 * @param date The date in local timezone
 * @param timezone The local timezone
 * @returns The date converted to UTC
 */
export function convertToUTC(date: Date, timezone: string): Date {
  return fromZonedTime(date, timezone);
}

/**
 * Convert a UTC date to a local timezone date
 * @param utcDate The date in UTC
 * @param timezone The target timezone
 * @returns The date in the target timezone
 */
export function convertFromUTC(utcDate: Date, timezone: string): Date {
  return toZonedTime(utcDate, timezone);
}

/**
 * Check if a time string matches the current time (within a minute)
 * @param timeString Time string in format 'HH:MM'
 * @param currentTime Current time to compare against
 * @returns True if the times match, false otherwise
 */
export function isTimeMatching(timeString: string, currentTime: Date): boolean {
  if (!timeString) return false;
  
  try {
    // Parse time string (format: 'HH:MM')
    const [hours, minutes] = timeString.split(':').map(Number);
    
    if (isNaN(hours) || isNaN(minutes)) return false;
    
    // Create a date object with the parsed time and today's date
    const timeDate = new Date(currentTime);
    timeDate.setHours(hours, minutes, 0, 0);
    
    // Time matches if they're within 1 minute of each other
    const diff = Math.abs(differenceInMinutes(currentTime, timeDate));
    return diff <= 1;
  } catch (error) {
    console.error(`Error in isTimeMatching for time ${timeString}:`, error);
    return false;
  }
}

/**
 * Get or create user timezone preference
 * @param userId The user's ID
 * @returns The user's timezone
 */
export async function getUserTimezone(userId: string): Promise<string> {
  // Check if user already has a timezone preference
  const userPref = await prisma.userPreference.findUnique({
    where: { userId }
  });

  if (userPref) {
    return userPref.timezone;
  }

  // Default to UTC if no timezone preference is found
  return DEFAULT_TIMEZONE;
}

/**
 * Set the user's timezone preference
 * @param userId The user's ID
 * @param timezone The timezone to set
 */
export async function setUserTimezone(userId: string, timezone: string): Promise<void> {
  // Upsert to create or update the user's timezone preference
  await prisma.userPreference.upsert({
    where: { userId },
    update: { timezone },
    create: { userId, timezone }
  });
}

/**
 * Check if a timezone is valid
 * @param timezone The timezone to check
 * @returns Whether the timezone is valid
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    formatInTimeZone(new Date(), timezone, 'yyyy-MM-dd');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Detect timezone from user's location description
 * @param locationDescription The user's location description
 * @returns The detected timezone or null if not found
 */
export function detectTimezoneFromLocation(locationDescription: string): string | null {
  // Convert to lowercase for case-insensitive matching
  const lowerCaseLocation = locationDescription.toLowerCase();
  
  // Check if the location matches any of our known mappings
  for (const [key, timezone] of Object.entries(COMMON_TIMEZONE_MAPPINGS)) {
    if (lowerCaseLocation.includes(key.toLowerCase())) {
      return timezone;
    }
  }
  
  // No match found
  return null;
}
