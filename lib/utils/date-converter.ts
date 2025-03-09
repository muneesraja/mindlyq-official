import { parseISO, format, isValid, parse, getYear, getMonth, getDate, getHours, getMinutes, getSeconds } from 'date-fns';
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { prisma } from '../db';
import { HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { genAI, getModelForTask } from "./ai-config";

// Default timezone to use if user doesn't have a preference
export const DEFAULT_TIMEZONE = 'UTC';

/**
 * Converts a time string (HH:MM) to minutes since midnight
 * 
 * IMPORTANT: This function is timezone-agnostic. When used in the application,
 * ensure that you're working with UTC times for consistency. The returned value
 * represents minutes since midnight in the same timezone as the input string.
 * 
 * @param timeString Time string in format HH:MM (24-hour format)
 * @returns Minutes since midnight as an integer, or null if invalid format
 */
export function timeStringToMinutes(timeString: string | null | undefined): number | null {
  if (!timeString) return null;
  
  // Handle various time formats
  const timeRegex = /^(\d{1,2}):(\d{2})(?:\s*(am|pm))?$/i;
  const match = timeString.trim().match(timeRegex);
  
  if (!match) return null;
  
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3]?.toLowerCase();
  
  // Handle 12-hour format if am/pm is specified
  if (meridiem) {
    if (meridiem === 'pm' && hours < 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;
  }
  
  // Validate hours and minutes
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  
  return hours * 60 + minutes;
}

/**
 * Converts minutes since midnight to a time string (HH:MM)
 * 
 * IMPORTANT: This function is timezone-agnostic. When used in the application,
 * ensure that you're working with UTC times for consistency. The returned string
 * represents a time in the same timezone as the input minutes value.
 * 
 * @param minutes Minutes since midnight as an integer
 * @param format24Hour Whether to use 24-hour format (default: true)
 * @returns Time string in format HH:MM
 */
export function minutesToTimeString(minutes: number | null | undefined, format24Hour: boolean = true): string | null {
  if (minutes === null || minutes === undefined) return null;
  
  // Validate minutes
  if (minutes < 0 || minutes >= 24 * 60) {
    return null;
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (format24Hour) {
    // 24-hour format: HH:MM
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  } else {
    // 12-hour format: HH:MM AM/PM
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
    return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
  }
}

// Common timezone mappings for quick reference
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
  "est": "America/New_York",
  "eastern time": "America/New_York",
  "eastern standard time": "America/New_York",
  "new york": "America/New_York",
  "boston": "America/New_York",
  "washington dc": "America/New_York",
  "miami": "America/New_York",
  
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
  
  "pst": "America/Los_Angeles",
  "pacific time": "America/Los_Angeles",
  "pacific standard time": "America/Los_Angeles",
  "los angeles": "America/Los_Angeles",
  "san francisco": "America/Los_Angeles",
  "seattle": "America/Los_Angeles",
  
  // Europe
  "europe": "Europe/London",
  "gmt": "Europe/London",
  "bst": "Europe/London",
  "greenwich mean time": "Europe/London",
  "british summer time": "Europe/London",
  "london": "Europe/London",
  "uk": "Europe/London",
  "united kingdom": "Europe/London",
  "england": "Europe/London",
  
  "cet": "Europe/Paris",
  "central european time": "Europe/Paris",
  "paris": "Europe/Paris",
  "berlin": "Europe/Berlin",
  "rome": "Europe/Rome",
  "madrid": "Europe/Madrid",
  "spain": "Europe/Madrid",
  "italy": "Europe/Rome",
  "germany": "Europe/Berlin",
  "france": "Europe/Paris",
  
  // Asia
  "asia": "Asia/Singapore",
  "singapore": "Asia/Singapore",
  "hong kong": "Asia/Hong_Kong",
  "tokyo": "Asia/Tokyo",
  "jst": "Asia/Tokyo",
  "japan": "Asia/Tokyo",
  "japan standard time": "Asia/Tokyo",
  "china": "Asia/Shanghai",
  "brazil": "America/Sao_Paulo",
  "mexico": "America/Mexico_City",
  "russia": "Europe/Moscow",
  "canada": "America/Toronto",
};

/**
 * Convert a date from a specific timezone to UTC
 * @param date Date in the source timezone
 * @param timeZone Source timezone identifier
 * @returns Date in UTC
 */
function zonedTimeToUtc(date: Date, timeZone: string): Date {
  try {
    // Use date-fns-tz to convert from zoned time to UTC
    return fromZonedTime(date, timeZone);
  } catch (error) {
    console.error(`Error in zonedTimeToUtc: ${error}`);
    // Fallback implementation if date-fns-tz fails
    const offset = new Date().getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset);
  }
}

