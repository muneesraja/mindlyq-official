import { parseISO, format, isValid, parse } from 'date-fns';
import { prisma } from '../db';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

// Default timezone to use if user doesn't have a preference
export const DEFAULT_TIMEZONE = 'UTC';

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

// Define custom timezone conversion functions since date-fns-tz ESM exports are not working with bun

/**
 * Convert a date from a specific timezone to UTC
 */
function zonedTimeToUtc(date: Date, timeZone: string): Date {
  // Get the date components in the source timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });
  
  // Format the date to get parts in the source timezone
  const parts = formatter.formatToParts(date);
  
  // Extract the parts
  const partValues: Record<string, string> = {};
  for (const part of parts) {
    partValues[part.type] = part.value;
  }
  
  // Get the date components
  const year = parseInt(partValues.year);
  const month = parseInt(partValues.month) - 1; // Month is 0-indexed in Date
  const day = parseInt(partValues.day);
  const hour = parseInt(partValues.hour);
  const minute = parseInt(partValues.minute);
  const second = parseInt(partValues.second);
  
  // Create a UTC date with these components
  return new Date(Date.UTC(year, month, day, hour, minute, second));
}

/**
 * Format a date in a specific timezone
 */
function formatInTimeZone(date: Date, timeZone: string, formatStr: string): string {
  // Convert to the target timezone first
  const zonedDate = utcToZonedTime(date, timeZone);
  
  // Use date-fns format with the zoned date
  return format(zonedDate, formatStr);
}

/**
 * Convert a UTC date to a specific timezone
 * 
 * This function takes a UTC date and returns a JavaScript Date object
 * that represents the same moment in time, but with the date/time components
 * adjusted to display correctly in the target timezone.
 */
function utcToZonedTime(date: Date, timeZone: string): Date {
  // Create a formatter that will parse this UTC date in the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });
  
  // Format the date to get parts in the target timezone
  const parts = formatter.formatToParts(date);
  
  // Extract the parts
  const partValues: Record<string, string> = {};
  for (const part of parts) {
    partValues[part.type] = part.value;
  }
  
  // Get the date components
  const year = parseInt(partValues.year);
  const month = parseInt(partValues.month) - 1; // Month is 0-indexed in Date
  const day = parseInt(partValues.day);
  const hour = parseInt(partValues.hour);
  const minute = parseInt(partValues.minute);
  const second = parseInt(partValues.second);
  
  // Create a date in the local timezone with these components
  // This preserves the display date/time without timezone adjustments
  const result = new Date(year, month, day, hour, minute, second);
  
  console.log(`UTC to Zoned Time conversion:`);
  console.log(`- Input UTC date: ${date.toISOString()}`);
  console.log(`- Target timezone: ${timeZone}`);
  console.log(`- Extracted components: ${year}-${month+1}-${day} ${hour}:${minute}:${second}`);
  console.log(`- Result: ${result.toISOString()}`);
  
  return result;
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
  return formatInTimeZone(utcDate, timezone, formatString);
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
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
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
      model: "gemini-1.5-flash",
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
