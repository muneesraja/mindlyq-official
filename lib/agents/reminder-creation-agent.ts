import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { Agent, AgentResponse } from "./agent-interface";
import { getConversationState, updateConversationState, updateReminderData, clearConversationState } from "../conversation-state";
import { parseDateTime, formatDateForHumans, formatRecurrenceForHumans } from "../ai-date-parser";
import { prisma } from "../db";
import { getUserTimezone } from "../utils/date-converter";
import { toUTC, fromUTC, formatUTCDate } from "../utils/date-converter";
import { calculateDate, formatDateForDisplay, TimeExpression } from "../utils/date-calculator";

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

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
    "title": "Meeting with John",
    "date": "2023-04-15", // YYYY-MM-DD format
    "time": "15:00", // 24-hour format
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
    "time": null // null if unknown
  }
}

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
      
      // Generate AI response using Gemini Pro for detailed processing
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
          
          const { title, date, time, notification_message, confirmation_message } = parsed.data;
          
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
            dueDate = calculationResult.date;
            console.log(`Date calculated using date-calculator module: ${dueDate.toISOString()}`);
          } else {
            // Fallback to manual conversion
            const localDate = new Date(`${date}T${time}:00`);
            dueDate = toUTC(localDate, userTimezone);
            console.log(`Date calculated using manual conversion: ${dueDate.toISOString()}`);
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
          const recurrenceTime = knownInfo.recurrenceTime || time;
          
          // Handle short-term reminders (like "in 2 minutes")
          const now = new Date();
          const timeUntilReminder = localDate.getTime() - now.getTime();
          const isShortTerm = timeUntilReminder < 5 * 60 * 1000; // Less than 5 minutes from now
          
          // Always use the calculated due date, even for short-term reminders
          let finalDueDate = dueDate;
          
          if (isShortTerm) {
            console.log(`Detected short-term reminder (${Math.round(timeUntilReminder/1000)} seconds from now), preserving exact due_date: ${dueDate.toISOString()}`);
            // We keep the exact due_date to ensure the reminder is triggered at the right time
          }
          
          const reminder = await prisma.reminder.create({
            data: {
              title: title || "Untitled reminder",
              due_date: finalDueDate,
              description: notification_message || `Reminder: ${title || "Untitled reminder"}`,
              user_id: userId,
              status: "active",
              recurrence_type: recurrenceType,
              recurrence_days: recurrenceDays,
              recurrence_time: recurrenceTime
            }
          });
          
          console.log(`Created reminder with due_date: ${finalDueDate.toISOString()} and recurrence_time: ${recurrenceTime}`);
          
          // Clear conversation state since we've completed the reminder
          await clearConversationState(userId);
          
          // Format the confirmation message with the user's timezone using our date-calculator module
          const userTimeString = formatDateForDisplay(finalDueDate, userTimezone);
          
          return {
            success: true,
            message: confirmation_message || `I've set a reminder for "${title || "Untitled reminder"}" on ${userTimeString} (${userTimezone}).`,
            data: {
              ...reminder,
              // Include formatted date for display
              formattedDueDate: userTimeString
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