/**
 * Format a date in a specific timezone
 * @param date Date to format
 * @param timeZone Target timezone
 * @param formatStr Format string for date-fns
 * @returns Formatted date string
 */
function formatTz(date: Date, timeZone: string, formatStr: string): string {
  try {
    // Use date-fns-tz to format in the target timezone
    return formatInTimeZone(date, timeZone, formatStr);
  } catch (error) {
    console.error(`Error in formatTz: ${error}`);
    // Fallback to basic formatting if date-fns-tz fails
    return format(date, formatStr);
  }
}

/**
 * Convert a UTC date to a specific timezone
 * @param date Date in UTC
 * @param timeZone Target timezone
 * @returns Date adjusted for display in the target timezone
 */
function utcToZonedTime(date: Date, timeZone: string): Date {
  try {
    // Use date-fns-tz to convert UTC to zoned time
    return toZonedTime(date, timeZone);
  } catch (error) {
    console.error(`Error in utcToZonedTime: ${error}`);
    // Fallback implementation if date-fns-tz fails
    const year = getYear(date);
    const month = getMonth(date);
    const day = getDate(date);
    const hour = getHours(date);
    const minute = getMinutes(date);
    const second = getSeconds(date);
    
    // Create a date in the local timezone with these components
    return new Date(year, month, day, hour, minute, second);
  }
}

/**
 * Converts a local date to UTC for storage
 * @param localDate Date in user's local timezone
 * @param timezone User's IANA timezone identifier
 * @returns Date in UTC for database storage
 */
export function toUTC(localDate: Date, timezone: string): Date {
  if (!isValid(localDate)) {
    throw new Error('Invalid date provided to toUTC');
  }
  return zonedTimeToUtc(localDate, timezone);
}

/**
 * Converts a UTC date from storage to user's local timezone
 * @param utcDate Date in UTC from database
 * @param timezone User's IANA timezone identifier
 * @returns Date in user's local timezone
 */
export function fromUTC(utcDate: Date, timezone: string): Date {
  if (!isValid(utcDate)) {
    throw new Error('Invalid date provided to fromUTC');
  }
  return utcToZonedTime(utcDate, timezone);
}

/**
 * Formats a UTC date for display in user's timezone
 * @param utcDate Date in UTC from database
 * @param timezone User's IANA timezone identifier
 * @param formatString Format pattern for date-fns
 * @returns Formatted date string in user's timezone
 */
export function formatUTCDate(
  utcDate: Date, 
  timezone: string, 
  formatString: string = 'yyyy-MM-dd HH:mm'
): string {
  if (!isValid(utcDate)) {
    return 'Invalid date';
  }
  return formatTz(utcDate, timezone, formatString);
}

/**
 * Parses a date string in user's timezone and converts to UTC
 * @param dateString Date string in specified format
 * @param timezone User's IANA timezone identifier
 * @param formatString Format pattern for date-fns
 * @returns Date in UTC for database storage
 */
export function parseToUTC(
  dateString: string,
  timezone: string,
  formatString: string = 'yyyy-MM-dd HH:mm'
): Date | null {
  try {
    // For ISO strings, use parseISO
    if (dateString.includes('T') && dateString.includes('Z')) {
      const parsed = parseISO(dateString);
      if (isValid(parsed)) return parsed;
    }
    
    // For other formats, parse in the user's timezone then convert to UTC
    const localDate = parse(dateString, formatString, new Date());
    if (!isValid(localDate)) return null;
    
    return toUTC(localDate, timezone);
  } catch (error) {
    console.error('Error parsing date to UTC:', error);
    return null;
  }
}

/**
 * Parse user input in various date formats and convert to UTC
 * @param input User input date string
 * @param timezone User's IANA timezone identifier
 * @returns Date in UTC for database storage or null if parsing fails
 */
