import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { Agent, AgentResponse } from "./agent-interface";
import { getConversationState, updateConversationState, clearConversationState } from "../conversation-state";
import { parseDateTime } from "../ai-date-parser";
import { prisma } from "../db";
import { getUserTimezone } from "../utils/date-converter";
import { toUTC, formatUTCDate } from "../utils/date-converter";

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

const REMINDER_MODIFICATION_PROMPT = `You are MindlyQ, a helpful reminder assistant. Your job is to help users modify their existing reminders.

Current time: {current_time}

Recent conversation history:
{conversation_history}

User's existing reminders:
{existing_reminders}

IMPORTANT: Your response must be PURE JSON without any markdown formatting, code blocks, or extra text. DO NOT use \`\`\`json or \`\`\` in your response.

For reminder modification:
{
  "type": "modify",
  "data": {
    "reminder_id": 123, // ID of the reminder to modify
    "new_title": "Updated meeting with John", // optional, only if title is changing
    "new_date": "2023-04-16", // optional, only if date is changing (YYYY-MM-DD)
    "new_time": "16:00", // optional, only if time is changing (HH:MM)
    "confirmation_message": "I've updated your reminder for the meeting with John to 4:00 PM on April 16, 2023."
  }
}

For failed modification (reminder not found):
{
  "type": "not_found",
  "message": "I couldn't find a reminder matching that description. Please try again with a different description."
}

For ambiguous modification (multiple matches):
{
  "type": "ambiguous",
  "message": "I found multiple reminders that could match. Please be more specific.",
  "data": {
    "matches": [
      {
        "id": 123,
        "title": "Meeting with John",
        "due_date": "2023-04-15T15:00:00Z"
      },
      {
        "id": 124,
        "title": "Meeting with John about project",
        "due_date": "2023-04-16T10:00:00Z"
      }
    ]
  }
}

IMPORTANT RULES:
1. Identify which reminder to modify based on:
   - Exact title match if provided
   - Partial title match
   - Time/date references
   - Context from previous messages
2. If multiple reminders match the criteria, return them all so the user can clarify
3. If no reminders match, provide a helpful error message
4. Only include fields that are actually changing in the response
`;

interface ReminderModificationResponse {
  type: 'modify' | 'not_found' | 'ambiguous';
  message?: string;
  data?: {
    reminder_id?: number;
    new_title?: string;
    new_date?: string;
    new_time?: string;
    confirmation_message?: string;
    matches?: Array<{
      id: number;
      title: string;
      due_date: string;
    }>;
  };
}

/**
 * Agent responsible for modifying reminders
 */
