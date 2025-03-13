import { HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { Agent, AgentResponse } from "./agent-interface";
import { getConversationState, updateConversationState, updateReminderData, clearConversationState } from "../conversation-state";
import { parseDateTime, formatDateForHumans, formatRecurrenceForHumans } from "../ai-date-parser";
import { prisma } from "../db";
import { getUserTimezone } from "../utils/date-converter";
import { toUTC, fromUTC, formatUTCDate, timeStringToMinutes } from "../utils/date-converter";
import { calculateDate, formatDateForDisplay, TimeExpression } from "../utils/date-calculator";
import { addDays, addHours, addMinutes } from 'date-fns';

/**
 * Directly handles relative time expressions like "in 5 minutes" or "after 2 hours"
 * @param message The user message containing the time expression
 * @param currentTime The current time
 * @returns A Date object for the future time or null if no relative time expression is found
 */
function handleRelativeTimeExpressions(message: string, currentTime: Date): Date | null {
  // Define regex patterns for common relative time expressions
  const patterns = [
    // "in X minutes/hours/days"
    /in\s+(\d+)\s+(minute|minutes|min|mins|hour|hours|hr|hrs|day|days)/i,
    // "after X minutes/hours/days"
    /after\s+(\d+)\s+(minute|minutes|min|mins|hour|hours|hr|hrs|day|days)/i,
    // "X minutes/hours/days from now"
    /(\d+)\s+(minute|minutes|min|mins|hour|hours|hr|hrs|day|days)\s+from\s+now/i
  ];

  // Try each pattern
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      const amount = parseInt(match[1], 10);
      const unit = match[2].toLowerCase();
      
      // Use date-fns for more accurate time calculations
      let futureTime: Date;
      
      // Add the appropriate amount of time using date-fns
      if (unit.startsWith('minute') || unit === 'min' || unit === 'mins') {
        // Import addMinutes from date-calculator to ensure we're using the same utility functions
        // that are used elsewhere in the codebase
        futureTime = addMinutes(currentTime, amount);
      } else if (unit.startsWith('hour') || unit === 'hr' || unit === 'hrs') {
        futureTime = addHours(currentTime, amount);
      } else if (unit.startsWith('day')) {
        futureTime = addDays(currentTime, amount);
      } else {
        // Fallback to cloning the current time if no unit matches
        futureTime = new Date(currentTime.getTime());
      }
      
      console.log(`Detected relative time expression: ${match[0]}, calculated time: ${futureTime.toISOString()}`);
      return futureTime;
    }
  }
  
  return null;
}
import { genAI, getModelForTask, DEFAULT_SAFETY_SETTINGS } from "../utils/ai-config";

const BULK_REMINDER_CREATION_PROMPT = `You are MindlyQ, a helpful reminder assistant. Your job is to help users set MULTIPLE reminders through natural language conversation.

Current time: {current_time}

Recent conversation history:
{conversation_history}

Known information about the current reminders:
{known_info}

IMPORTANT: Your response must be PURE JSON without any markdown formatting, code blocks, or extra text. DO NOT use \`\`\`json or \`\`\` in your response.

For casual chat (no reminder intent):
{
  "type": "chat",
  "message": "friendly chat response (MUST NOT be empty)"
}

For complete multiple reminder information:
{
  "type": "complete",
  "data": {
    "reminders": [
      {
        "title": "Morning Medication", // IMPORTANT: Always create a concise, meaningful title (3-5 words) that summarizes the reminder's purpose. NEVER use generic titles like "Untitled reminder" or "Reminder". Extract key information from the notification message to create a specific, descriptive title.
        "date": "2023-04-15", // YYYY-MM-DD format
        "time": "08:00", // 24-hour format
        "notification_message": "Time for your morning medication!",
        "is_recurring": true, // Set to true if this is a recurring reminder
        "recurrence_type": "daily", // Can be 'daily', 'weekly', 'monthly', or 'none'
        "recurrence_days": [0, 1, 2, 3, 4, 5, 6], // Days of week (0 = Sunday, 6 = Saturday) for weekly recurrence
        "recurrence_time": "08:00" // Time for recurring reminders (24-hour format)
      },
      {
        "title": "Evening Medication",
        "date": "2023-04-15",
        "time": "20:00",
        "notification_message": "Time for your evening medication!",
        "is_recurring": true,
        "recurrence_type": "daily",
        "recurrence_days": [0, 1, 2, 3, 4, 5, 6],
        "recurrence_time": "20:00"
      }
      // Add more reminders as needed
    ],
    "confirmation_message": "I've set recurring reminders for your medication at 8:00 AM and 8:00 PM every day."
  }
}

For incomplete reminder information (need more details):
{
  "type": "incomplete",
  "message": "I need more details to set these reminders. Could you provide the specific times for each?",
  "data": {
    "reminders": [
      {
        "title": "Meeting with John",
        "date": "2023-04-15", // may be null if unknown
        "time": null // null if unknown
      },
      {
        "title": "Call with Sarah",
        "date": "2023-04-16",
        "time": null // null if unknown
      }
    ]
  }
}

IMPORTANT RULES:
1. Always identify ALL separate reminders in the user's request
2. For each reminder:
   - Create a concise, meaningful title (3-5 words) that summarizes the reminder's purpose
   - NEVER use generic titles like "Untitled reminder" or "Reminder"
   - Extract key information from the notification message to create a specific, descriptive title
3. Create engaging and varied reminder notifications:
   - Use friendly, conversational tone
   - Add encouraging or motivational messages when relevant
   - Vary the message format to keep it interesting
   - ALWAYS include important context that was EXPLICITLY mentioned
   - NEVER add assumptions or details that weren't mentioned by the user
4. Date handling rules:
   - If no date is mentioned but time is provided, assume it's for TODAY
   - "tomorrow" = next day
   - "next week" = 7 days from today
   - If only day of week is mentioned (e.g. "Friday"), use the next occurrence
5. For series of reminders on different dates:
   - Identify patterns in the dates (e.g., every other day, specific days of week)
   - Create separate reminder objects for each date
`;

