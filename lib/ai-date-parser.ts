import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { getUserTimezone } from './timezone-utils';

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

interface DateTimeParseResult {
  success: boolean;
  date?: Date;
  isRecurring?: boolean;
  recurrenceType?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurrenceDays?: number[];
  recurrenceTime?: string;
  error?: string;
}

const DATETIME_SYSTEM_PROMPT = `You are a specialized date and time parsing assistant. Your only job is to extract date and time information from natural language text.

Current time: {current_time}
Timezone: Asia/Kolkata (IST)

TASK:
Extract date and time information from the user's message. If the message contains a date and/or time, return it in a structured format.

IMPORTANT RULES:
1. If no specific date is mentioned but a time is provided, assume TODAY
2. If no specific time is mentioned, use 09:00 as the default time
3. For relative expressions like "tomorrow", "next week", calculate the actual date
4. For day names like "Monday", use the next occurrence of that day
5. For recurring reminders, identify the pattern (daily, weekly, monthly, yearly)
6. For recurring weekly reminders, identify which days of the week (0=Sunday, 1=Monday, etc.)
7. For ambiguous expressions like "evening", use appropriate defaults (evening=18:00)
8. If the input contains no date or time information, indicate that in your response

Your response must be PURE JSON without any markdown formatting, code blocks, or extra text. DO NOT use \`\`\`json or \`\`\` in your response:

For successful parsing:
{
  "success": true,
  "date": "YYYY-MM-DDTHH:MM:SS.sssZ", // ISO string of the parsed date and time
  "isRecurring": false, // true if this is a recurring reminder
  "recurrenceType": null, // one of: "daily", "weekly", "monthly", "yearly", or null
  "recurrenceDays": [], // for weekly recurrence, array of days (0=Sunday, 1=Monday, etc.)
  "recurrenceTime": null // for recurring reminders, the time in "HH:MM" format
}

For recurring reminders:
{
  "success": true,
  "date": "YYYY-MM-DDTHH:MM:SS.sssZ", // ISO string of the first occurrence
  "isRecurring": true,
  "recurrenceType": "daily", // or "weekly", "monthly", "yearly"
  "recurrenceDays": [1, 3, 5], // for weekly recurrence (e.g., Mon, Wed, Fri)
  "recurrenceTime": "09:00" // time in 24-hour format
}

For failed parsing:
{
  "success": false,
  "error": "No date or time information found in the input"
}

Examples:
1. "Remind me tomorrow at 3pm" -> 
{
  "success": true,
  "date": "2023-04-16T15:00:00.000Z",
  "isRecurring": false,
  "recurrenceType": null,
  "recurrenceDays": [],
  "recurrenceTime": null
}

2. "Remind me every Monday at 10am" ->
{
  "success": true,
  "date": "2023-04-17T10:00:00.000Z",
  "isRecurring": true,
  "recurrenceType": "weekly",
  "recurrenceDays": [1],
  "recurrenceTime": "10:00"
}

3. "Call mom" ->
{
  "success": false,
  "error": "No date or time information found in the input"
}`;

/**
 * Parse a natural language date/time expression using AI
 * @param text The natural language text to parse
 * @returns A structured result with the parsed date and time
 */
export async function parseDateTime(text: string, userId?: string): Promise<DateTimeParseResult> {
  try {
    // Get the current time
    const currentTime = new Date();
    
    // Get user timezone or use UTC as fallback
    const timezone = userId ? await getUserTimezone(userId) : 'Etc/UTC';
    
    // Format the current time for the prompt
    const formattedTime = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    }).format(currentTime);
    
    // Create the prompt
    const prompt = DATETIME_SYSTEM_PROMPT.replace("{current_time}", formattedTime);
    
    // Generate AI response
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    });
    
    const result = await model.generateContent([
      {
        text: prompt
      },
      {
        text: text
      }
    ]);
    
    const response = result.response;
    const responseText = response.text();
    
    // Parse the JSON response
    try {
      // Clean up the response text if it contains markdown code blocks
      let cleanedText = responseText;
      if (responseText.includes('```')) {
        cleanedText = responseText.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      }
      
      console.log("Cleaned AI date parser response:", cleanedText);
      
      const parsed = JSON.parse(cleanedText);
      
      if (parsed.success) {
        // Convert the ISO date string to a Date object
        if (parsed.date) {
          parsed.date = new Date(parsed.date);
        }
        
        return parsed as DateTimeParseResult;
      } else {
        return {
          success: false,
          error: parsed.error || "Failed to parse date/time"
        };
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      console.error("Raw response:", responseText);
      
      return {
        success: false,
        error: "Failed to parse AI response"
      };
    }
  } catch (error) {
    console.error("Error in parseDateTime:", error);
    
    return {
      success: false,
      error: "An error occurred while parsing the date/time"
    };
  }
}

/**
 * Format a date in a human-readable format
 * @param date The date to format
 * @returns A human-readable date string
 */
export function formatDateForHumans(date: Date, timezone: string = 'Etc/UTC'): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  }).format(date);
}

/**
 * Get a human-readable description of a recurrence pattern
 * @param recurrenceType The type of recurrence
 * @param recurrenceDays The days of recurrence (for weekly)
 * @param recurrenceTime The time of recurrence
 * @returns A human-readable description
 */
export function formatRecurrenceForHumans(
  recurrenceType: 'daily' | 'weekly' | 'monthly' | 'yearly',
  recurrenceDays: number[],
  recurrenceTime: string
): string {
  const timeString = formatTimeForHumans(recurrenceTime);
  
  switch (recurrenceType) {
    case 'daily':
      return `every day at ${timeString}`;
      
    case 'weekly':
      const dayNames = recurrenceDays.map(day => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[day];
      });
      
      if (dayNames.length === 1) {
        return `every ${dayNames[0]} at ${timeString}`;
      } else if (dayNames.length === 2) {
        return `every ${dayNames[0]} and ${dayNames[1]} at ${timeString}`;
      } else {
        const lastDay = dayNames.pop();
        return `every ${dayNames.join(', ')}, and ${lastDay} at ${timeString}`;
      }
      
    case 'monthly':
      return `on the same day every month at ${timeString}`;
      
    case 'yearly':
      return `on the same date every year at ${timeString}`;
      
    default:
      return `at ${timeString}`;
  }
}

/**
 * Format a time string in a human-readable format
 * @param time The time string in HH:MM format
 * @returns A human-readable time string
 */
export function formatTimeForHumans(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  
  let hour = hours;
  let period = 'AM';
  
  if (hour >= 12) {
    period = 'PM';
    if (hour > 12) {
      hour -= 12;
    }
  }
  
  if (hour === 0) {
    hour = 12;
  }
  
  if (minutes === 0) {
    return `${hour} ${period}`;
  } else {
    return `${hour}:${minutes.toString().padStart(2, '0')} ${period}`;
  }
}