export class ReminderModificationAgent implements Agent {
  /**
   * Process a user message to modify a reminder
   * @param message The user's message
   * @param userId The user's ID
   * @returns A response with the modified reminder or an error
   */
  async process(message: string, userId: string): Promise<AgentResponse> {
    try {
      // Get the user's timezone preference
      const userTimezone = await getUserTimezone(userId);
      // First, get all the user's reminders
      const reminders = await prisma.reminder.findMany({
        where: {
          user_id: userId,
          status: "active"
        },
        orderBy: {
          due_date: 'asc'
        }
      });
      
      if (reminders.length === 0) {
        return {
          success: false,
          message: "You don't have any active reminders to modify."
        };
      }
      
      // Try to parse date and time from the message
      const dateTimeResult = await parseDateTime(message);
      
      // Get conversation state
      const conversationState = await getConversationState(userId);
      const conversationHistory = conversationState?.history || [];
      
      // Format conversation history for the prompt
      const formattedHistory = conversationHistory
        .slice(-5) // Only use the last 5 messages for context
        .map(item => `${item.role === 'user' ? 'User' : 'Assistant'}: ${item.content}`)
        .join('\n');
      
      // Format reminders for the prompt
      const formattedReminders = reminders.map(reminder => {
        const date = new Date(reminder.due_date);
        return {
          id: reminder.id,
          title: reminder.title,
          due_date: date.toISOString(),
          recurrence_type: reminder.recurrence_type,
          recurrence_days: reminder.recurrence_days,
          recurrence_time: reminder.recurrence_time
        };
      });
      
      // Get the current time
      const currentTime = new Date();
      
      // Format the current time for the prompt using our date-converter utility
      const formattedTime = formatUTCDate(
        currentTime,
        userTimezone,
        'MM/dd/yyyy hh:mm a zzz'
      );
      
      // Create the prompt
      const prompt = REMINDER_MODIFICATION_PROMPT
        .replace("{current_time}", formattedTime)
        .replace("{conversation_history}", formattedHistory || "No previous conversation")
        .replace("{existing_reminders}", JSON.stringify(formattedReminders, null, 2));
      
      // Generate AI response using Gemini Pro
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-pro-exp",
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
        
        console.log("Reminder modification response:", cleanedText);
        
        const parsed = JSON.parse(cleanedText) as ReminderModificationResponse;
        
        // Handle different response types
        if (parsed.type === 'not_found') {
          return {
            success: false,
            message: parsed.message || "I couldn't find a reminder matching that description."
          };
        } else if (parsed.type === 'ambiguous') {
          // Multiple matches, format them for display
          if (!parsed.data?.matches || parsed.data.matches.length === 0) {
            return {
              success: false,
              message: "I found multiple matching reminders but couldn't retrieve their details."
            };
          }
          
          let message = parsed.message || "I found multiple reminders that could match. Please be more specific:";
          message += "\n\n";
          
          const formattedMatches = parsed.data.matches.map((match, index) => {
            const date = new Date(match.due_date);
            const formattedDate = formatUTCDate(
              date,
              userTimezone,
              'MMM d, yyyy h:mm aa'
            );
            
            return `${index + 1}. "${match.title}" - ${formattedDate}`;
          });
          
          message += formattedMatches.join("\n");
          
          return {
            success: true,
            message: message,
            data: parsed.data.matches
          };
        } else if (parsed.type === 'modify') {
          // We have the reminder to modify
          if (!parsed.data?.reminder_id) {
            return {
              success: false,
              message: "Missing reminder ID in modification response."
            };
          }
          
          // Find the reminder
          const reminder = await prisma.reminder.findFirst({
            where: {
              id: String(parsed.data.reminder_id),
              user_id: userId
            }
          });
          
          if (!reminder) {
            return {
              success: false,
              message: "The reminder you want to modify no longer exists."
            };
          }
          
          // Prepare update data
          const updateData: any = {};
          
          if (parsed.data.new_title) {
            updateData.title = parsed.data.new_title;
          }
          
          // Handle date and time updates
          if (parsed.data.new_date || parsed.data.new_time) {
            // Get current date and time from the reminder
            const currentDate = reminder.due_date;
            const currentDateStr = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
            const currentTimeStr = currentDate.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
            
            // Use new values or fall back to current values
            const dateStr = parsed.data.new_date || currentDateStr;
            const timeStr = parsed.data.new_time || currentTimeStr;
            
            // Create local date object based on user's timezone
            const localDate = new Date(`${dateStr}T${timeStr}:00`);
            
            // Convert to UTC for storage using our date-converter utility
            updateData.due_date = toUTC(localDate, userTimezone);
            
            console.log(`Converting modified reminder time from ${userTimezone} to UTC:`);
            console.log(`- Local time: ${localDate.toISOString()}`);
            console.log(`- UTC time: ${updateData.due_date.toISOString()}`);
          }
          
          // If we have date/time from the AI parser, use that for recurrence
          if (dateTimeResult.success && dateTimeResult.isRecurring) {
            updateData.recurrence_type = dateTimeResult.recurrenceType || 'none';
            updateData.recurrence_days = dateTimeResult.recurrenceDays || [];
            updateData.recurrence_time = dateTimeResult.recurrenceTime || parsed.data.new_time || reminder.recurrence_time;
          }
          
          // Update the reminder
          const updatedReminder = await prisma.reminder.update({
            where: {
              id: reminder.id
            },
            data: updateData
          });
          
          // Clear conversation state
          await clearConversationState(userId);
          
          // Format the confirmation message with the user's timezone
          let userTimeString = "";
          if (updateData.due_date) {
            userTimeString = new Intl.DateTimeFormat('en-US', {
              timeZone: userTimezone,
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            }).format(updateData.due_date);
          }
          
          const confirmationMessage = parsed.data.confirmation_message || 
            (updateData.due_date ? 
              `I've updated your reminder "${updatedReminder.title}" to ${userTimeString} (${userTimezone}).` : 
              `I've updated your reminder "${updatedReminder.title}".`);
          
          return {
            success: true,
            message: confirmationMessage,
            data: updatedReminder
          };
        }
        
        return {
          success: false,
          message: "Invalid response type from reminder modification."
        };
      } catch (parseError) {
        console.error("Error parsing AI response:", parseError);
        console.error("Raw response:", responseText);
        
        return {
          success: false,
          message: "Failed to parse reminder modification response."
        };
      }
    } catch (error) {
      console.error("Error in reminder modification:", error);
      
      return {
        success: false,
        message: "An error occurred during reminder modification."
      };
    }
  }
}
