import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { formatUTCDate, getUserTimezone } from './utils/date-converter';
import { parseRelativeTimeExpressions, calculateDate, formatDateForDisplay, formatRecurrenceForDisplay, TimeExpression, DateCalculationResult } from './utils/date-calculator';

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

const DATETIME_SYSTEM_PROMPT = `You are a specialized date and time parsing assistant. Your only job is to identify and extract time expressions from natural language text.

Current time: {current_time}

TASK:
Identify time expressions in the user's message. If the message contains date and/or time information, extract the key components and return them in a structured format.

IMPORTANT RULES:
1. DO NOT calculate actual dates - just identify the time expressions and their components
2. For relative expressions like "tomorrow", "next week", identify the type (e.g., "relative_day", "relative_week")
3. For specific dates like "March 15", identify the month and day
4. For specific times like "3pm", identify the hour and minute
5. For recurring patterns, identify the recurrence type and frequency
6. For day names like "Monday", identify which day of the week (0=Sunday, 1=Monday, etc.)
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
  "timeExpression": {
    "type": "relative",
    "unit": "day",
    "value": 1,
    "time": "15:00",
    "isRecurring": false
  }
}

2. "Remind me every Monday at 10am" ->
{
  "success": true,
  "timeExpression": {
    "type": "recurring",
    "recurrenceType": "weekly",
    "recurrenceDays": [1],
    "time": "10:00",
    "isRecurring": true
  }
}

3. "Remind me on March 15 at 2pm" ->
{
  "success": true,
  "timeExpression": {
    "type": "specific_date",
    "date": "2023-03-15",
    "time": "14:00",
    "isRecurring": false
  }
}

4. "Call mom" ->
{
  "success": false,
  "error": "No date or time information found in the input"
}`;

/**
 * Parse a natural language date/time expression using AI
 * @param text The natural language text to parse
 * @param userId Optional user ID for timezone preferences
 * @returns A structured result with the parsed date and time
 */
