import { HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { Agent, AgentResponse } from "./agent-interface";
import { getConversationState, updateConversationState, updateReminderData, clearConversationState } from "../conversation-state";
import { parseDateTime, formatDateForHumans, formatRecurrenceForHumans } from "../ai-date-parser";
import { prisma } from "../db";
import { getUserTimezone } from "../utils/date-converter";
import { toUTC, fromUTC, formatUTCDate, timeStringToMinutes } from "../utils/date-converter";
import { calculateDate, formatDateForDisplay, TimeExpression } from "../utils/date-calculator";
import { genAI, getModelForTask, DEFAULT_SAFETY_SETTINGS } from "../utils/ai-config";

const REMINDER_CREATION_PROMPT = `You are MindlyQ, a helpful reminder assistant. Your job is to help users set reminders through natural language conversation.

Current time: {current_time}

Recent conversation history:
{conversation_history}

Known information about the current reminder:
{known_info}

IMPORTANT: Your response must be PURE JSON without any markdown formatting, code blocks, or extra text. DO NOT use \`\`\`json or \`\`\` in your response.

For casual chat (no reminder intent):
{
  "type": "chat",
  "message": "friendly chat response (MUST NOT be empty)"
}

For complete reminder information:
{
  "type": "complete",
  "data": {
    "title": "Meeting with John", // IMPORTANT: Always create a concise, meaningful title (3-5 words) that summarizes the reminder's purpose. NEVER use generic titles like "Untitled reminder" or "Reminder". Extract key information from the notification message to create a specific, descriptive title.
    "date": "2023-04-15", // YYYY-MM-DD format
    "time": "15:00", // 24-hour format
    "end_date": "2023-05-15", // Optional, YYYY-MM-DD format. Only for recurring reminders to specify when they should stop.
    "notification_message": "Don't forget your meeting with John!",
    "confirmation_message": "I've set a reminder for your meeting with John at 3:00 PM on April 15, 2023."
  }
}

For incomplete reminder information (need more details):
{
  "type": "incomplete",
  "message": "What time would you like me to remind you?",
  "data": {
    "title": "Meeting with John",
    "date": "2023-04-15", // may be null if unknown
    "time": null, // null if unknown
    "end_date": null // null if unknown or not applicable
  }
}

IMPORTANT RULES FOR RECURRING REMINDERS:
1. When a user specifies an end date for a recurring reminder (e.g., 'until March 22nd'), always set the end_date field
2. For recurring reminders without a specified end date, leave end_date as null
3. Include the end date information in the confirmation_message for recurring reminders
4. All dates must be in YYYY-MM-DD format and use UTC timezone
5. For relative end dates (e.g., 'for the next 2 weeks'), calculate the exact end date based on the current time

IMPORTANT RULES:
1. If no title is provided, use "Untitled reminder" as the default
2. Create engaging and varied reminder notifications:
   - Use friendly, conversational tone
   - Add encouraging or motivational messages when relevant
   - Vary the message format to keep it interesting
   - ALWAYS include important context that was EXPLICITLY mentioned
   - NEVER add assumptions or details that weren't mentioned by the user
3. Date handling rules:
   - If no date is mentioned but time is provided, assume it's for TODAY
   - "tomorrow" = next day
   - "next week" = 7 days from today
   - If only day of week is mentioned (e.g. "Friday"), use the next occurrence
`;

interface ReminderCreationResponse {
  type: 'chat' | 'complete' | 'incomplete';
  message?: string;
  data?: {
    title?: string;
    date?: string;
    time?: string;
    end_date?: string;
    notification_message?: string;
    confirmation_message?: string;
  };
}

/**
 * Agent responsible for creating reminders
 */
export class ReminderCreationAgent implements Agent {
  /**
   * Process a user message to create a reminder
   * @param message The user's message
   * @param userId The user's ID
   * @returns A response with the created reminder or a request for more information
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
          message: "Before I set your reminder, could you please tell me your timezone or location? For example, 'I'm from India' or 'My timezone is EST'."
        };
      }
      
      // First, try to parse date and time from the message
      const dateTimeResult = await parseDateTime(message, userId);
      
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
      
      // If we have date/time from the parser, add it to known info
      if (dateTimeResult.success && dateTimeResult.date) {
        const date = dateTimeResult.date;
        
        // Format date and time using our date-calculator module
        const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
        const timeStr = date.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
        
        knownInfo.date = dateStr;
        knownInfo.time = timeStr;
        
        // Add recurrence info if present
        if (dateTimeResult.isRecurring) {
          knownInfo.isRecurring = true;
          knownInfo.recurrenceType = dateTimeResult.recurrenceType;
          knownInfo.recurrenceDays = dateTimeResult.recurrenceDays;
          knownInfo.recurrenceTime = dateTimeResult.recurrenceTime;
          
          // Add human-readable recurrence description
          knownInfo.recurrenceDescription = formatRecurrenceForHumans(
            dateTimeResult.recurrenceType || 'daily',
            dateTimeResult.recurrenceDays || [],
            dateTimeResult.recurrenceTime || '09:00'
          );
        }
      }
      
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
      const prompt = REMINDER_CREATION_PROMPT
        .replace("{current_time}", formattedTime)
        .replace("{conversation_history}", formattedHistory || "No previous conversation")
        .replace("{known_info}", JSON.stringify(knownInfo, null, 2) || "No known information");
      
      // Generate AI response using the configured model and safety settings for reminder creation
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
        
        console.log("Reminder creation response:", cleanedText);
        
        const parsed = JSON.parse(cleanedText) as ReminderCreationResponse;
        
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
            message: parsed.message || "I need more information to set your reminder."
          };
        } else if (parsed.type === 'complete') {
          // We have all the information, create the reminder
          if (!parsed.data) {
            return {
              success: false,
              message: "Missing reminder data in response."
            };
          }
          
          const { title, date, time, end_date, notification_message, confirmation_message } = parsed.data;
          
          if (!date || !time) {
            return {
              success: false,
              message: "Missing date or time for reminder."
            };
          }
          
          // Create the reminder in the database using our date-calculator module
          // First, create a TimeExpression for the specific date and time
          const timeExpression: TimeExpression = {
            type: 'specific_date',
            value: date,
            date: date,
            time: time
          };
          
          // Calculate the actual date using date-fns
          const calculationResult = calculateDate(timeExpression, new Date(), userTimezone);
          
          // Use the calculated date if successful, otherwise fall back to manual conversion
          let dueDate: Date;
          
          if (calculationResult.success && calculationResult.date) {
            // The date-calculator module should return a date in UTC
            // But let's ensure it's definitely in UTC by converting it explicitly
            dueDate = calculationResult.date;
            console.log(`Date calculated using date-calculator module (before UTC conversion): ${dueDate.toISOString()}`);
            
            // Ensure the date is in UTC
            if (!(dueDate instanceof Date && !isNaN(dueDate.getTime()))) {
              // If the date is invalid, create a new one
              dueDate = new Date();
            }
            
            // Convert to UTC if needed
            dueDate = toUTC(dueDate, userTimezone);
            console.log(`Date after explicit UTC conversion: ${dueDate.toISOString()}`);
          } else {
            // Fallback to manual conversion
            // Create a local date in the user's timezone
            const localDate = new Date(`${date}T${time}:00`);
            console.log(`Local date created: ${localDate.toISOString()} (local representation)`);
            
            // Convert to UTC for storage
            dueDate = toUTC(localDate, userTimezone);
            console.log(`Date after UTC conversion: ${dueDate.toISOString()}`);
          }
          
          console.log(`Converting reminder time from ${userTimezone} to UTC:`);
          console.log(`- Original date string: ${date}T${time}:00`);
          console.log(`- UTC time: ${dueDate.toISOString()}`);
          console.log(`- User timezone: ${userTimezone}`);
          
          // Log any date shifts for debugging
          const localDate = new Date(`${date}T${time}:00`);
          const localDateDay = localDate.getDate();
          const utcDateDay = dueDate.getUTCDate();
          if (localDateDay !== utcDateDay) {
            console.log(`WARNING: Date day shifted from ${localDateDay} to ${utcDateDay} during timezone conversion`);
          }
          
          // Check if this is a recurring reminder
          const isRecurring = knownInfo.isRecurring || false;
          const recurrenceType = knownInfo.recurrenceType || 'none';
          const recurrenceDays = knownInfo.recurrenceDays || [];
          
          // Convert recurrence_time from string to minutes since midnight in UTC
          const timeString = knownInfo.recurrenceTime || time;
          
          // Create a Date object in the user's timezone with the specified time
          const localTimeDate = new Date(`${date}T${timeString}:00`);
          console.log(`Local time date created: ${localTimeDate.toISOString()} (local representation)`);
          
          // Convert to UTC - this ensures we're working with UTC time
          const utcTimeDate = toUTC(localTimeDate, userTimezone);
          console.log(`UTC time date after conversion: ${utcTimeDate.toISOString()}`);
          
          // Handle short-term reminders (like "in 2 minutes")
          const now = new Date();
          const timeUntilReminder = localDate.getTime() - now.getTime();
          const isShortTerm = timeUntilReminder < 5 * 60 * 1000; // Less than 5 minutes from now
          
          // Check if the reminder is for a past time
          if (dueDate < now && !isRecurring) {
            return {
              success: false,
              message: "I can't create a reminder for a time that has already passed. Please provide a future date and time."
            };
          }
          
          // For recurring reminders with a past due date, adjust to the next occurrence
          if (dueDate < now && isRecurring) {
            console.log(`Adjusting recurring reminder from past time: ${dueDate.toISOString()}`);
            
            // For daily reminders, set to today at the specified time
            // If that time has already passed today, set to tomorrow
            if (recurrenceType === 'daily') {
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
            else if (recurrenceType === 'weekly' && recurrenceDays && recurrenceDays.length > 0) {
              const today = new Date();
              const currentDayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
              
              // Find the next day of week that occurs after today
              let daysToAdd = 7; // Default to a week if no valid day found
              for (const day of recurrenceDays) {
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
          
          // Always use the calculated due date, even for short-term reminders
          let finalDueDate = dueDate;
          
          if (isShortTerm) {
            console.log(`Detected short-term reminder (${Math.round(timeUntilReminder/1000)} seconds from now), preserving exact due_date: ${dueDate.toISOString()}`);
            // We keep the exact due_date to ensure the reminder is triggered at the right time
          }
          
          // IMPORTANT: Calculate recurrence_time based on finalDueDate to ensure consistency
          // Extract hours and minutes from the finalDueDate (which is in UTC)
          // We use getUTCHours and getUTCMinutes to ensure we're getting the UTC time components
          const utcHours = finalDueDate.getUTCHours();
          const utcMinutes = finalDueDate.getUTCMinutes();
          
          // Calculate minutes since midnight in UTC
          // Always use the due_date hours and minutes to ensure consistency
          const dueDateMinutes = finalDueDate.getUTCHours() * 60 + finalDueDate.getUTCMinutes();
          let recurrenceTimeMinutes = dueDateMinutes;
          
          console.log(`Setting recurrence time based on due_date (${finalDueDate.toISOString()})`);
          console.log(`UTC time: ${utcHours.toString().padStart(2, '0')}:${utcMinutes.toString().padStart(2, '0')} (${recurrenceTimeMinutes} minutes since midnight)`);
          console.log(`Original local time was: ${timeString} ${userTimezone}`);
          
          // Log the recurrence time for verification
          const recurrenceHours = Math.floor(recurrenceTimeMinutes / 60);
          const recurrenceMinutes = recurrenceTimeMinutes % 60;
          console.log(`Recurrence time (UTC): ${recurrenceHours.toString().padStart(2, '0')}:${recurrenceMinutes.toString().padStart(2, '0')}`);
          console.log(`Due date time (UTC): ${finalDueDate.getUTCHours().toString().padStart(2, '0')}:${finalDueDate.getUTCMinutes().toString().padStart(2, '0')}`);
          console.log(`Consistency check: ${recurrenceTimeMinutes === dueDateMinutes ? 'PASSED ✅' : 'FAILED ❌'}`);
          
          
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
          
          // Parse end_date if provided for recurring reminders
          let endDateTime: Date | null = null;
          if (end_date && isRecurring) {
            // Create end date at the same time as the reminder
            const endLocalDate = new Date(`${end_date}T${time}:00`);
            // Convert to UTC for storage
            endDateTime = toUTC(endLocalDate, userTimezone);
            console.log(`End date set to (UTC): ${endDateTime.toISOString()}`);
            console.log(`End date in user timezone (${userTimezone}): ${fromUTC(endDateTime, userTimezone).toLocaleString()}`);
          }

          const reminder = await prisma.reminder.create({
            data: {
              title: reminderTitle,
              due_date: finalDueDate,
              description: notification_message || `Reminder: ${reminderTitle}`,
              user_id: userId,
              status: "active",
              recurrence_type: recurrenceType,
              recurrence_days: recurrenceDays,
              recurrence_time: recurrenceTimeMinutes,
              end_date: endDateTime
            }
          });
          
          console.log(`Created reminder with due_date: ${finalDueDate.toISOString()} and recurrence_time: ${recurrenceTimeMinutes} minutes (${timeString})`);
          
          // Clear conversation state since we've completed the reminder
          await clearConversationState(userId);
          
          // Format the confirmation message with the user's timezone using our date-calculator module
          const userTimeString = formatDateForDisplay(finalDueDate, userTimezone);
          
          // Format end date if present
          let endDateString = '';
          if (endDateTime) {
            endDateString = ` until ${formatDateForDisplay(endDateTime, userTimezone)}`;
          }
          
          // Create a recurrence description if this is a recurring reminder
          let recurrenceDescription = '';
          if (isRecurring && recurrenceType !== 'none') {
            // Ensure recurrenceType is one of the valid types
            const validRecurrenceType = recurrenceType as 'daily' | 'weekly' | 'monthly' | 'yearly';
            const recurrenceInfo = formatRecurrenceForHumans(
              validRecurrenceType,
              recurrenceDays,
              timeString
            );
            recurrenceDescription = ` (${recurrenceInfo}${endDateString})`;
          }
          
          return {
            success: true,
            message: confirmation_message || 
              `I've set a reminder for "${reminderTitle}" on ${userTimeString}${recurrenceDescription} (${userTimezone})`,
            data: {
              ...reminder,
              // Include formatted dates for display
              formattedDueDate: userTimeString,
              formattedEndDate: endDateTime ? formatDateForDisplay(endDateTime, userTimezone) : null
            }
          };
        }
        
        return {
          success: false,
          message: "Invalid response type from reminder creation."
        };
      } catch (parseError) {
        console.error("Error parsing AI response:", parseError);
        console.error("Raw response:", responseText);
        
        return {
          success: false,
          message: "Failed to parse reminder creation response."
        };
      }
    } catch (error) {
      console.error("Error in reminder creation:", error);
      
      return {
        success: false,
        message: "An error occurred during reminder creation."
      };
    }
  }
}
