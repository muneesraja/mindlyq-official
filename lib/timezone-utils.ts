import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { prisma } from "./db";

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

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
  
  "germany": "Europe/Berlin",
  "cet": "Europe/Berlin",
  "central european time": "Europe/Berlin",
  "berlin": "Europe/Berlin",
  "munich": "Europe/Berlin",
  
  "france": "Europe/Paris",
  "paris": "Europe/Paris",
  "spain": "Europe/Madrid",
  "madrid": "Europe/Madrid",
  "italy": "Europe/Rome",
  "rome": "Europe/Rome",
  "netherlands": "Europe/Amsterdam",
  "amsterdam": "Europe/Amsterdam",
  
  // Asia
  "singapore": "Asia/Singapore",
  
  "japan": "Asia/Tokyo",
  "jst": "Asia/Tokyo",
  "tokyo": "Asia/Tokyo",
  "osaka": "Asia/Tokyo",
  
  "china": "Asia/Shanghai",
  "cst china": "Asia/Shanghai",
  "shanghai": "Asia/Shanghai",
  "beijing": "Asia/Shanghai",
  "hong kong": "Asia/Hong_Kong",
  
  "dubai": "Asia/Dubai",
  "uae": "Asia/Dubai",
  "abu dhabi": "Asia/Dubai",
  
  "thailand": "Asia/Bangkok",
  "bangkok": "Asia/Bangkok",
  
  "south korea": "Asia/Seoul",
  "seoul": "Asia/Seoul",
  
  // Australia
  "australia": "Australia/Sydney",
  "sydney": "Australia/Sydney",
  "melbourne": "Australia/Melbourne",
  "brisbane": "Australia/Brisbane",
  "perth": "Australia/Perth",
  "aest": "Australia/Sydney",
  "aedt": "Australia/Sydney",
  "acst": "Australia/Adelaide",
  "acdt": "Australia/Adelaide",
  "awst": "Australia/Perth",
  
  // Americas
  "brazil": "America/Sao_Paulo",
  "sao paulo": "America/Sao_Paulo",
  "rio de janeiro": "America/Sao_Paulo",
  
  "canada": "America/Toronto",
  "toronto": "America/Toronto",
  "vancouver": "America/Vancouver",
  "montreal": "America/Montreal",
  
  "mexico": "America/Mexico_City",
  "mexico city": "America/Mexico_City",
  
  // Africa
  "south africa": "Africa/Johannesburg",
  "johannesburg": "Africa/Johannesburg",
  "cape town": "Africa/Johannesburg",
  
  // Others
  "russia": "Europe/Moscow",
  "moscow": "Europe/Moscow",
  "new zealand": "Pacific/Auckland",
  "auckland": "Pacific/Auckland",
};

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
  // This is a neutral default that will be replaced once the user sets their timezone
  return "Etc/UTC";
}

/**
 * Set the user's timezone preference
 * @param userId The user's ID
 * @param timezone The timezone to set
 */
export async function setUserTimezone(userId: string, timezone: string): Promise<void> {
  await prisma.userPreference.upsert({
    where: { userId },
    update: { timezone },
    create: { userId, timezone }
  });
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

/**
 * Check if a timezone is valid
 * @param timezone The timezone to check
 * @returns Whether the timezone is valid
 */
function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Convert a date to UTC based on the user's timezone
 * @param date The date to convert
 * @param userTimezone The user's timezone
 * @returns The date in UTC
 */
export function convertToUTC(date: Date, userTimezone: string): Date {
  // Create a formatter in the user's timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: userTimezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });

  // Format the date in the user's timezone
  const parts = formatter.formatToParts(date);
  const dateObj: Record<string, number> = {};

  // Extract date parts
  parts.forEach(part => {
    if (part.type !== 'literal') {
      dateObj[part.type] = parseInt(part.value, 10);
    }
  });

  // Create a new date in UTC
  return new Date(Date.UTC(
    dateObj.year,
    dateObj.month - 1, // Month is 0-indexed in JavaScript
    dateObj.day,
    dateObj.hour,
    dateObj.minute,
    dateObj.second
  ));
}

/**
 * Convert a UTC date to the user's timezone
 * @param utcDate The UTC date
 * @param userTimezone The user's timezone
 * @returns The date in the user's timezone
 */
export function convertFromUTC(utcDate: Date, userTimezone: string): Date {
  // Create a formatter in UTC
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });

  // Format the date in UTC
  const parts = formatter.formatToParts(utcDate);
  const dateObj: Record<string, number> = {};

  // Extract date parts
  parts.forEach(part => {
    if (part.type !== 'literal') {
      dateObj[part.type] = parseInt(part.value, 10);
    }
  });

  // Create a new date in the user's timezone
  const localDate = new Date(
    dateObj.year,
    dateObj.month - 1, // Month is 0-indexed in JavaScript
    dateObj.day,
    dateObj.hour,
    dateObj.minute,
    dateObj.second
  );

  // Adjust for timezone offset
  const userOffset = new Date().getTimezoneOffset();
  const targetOffset = new Date(localDate).getTimezoneOffset();
  const offsetDiff = targetOffset - userOffset;

  return new Date(localDate.getTime() + offsetDiff * 60 * 1000);
}