export async function parseDateTime(text: string, userId?: string): Promise<DateTimeParseResult> {
  try {
    // Get user timezone if available, otherwise use UTC
    const timezone = userId ? await getUserTimezone(userId) : 'UTC';
    
    // First try to directly parse common relative time expressions
    // This is more accurate than relying on the AI for simple calculations
    const timeExpression = parseRelativeTimeExpressions(text);
    if (timeExpression) {
      console.log("Parsed time expression directly:", timeExpression);
      
      // Calculate the actual date using date-fns
      const calculationResult = calculateDate(timeExpression, new Date(), timezone);
      
      if (calculationResult.success) {
        console.log("Calculated date from expression:", calculationResult);
        return calculationResult;
      }
    }
    
    // Get the current time in UTC
    const currentTimeUTC = new Date();
    
    // Format the current time in pure UTC format for the prompt
    const formattedUTCTime = currentTimeUTC.toISOString();
    
    // Create the prompt - using UTC time
    const prompt = DATETIME_SYSTEM_PROMPT
      .replace("{current_time}", formattedUTCTime);
    
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
    console.log("AI response: ", responseText)
    // Parse the JSON response
    try {
      // Clean up the response text if it contains markdown code blocks
      let cleanedText = responseText;
      if (responseText.includes('```')) {
        cleanedText = responseText.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      }
      
      console.log("Cleaned AI date parser response:", cleanedText);
      
      const parsed = JSON.parse(cleanedText);
      
      // Process the AI response using our date-calculator module
      return processAIResponse(parsed, timezone);
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
 * @param timezone Optional timezone for formatting
 * @returns A human-readable date string
 */
export function formatDateForHumans(date: Date, timezone: string = 'UTC'): string {
  return formatDateForDisplay(date, timezone);
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

/**
 * Convert AI response to DateTimeParseResult
 * @param aiResponse The AI response object
 * @param timezone The user's timezone
 * @returns A structured result with the parsed date and time
 */
function processAIResponse(aiResponse: any, timezone: string = 'UTC'): DateTimeParseResult {
  try {
    if (aiResponse.success && aiResponse.timeExpression) {
      // The AI now returns a timeExpression object directly
      const timeExp = aiResponse.timeExpression;
      
      // Convert the AI's timeExpression to our TimeExpression format
      let timeExpression: TimeExpression;
      
      if (timeExp.type === 'specific_date') {
        // Handle specific date
        // If we have month and day but not a full date string, construct it
        let dateStr = timeExp.date;
        if (!dateStr && timeExp.month && timeExp.day) {
          const now = new Date();
          const year = now.getFullYear();
          // Month in JavaScript is 0-indexed, but our AI might return 1-indexed
          const month = String(timeExp.month).padStart(2, '0');
          const day = String(timeExp.day).padStart(2, '0');
          dateStr = `${year}-${month}-${day}`;
        }
        
        if (!dateStr) {
          return {
            success: false,
            error: 'No date specified for specific_date type'
          };
        }
        
        timeExpression = {
          type: 'specific_date',
          value: dateStr,
          date: dateStr,
          time: timeExp.time || '09:00'
        };
      } else if (timeExp.type === 'relative') {
        // Handle relative time expressions
        timeExpression = {
          type: 'relative',
          value: timeExp.value || 1,
          unit: timeExp.unit || 'day',
          time: timeExp.time || '09:00'
        };
      } else if (timeExp.type === 'recurring') {
        // Handle recurring reminders
        timeExpression = {
          type: 'recurring',
          value: timeExp.recurrenceType,
          time: timeExp.time || '09:00',
          recurrence: {
            type: timeExp.recurrenceType,
            days: timeExp.recurrenceDays || []
          }
        };
        
        // Make sure we set the isRecurring flag to true
        const calculationResult = calculateDate(timeExpression, new Date(), timezone);
        if (calculationResult.success) {
          calculationResult.isRecurring = true;
          calculationResult.recurrenceType = timeExp.recurrenceType;
          calculationResult.recurrenceDays = timeExp.recurrenceDays || [];
          calculationResult.recurrenceTime = timeExp.time || '09:00';
          return calculationResult;
        }
      } else {
        // Unknown type, return error
        return {
          success: false,
          error: `Unknown time expression type: ${timeExp.type}`
        };
      }
      
      // Calculate the actual date using date-fns
      console.log('Processing time expression:', timeExpression);
      const calculationResult = calculateDate(timeExpression, new Date(), timezone);
      
      if (calculationResult.success) {
        // For day_of_week expressions that contain 'every', make them recurring
        if (timeExp.type === 'day_of_week' && timeExp.isRecurring) {
          calculationResult.isRecurring = true;
          calculationResult.recurrenceType = 'weekly';
          calculationResult.recurrenceDays = [timeExp.dayOfWeek];
          calculationResult.recurrenceTime = timeExp.time || '09:00';
        }
        return calculationResult;
      } else {
        return {
          success: false,
          error: calculationResult.error || 'Failed to calculate date from time expression'
        };
      }
    }
    
    // Handle legacy format for backward compatibility
    if (aiResponse.success && aiResponse.date) {
      // Convert the ISO date string to a Date object
      const date = new Date(aiResponse.date);
      
      // Create a TimeExpression from the legacy format
      let timeExpression: TimeExpression;
      
      if (aiResponse.isRecurring && aiResponse.recurrenceType) {
        // Handle recurring reminders
        timeExpression = {
          type: 'recurring',
          value: aiResponse.recurrenceType,
          time: aiResponse.recurrenceTime || '09:00',
          recurrence: {
            type: aiResponse.recurrenceType,
            days: aiResponse.recurrenceDays || []
          }
        };
      } else {
        // Handle one-time reminders
        const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
        const timeStr = date.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
        
        timeExpression = {
          type: 'specific_date',
          value: dateStr,
          date: dateStr,
          time: timeStr
        };
      }
      
      // Calculate the actual date using date-fns
      const calculationResult = calculateDate(timeExpression, new Date(), timezone);
      if (calculationResult.success) {
        return calculationResult;
      }
      
      // Fallback to the original AI response if date-fns calculation fails
      return {
        success: true,
        date,
        isRecurring: aiResponse.isRecurring || false,
        recurrenceType: aiResponse.recurrenceType,
        recurrenceDays: aiResponse.recurrenceDays || [],
        recurrenceTime: aiResponse.recurrenceTime
      };
    }
    
    // If AI processing failed or no date was found
    return {
      success: false,
      error: aiResponse.error || "Failed to process AI response"
    };
  } catch (error) {
    console.error("Error processing AI response:", error);
    return {
      success: false,
      error: `Error processing AI response: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