interface BulkReminderCreationResponse {
  type: 'chat' | 'complete' | 'incomplete';
  message?: string;
  data?: {
    reminders?: Array<{
      title?: string;
      date?: string;
      time?: string;
      notification_message?: string;
      is_recurring?: boolean;
      recurrence_type?: 'daily' | 'weekly' | 'monthly' | 'none';
      recurrence_days?: number[];
      recurrence_time?: string;
    }>;
    confirmation_message?: string;
  };
}

/**
 * Agent responsible for creating multiple reminders at once
 */
export class BulkReminderCreationAgent implements Agent {
  /**
   * Process a user message to create multiple reminders
   * @param message The user's message
   * @param userId The user's ID
   * @returns A response with the created reminders or a request for more information
   */
  async process(message: string, userId: string): Promise<AgentResponse> {
    try {
      // Get the user's timezone preference
      const userTimezone = await getUserTimezone(userId);
      
      // Check if we have a user preference in the database
      const userPref = await prisma.userPreference.findUnique({
        where: { userId }
      });
      
      // If no timezone is set and this appears to be a reminder request,
      // ask the user for their timezone first
      if (!userPref && !message.toLowerCase().includes("timezone") && !message.toLowerCase().includes("from")) {
        // Save the original reminder request in the conversation state
        await updateReminderData(userId, { originalRequest: message, pendingTimezone: true });
        
        return {
          success: true,
          message: "Before I set your reminders, could you please tell me your timezone or location? For example, 'I'm from India' or 'My timezone is EST'."
        };
      }
      
      // Get conversation state
      const conversationState = await getConversationState(userId);
      const conversationHistory = conversationState?.history || [];
      
      // Format conversation history for the prompt
      const formattedHistory = conversationHistory
        .slice(-5) // Only use the last 5 messages for context
        .map(item => `${item.role === 'user' ? 'User' : 'Assistant'}: ${item.content}`)
        .join('\n');
      
      // Get known reminder data from conversation state
      const knownInfo = conversationState?.reminder_data || {};
      
      // Get the current time
      const currentTime = new Date();
      
      // Format the current time for the prompt
      const formattedTime = new Intl.DateTimeFormat('en-US', {
        timeZone: userTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZoneName: 'short'
      }).format(currentTime);
      
      // Create the prompt
      const prompt = BULK_REMINDER_CREATION_PROMPT
        .replace("{current_time}", formattedTime)
        .replace("{conversation_history}", formattedHistory || "No previous conversation")
        .replace("{known_info}", JSON.stringify(knownInfo, null, 2) || "No known information");
      
      // Generate AI response using the configured model and safety settings
      const model = genAI.getGenerativeModel({ 
        model: getModelForTask('creation'),
        safetySettings: DEFAULT_SAFETY_SETTINGS,
      });
      
      const result = await model.generateContent([
        {
          text: prompt
        },
        {
          text: message
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
        
        console.log("Bulk reminder creation response:", cleanedText);
        
        const parsed = JSON.parse(cleanedText) as BulkReminderCreationResponse;
        
        // Handle different response types
        if (parsed.type === 'chat') {
          // Just a chat response, return it
          return {
            success: true,
            message: parsed.message || "I'm here to help with your reminders."
          };
        } else if (parsed.type === 'incomplete') {
          // Need more information, update state and return prompt
          if (parsed.data) {
            await updateReminderData(userId, parsed.data);
          }
          
          return {
            success: true,
            message: parsed.message || "I need more information to set your reminders."
          };
        } else if (parsed.type === 'complete') {
          // We have all the information, create the reminders
          if (!parsed.data || !parsed.data.reminders || parsed.data.reminders.length === 0) {
            return {
              success: false,
              message: "Missing reminder data in response."
            };
          }
          
          const createdReminders = [];
          const formattedDueDates = [];
          
          // Process each reminder
          for (const reminderData of parsed.data.reminders) {
            const { 
              title, 
              date, 
              time, 
              notification_message, 
              is_recurring, 
              recurrence_type, 
              recurrence_days, 
              recurrence_time 
            } = reminderData;
            
            if (!date || !time) {
              console.log(`Skipping reminder "${title}" due to missing date or time`);
              continue;
            }
            
            // First check if this is a relative time expression (like "in 5 minutes")
            // For each reminder in the bulk creation, we need to extract its specific time expression
            // from the title or notification_message
            const reminderText = notification_message || title || '';
            const relativeTime = handleRelativeTimeExpressions(reminderText, new Date());
            let dueDate: Date;
            
            if (relativeTime) {
              // Use the directly calculated relative time for this specific reminder
              dueDate = relativeTime;
              console.log(`Date calculated using relative time expression for "${title}": ${dueDate.toISOString()}`);
            } else {
              // Create a TimeExpression for the specific date and time
              const timeExpression: TimeExpression = {
                type: 'specific_date',
                value: date,
                date: date,
                time: time
              };
              
              // Calculate the actual date using date-fns
              const calculationResult = calculateDate(timeExpression, new Date(), userTimezone);
              
              // Use the calculated date if successful, otherwise fall back to manual conversion
              if (calculationResult.success && calculationResult.date) {
                dueDate = calculationResult.date;
                console.log(`Date calculated using date-calculator module: ${dueDate.toISOString()}`);
              } else {
                // Fallback to manual conversion
                const localDate = new Date(`${date}T${time}:00`);
                dueDate = toUTC(localDate, userTimezone);
                console.log(`Date calculated using manual conversion: ${dueDate.toISOString()}`);
              }
            }
            
            console.log(`Converting reminder time from ${userTimezone} to UTC:`);
            console.log(`- Original date string: ${date}T${time}:00`);
            console.log(`- UTC time: ${dueDate.toISOString()}`);
            console.log(`- User timezone: ${userTimezone}`);
            
            // Check if the reminder is for a past time
            const now = new Date();
            
            // For non-recurring reminders, skip if in the past
            if (dueDate < now && !is_recurring) {
              console.log(`Skipping reminder "${title}" because it's scheduled for a past time: ${dueDate.toISOString()}`);
              continue;
            }
            
            // For recurring reminders with a past due date, adjust to the next occurrence
            if (dueDate < now && is_recurring) {
              console.log(`Adjusting recurring reminder "${title}" from past time: ${dueDate.toISOString()}`);
              
              // For daily reminders, set to today at the specified time
              // If that time has already passed today, set to tomorrow
              if (recurrence_type === 'daily') {
                const today = new Date();
                today.setUTCHours(dueDate.getUTCHours(), dueDate.getUTCMinutes(), 0, 0);
                
                if (today < now) {
                  // Time has passed today, set to tomorrow
                  today.setDate(today.getDate() + 1);
                }
                
                dueDate = today;
                console.log(`Adjusted daily reminder to: ${dueDate.toISOString()}`);
              } 
              // For weekly reminders, find the next occurrence based on recurrence_days
              else if (recurrence_type === 'weekly' && recurrence_days && recurrence_days.length > 0) {
                const today = new Date();
                const currentDayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
                
                // Find the next day of week that occurs after today
                let daysToAdd = 7; // Default to a week if no valid day found
                for (const day of recurrence_days) {
                  const diff = (day - currentDayOfWeek + 7) % 7;
                  const nextOccurrence = diff === 0 ? 7 : diff; // If today, use next week
                  if (nextOccurrence < daysToAdd) {
                    daysToAdd = nextOccurrence;
                  }
                }
                
                const nextDate = new Date();
                nextDate.setDate(nextDate.getDate() + daysToAdd);
                nextDate.setUTCHours(dueDate.getUTCHours(), dueDate.getUTCMinutes(), 0, 0);
                
                dueDate = nextDate;
                console.log(`Adjusted weekly reminder to: ${dueDate.toISOString()}`);
              }
            }
            
            // Generate a meaningful title if none was provided
            let reminderTitle = title;
            if (!reminderTitle || reminderTitle === "Untitled reminder") {
              // Extract a meaningful title from the notification message
              if (notification_message) {
                // Remove common phrases like "Reminder to" or "Don't forget to"
                const cleanedMessage = notification_message
                  .replace(/^reminder:?\s*/i, '')
                  .replace(/^don't forget:?\s*/i, '')
                  .replace(/^remember:?\s*/i, '')
                  .replace(/^time to:?\s*/i, '')
                  .replace(/^it's time to:?\s*/i, '');
                
                // Extract first few words (up to 5) for the title
                const words = cleanedMessage.split(/\s+/);
                const titleWords = words.slice(0, 5);
                reminderTitle = titleWords.join(' ');
                
                // Capitalize first letter
                reminderTitle = reminderTitle.charAt(0).toUpperCase() + reminderTitle.slice(1);
                
                console.log(`Generated title from notification message: "${reminderTitle}"`); 
              } else {
                // Fallback if no notification message
                reminderTitle = "Reminder";
              }
            }
            
            // Handle recurring reminders
            const isRecurring = is_recurring || false;
            const finalRecurrenceType = recurrence_type || 'none';
            const finalRecurrenceDays = recurrence_days || [];
            
            // Convert recurrence_time from string to minutes since midnight in UTC
            const timeString = recurrence_time || time;
            
            // Create a Date object in the user's timezone with the specified time
            const localTimeDate = new Date(`${date}T${timeString}:00`);
            
            // Convert to UTC
            const utcTimeDate = toUTC(localTimeDate, userTimezone);
            
            // Extract hours and minutes in UTC
            const utcHours = utcTimeDate.getUTCHours();
            const utcMinutes = utcTimeDate.getUTCMinutes();
            
            // Calculate minutes since midnight in UTC
            const recurrenceTimeMinutes = utcHours * 60 + utcMinutes;
            
            console.log(`Converting recurrence time from local (${timeString} ${userTimezone}) to UTC: ${utcHours.toString().padStart(2, '0')}:${utcMinutes.toString().padStart(2, '0')} (${recurrenceTimeMinutes} minutes since midnight)`);
            
            // Create the reminder in the database
            const reminder = await prisma.reminder.create({
              data: {
                title: reminderTitle,
                due_date: dueDate,
                description: notification_message || `Reminder: ${reminderTitle}`,
                user_id: userId,
                status: "active",
                recurrence_type: isRecurring ? finalRecurrenceType : "none",
                recurrence_days: finalRecurrenceDays,
                recurrence_time: recurrenceTimeMinutes
              }
            });
            
            console.log(`Created reminder with due_date: ${dueDate.toISOString()}, recurrence_type: ${isRecurring ? finalRecurrenceType : "none"}, recurrence_time: ${recurrenceTimeMinutes}`);
            
            createdReminders.push(reminder);
            
            // Format the due date for display
            const userTimeString = formatDateForDisplay(dueDate, userTimezone);
            formattedDueDates.push({
              id: reminder.id,
              title: reminderTitle,
              formattedDueDate: userTimeString,
              isRecurring: isRecurring,
              recurrenceType: finalRecurrenceType
            });
          }
          
          // Clear conversation state since we've completed the reminders
          await clearConversationState(userId);
          
          // If no reminders were created, return an error
          if (createdReminders.length === 0) {
            return {
              success: false,
              message: "Could not create any reminders due to missing information."
            };
          }
          
          return {
            success: true,
            message: parsed.data.confirmation_message || `I've set ${createdReminders.length} reminders for you.`,
            data: {
              reminders: createdReminders,
              formattedReminders: formattedDueDates
            }
          };
        }
        
        return {
          success: false,
          message: "Invalid response type from bulk reminder creation."
        };
      } catch (parseError) {
        console.error("Error parsing AI response:", parseError);
        console.error("Raw response:", responseText);
        
        return {
          success: false,
          message: "Failed to parse bulk reminder creation response."
        };
      }
    } catch (error) {
      console.error("Error in bulk reminder creation:", error);
      
      return {
        success: false,
        message: "An error occurred during bulk reminder creation."
      };
    }
  }
}