export function parseUserInput(input: string, timezone: string): Date | null {
  // Try common formats
  const formats = [
    'yyyy-MM-dd',
    'MM/dd/yyyy',
    'dd/MM/yyyy',
    'yyyy-MM-dd HH:mm',
    'MM/dd/yyyy HH:mm',
    'dd/MM/yyyy HH:mm',
    'yyyy-MM-dd h:mm a',
    'MM/dd/yyyy h:mm a',
    'dd/MM/yyyy h:mm a',
  ];
  
  // Try each format
  for (const formatString of formats) {
    try {
      const parsedDate = parse(input, formatString, new Date());
      if (isValid(parsedDate)) {
        // Convert to UTC based on user's timezone
        return toUTC(parsedDate, timezone);
      }
    } catch (e) {
      continue;
    }
  }
  
  // Try ISO format
  try {
    const parsedDate = parseISO(input);
    if (isValid(parsedDate)) {
      return parsedDate;
    }
  } catch (e) {
    // Ignore parsing errors
  }
  
  return null;
}

/**
 * Adjust a date for DST transitions to maintain consistent time
 * @param date Date to adjust
 * @param timezone User's IANA timezone identifier
 * @param targetHour Desired hour in local time
 * @param targetMinute Desired minute in local time
 * @returns Adjusted date that maintains the desired time in local timezone
 */
export function adjustForDST(
  date: Date,
  timezone: string,
  targetHour: number,
  targetMinute: number
): Date {
  // Convert to user's timezone to work in local time context
  const localDate = fromUTC(date, timezone);
  
  // Check if the hour is what we expect
  if (localDate.getHours() !== targetHour || localDate.getMinutes() !== targetMinute) {
    // Adjust the time to maintain the desired hour/minute in user's timezone
    localDate.setHours(targetHour, targetMinute, 0, 0);
  }
  
  // Convert back to UTC
  return toUTC(localDate, timezone);
}

/**
 * Check if a time string matches the current time (exactly or up to 1 minute after)
 * @param timeString Time string in format 'HH:MM'
 * @param currentTime Current date to compare against
 * @returns True if the current time is equal to or up to 1 minute after the target time
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
    
    // Calculate time in minutes for comparison
    const targetTimeMinutes = hours * 60 + minutes;
    const currentTimeMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    
    // Time matches only if current time is equal to or up to 1 minute after the target time
    // This prevents reminders from triggering early
    return currentTimeMinutes >= targetTimeMinutes && currentTimeMinutes <= targetTimeMinutes + 1;
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
  if (!timezone) return false;
  
  try {
    // Try to format a date with the timezone using date-fns-tz
    formatInTimeZone(new Date(), timezone, 'yyyy-MM-dd');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Detect timezone from user's location description
 * @param locationDescription The user's location description (e.g., "I'm from India")
 * @returns The detected timezone
 */
export async function detectTimezoneFromLocation(locationDescription: string): Promise<string> {
  // First, check if we have a direct mapping
  const normalizedLocation = locationDescription.toLowerCase().trim();
  
  // Check if the input is just a timezone abbreviation
  if (/^[a-z]{3,5}$/i.test(normalizedLocation)) {
    const tzAbbr = normalizedLocation.toLowerCase();
    // Check if this abbreviation exists in our mappings
    for (const [key, value] of Object.entries(COMMON_TIMEZONE_MAPPINGS)) {
      if (key === tzAbbr) {
        return value;
      }
    }
  }
  
  // Check for partial matches in the location description
  for (const [key, value] of Object.entries(COMMON_TIMEZONE_MAPPINGS)) {
    if (normalizedLocation.includes(key)) {
      return value;
    }
  }

  // If no direct mapping, use AI to detect timezone
  try {
    const model = genAI.getGenerativeModel({
      model: getModelForTask('timezone'),
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ],
    });

    const prompt = `
    You are a timezone detection assistant. Given a location description, determine the most likely IANA timezone identifier.
    
    Location description: "${locationDescription}"
    
    Return ONLY the IANA timezone identifier (e.g., "America/New_York", "Asia/Kolkata") without any additional text or explanation.
    `;

    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();
    
    // Validate that the response is a valid IANA timezone
    if (isValidTimezone(response)) {
      return response;
    }
    
    // Default to Asia/Kolkata if AI response is not valid
    return "Asia/Kolkata";
  } catch (error) {
    console.error("Error detecting timezone:", error);
    return "Asia/Kolkata"; // Default to Asia/Kolkata on error
  }
}
