import { HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { Agent, AgentResponse } from "./agent-interface";
import { getConversationState, updateConversationState, clearConversationState, updateReminderData } from "../conversation-state";
import { parseDateTime, formatDateForHumans, formatRecurrenceForHumans } from "../ai-date-parser";
import { prisma } from "../db";
import { getUserTimezone } from "../utils/date-converter";
import { toUTC, fromUTC, formatUTCDate, timeStringToMinutes } from "../utils/date-converter";
import { calculateDate, formatDateForDisplay, TimeExpression } from "../utils/date-calculator";
import { genAI, getModelForTask, DEFAULT_SAFETY_SETTINGS } from "../utils/ai-config";

const REMINDER_MODIFICATION_PROMPT = `You are MindlyQ, a helpful reminder assistant. Your job is to help users modify their existing reminders.

Current time: {current_time}

Recent conversation history:
{conversation_history}

User's existing reminders:
{existing_reminders}

Known information about the current modification:
{known_info}

IMPORTANT: Your response must be PURE JSON without any markdown formatting, code blocks, or extra text. DO NOT use \`\`\`json or \`\`\` in your response.

For reminder modification:
{
  "type": "modify",
  "data": {
    "reminder_id": 123, // ID of the reminder to modify
    "new_title": "Updated meeting with John", // optional, only if title is changing. IMPORTANT: Always create a concise, meaningful title (3-5 words) that summarizes the reminder's purpose. NEVER use generic titles like "Untitled reminder" or "Reminder". Extract key information from the description to create a specific, descriptive title.
    "new_description": "Prepare agenda and slides", // optional, only if description is changing
    "new_date": "2023-04-16", // optional, only if date is changing (YYYY-MM-DD)
    "new_time": "16:00", // optional, only if time is changing (HH:MM)
    "confirmation_message": "I've updated your reminder for the meeting with John to 4:00 PM on April 16, 2023."
  }
}

For incomplete modification (need more details):
{
  "type": "incomplete",
  "message": "Which reminder would you like to modify? I found several that could match.",
  "data": {
    "reminder_id": null, // null if unknown
    "new_title": "Updated meeting with John", // optional, may be null if unknown
    "new_date": "2023-04-16", // optional, may be null if unknown
    "new_time": "16:00" // optional, may be null if unknown
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
  type: 'modify' | 'not_found' | 'ambiguous' | 'incomplete';
  message?: string;
  data?: {
    reminder_id?: number;
    new_title?: string;
    new_description?: string;
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
      
      // Check if we need to ask for timezone first
      const userPref = await getUserTimezone(userId);
      if (!userPref && !message.toLowerCase().includes("timezone") && !message.toLowerCase().includes("from")) {
        // Save the original modification request in the conversation state
        await updateReminderData(userId, { originalRequest: message, pendingTimezone: true });
        
        return {
          success: true,
          message: "Before I modify your reminder, could you please tell me your timezone or location? For example, 'I'm from India' or 'My timezone is EST'."
        };
      }
      
      // Try to parse date and time from the message
      const dateTimeResult = await parseDateTime(message, userId);
      
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
      
      // Get known reminder data from conversation state
      const knownInfo = conversationState?.reminder_data || {};
      
      // If we have date/time from the parser, add it to known info
      if (dateTimeResult.success && dateTimeResult.date) {
        const date = dateTimeResult.date;
        
        // Format date and time
        const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
        const timeStr = date.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
        
        knownInfo.new_date = dateStr;
        knownInfo.new_time = timeStr;
        
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
      
      // Create the prompt
      const prompt = REMINDER_MODIFICATION_PROMPT
        .replace("{current_time}", formattedTime)
        .replace("{conversation_history}", formattedHistory || "No previous conversation")
        .replace("{existing_reminders}", JSON.stringify(formattedReminders, null, 2))
        .replace("{known_info}", JSON.stringify(knownInfo, null, 2) || "No known information");
      
      // Generate AI response using the configured model and safety settings for reminder modification
      const model = genAI.getGenerativeModel({ 
        model: getModelForTask('modification'),
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
        
        console.log("Reminder modification response:", cleanedText);
        
        const parsed = JSON.parse(cleanedText) as ReminderModificationResponse;
        
        // Handle different response types
        if (parsed.type === 'not_found') {
          return {
            success: false,
            message: parsed.message || "I couldn't find a reminder matching that description."
          };
        } else if (parsed.type === 'incomplete') {
          // Need more information, update state and return prompt
          if (parsed.data) {
            await updateReminderData(userId, parsed.data);
          }
          
          return {
            success: true,
            message: parsed.message || "I need more information to modify your reminder."
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
          
          // Handle title updates
          if (parsed.data.new_title) {
            // Check if the new title is generic
            if (parsed.data.new_title === "Untitled reminder" || parsed.data.new_title === "Reminder") {
              // Try to generate a better title from the description
              if (parsed.data.new_description || reminder.description) {
                const description = parsed.data.new_description || reminder.description || "";
                
                // Remove common phrases
                const cleanedMessage = description
                  .replace(/^reminder:?\s*/i, '')
                  .replace(/^don't forget:?\s*/i, '')
                  .replace(/^remember:?\s*/i, '')
                  .replace(/^time to:?\s*/i, '')
                  .replace(/^it's time to:?\s*/i, '');
                
                // Extract first few words (up to 5) for the title
                const words = cleanedMessage.split(/\s+/);
                const titleWords = words.slice(0, 5);
                const generatedTitle = titleWords.join(' ');
                
                // Capitalize first letter
                updateData.title = generatedTitle.charAt(0).toUpperCase() + generatedTitle.slice(1);
                console.log(`Generated better title from description: "${updateData.title}" instead of "${parsed.data.new_title}"`);
              } else {
                // If no description is available, use the provided title
                updateData.title = parsed.data.new_title;
              }
            } else {
              // Use the provided title as it's not generic
              updateData.title = parsed.data.new_title;
            }
          }
          
          if (parsed.data.new_description) {
            updateData.description = parsed.data.new_description;
          }
          
          // Handle date and time updates
          if (parsed.data.new_date || parsed.data.new_time) {
            console.log('Time modification requested:');
            console.log(`- New date from request: ${parsed.data.new_date || 'not specified'}`);
            console.log(`- New time from request: ${parsed.data.new_time || 'not specified'}`);
            
            // Get current date and time from the reminder
            const currentDate = reminder.due_date;
            console.log(`- Current reminder date in DB (UTC): ${currentDate.toISOString()}`);
            
            // Extract date and time components
            const currentDateStr = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
            
            // For time, we need to convert the stored recurrence_time (minutes since midnight in UTC)
            // back to a string format for display and modification
            let currentTimeStr;
            if (reminder.recurrence_time !== null) {
              // Convert minutes since midnight to hours and minutes
              const hours = Math.floor(reminder.recurrence_time / 60);
              const minutes = reminder.recurrence_time % 60;
              currentTimeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
              console.log(`- Current time from recurrence_time (${reminder.recurrence_time} minutes): ${currentTimeStr}`);
            } else {
              // Fall back to extracting from the UTC time
              currentTimeStr = currentDate.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
              console.log(`- Current time extracted from UTC: ${currentTimeStr}`);
            }
            
            console.log(`- Current date component: ${currentDateStr}`);
            console.log(`- Current time component: ${currentTimeStr}`);
            
            // Use new values or fall back to current values
            const dateStr = parsed.data.new_date || currentDateStr;
            const timeStr = parsed.data.new_time || currentTimeStr;
            console.log(`- Date string to use: ${dateStr}`);
            console.log(`- Time string to use: ${timeStr}`);
            
            // Create a Date object in the user's timezone with the specified time
            const localTimeDate = new Date(`${dateStr}T${timeStr}:00`);
            
            // Convert to UTC
            const utcTimeDate = toUTC(localTimeDate, userTimezone);
            
            // Extract hours and minutes in UTC
            const utcHours = utcTimeDate.getUTCHours();
            const utcMinutes = utcTimeDate.getUTCMinutes();
            
            // Calculate minutes since midnight in UTC
            const recurrenceTimeMinutes = utcHours * 60 + utcMinutes;
            
            // Store recurrence_time as minutes since midnight in UTC
            updateData.recurrence_time = recurrenceTimeMinutes;
            console.log(`- Setting recurrence_time to: ${recurrenceTimeMinutes} minutes (${utcHours.toString().padStart(2, '0')}:${utcMinutes.toString().padStart(2, '0')} UTC from local ${timeStr} ${userTimezone})`);
            
            // Create local date object based on user's timezone
            const localDateStr = `${dateStr}T${timeStr}:00`;
            console.log(`- Local date string: ${localDateStr}`);
            
            const localDate = new Date(localDateStr);
            console.log(`- Local date object: ${localDate.toISOString()}`);
            
            // Convert to UTC for storage using our date-converter utility
            updateData.due_date = toUTC(localDate, userTimezone);
            
            console.log(`- User timezone: ${userTimezone}`);
            console.log(`- Final UTC time for storage: ${updateData.due_date.toISOString()}`);
            
            // Check if the modified date is in the past
            const now = new Date();
            const isRecurring = reminder.recurrence_type !== 'none' || 
                              (updateData.recurrence_type && updateData.recurrence_type !== 'none');
            
            // For non-recurring reminders, prevent setting to a past time
            if (updateData.due_date < now && !isRecurring) {
              return {
                success: false,
                message: "I can't modify this reminder to a time that has already passed. Please provide a future date and time."
              };
            }
            
            // For recurring reminders with a past due date, adjust to the next occurrence
            if (updateData.due_date < now && isRecurring) {
              console.log(`Adjusting recurring reminder from past time: ${updateData.due_date.toISOString()}`);
              
              // Get the effective recurrence type (either from update or existing reminder)
              const recurrenceType = updateData.recurrence_type || reminder.recurrence_type;
              const recurrenceDays = updateData.recurrence_days || reminder.recurrence_days;
              
              // For daily reminders, set to today at the specified time
              // If that time has already passed today, set to tomorrow
              if (recurrenceType === 'daily') {
                const today = new Date();
                today.setUTCHours(updateData.due_date.getUTCHours(), updateData.due_date.getUTCMinutes(), 0, 0);
                
                if (today < now) {
                  // Time has passed today, set to tomorrow
                  today.setDate(today.getDate() + 1);
                }
                
                updateData.due_date = today;
                console.log(`Adjusted daily reminder to: ${updateData.due_date.toISOString()}`);
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
                nextDate.setUTCHours(updateData.due_date.getUTCHours(), updateData.due_date.getUTCMinutes(), 0, 0);
                
                updateData.due_date = nextDate;
                console.log(`Adjusted weekly reminder to: ${updateData.due_date.toISOString()}`);
              }
            }
          }
          
          // If we have date/time from the AI parser, use that for recurrence
          if (dateTimeResult.success && dateTimeResult.isRecurring) {
            updateData.recurrence_type = dateTimeResult.recurrenceType || 'none';
            updateData.recurrence_days = dateTimeResult.recurrenceDays || [];
            
            // If we haven't already set recurrence_time from the new_time field
            if (!updateData.recurrence_time) {
              const recurrenceTimeStr = dateTimeResult.recurrenceTime || parsed.data.new_time;
              
              if (recurrenceTimeStr) {
                // Create a Date object in the user's timezone with the specified time
                // Use current date if no date was specified
                const currentDateStr = new Date().toISOString().split('T')[0];
                const localTimeDate = new Date(`${currentDateStr}T${recurrenceTimeStr}:00`);
                
                // Convert to UTC
                const utcTimeDate = toUTC(localTimeDate, userTimezone);
                
                // Calculate minutes since midnight in UTC
                const recurrenceTimeMinutes = utcTimeDate.getUTCHours() * 60 + utcTimeDate.getUTCMinutes();
                updateData.recurrence_time = recurrenceTimeMinutes;
                
                console.log(`- Setting recurrence_time from AI parser: ${recurrenceTimeMinutes} minutes (from ${recurrenceTimeStr} ${userTimezone})`);
              } else if (reminder.recurrence_time !== null) {
                // Keep the existing recurrence_time if available
                updateData.recurrence_time = reminder.recurrence_time;
                console.log(`- Keeping existing recurrence_time: ${reminder.recurrence_time} minutes`);
              }
            }
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
          
          // Log the successful update
          console.log(`Successfully updated reminder ${reminder.id}:`, updateData);
          
          // Format the confirmation message with the user's timezone using our date-calculator module
          let userTimeString = "";
          if (updateData.due_date) {
            userTimeString = formatDateForDisplay(updateData.due_date, userTimezone);
          }
          
          // Build a confirmation message based on what was updated
          let confirmationMessage = parsed.data.confirmation_message;
          
          if (!confirmationMessage) {
            const changedFields = [];
            
            if (updateData.title) {
              changedFields.push("title");
            }
            
            if (updateData.description) {
              changedFields.push("description");
            }
            
            if (updateData.due_date) {
              changedFields.push("time");
            }
            
            if (changedFields.length === 0) {
              // No fields were actually updated
              confirmationMessage = `No changes were made to your reminder "${updatedReminder.title}".`;
            } else if (changedFields.length === 1) {
              // Single field updated
              if (changedFields[0] === "time") {
                confirmationMessage = `I've updated your reminder "${updatedReminder.title}" to ${userTimeString} (${userTimezone}).`;
              } else if (changedFields[0] === "title") {
                confirmationMessage = `I've updated the title of your reminder to "${updatedReminder.title}".`;
              } else if (changedFields[0] === "description") {
                confirmationMessage = `I've updated the description of your reminder "${updatedReminder.title}".`;
              }
            } else {
              // Multiple fields updated
              confirmationMessage = `I've updated the ${changedFields.join(" and ")} of your reminder "${updatedReminder.title}"`;
              if (updateData.due_date) {
                confirmationMessage += `. The new time is ${userTimeString} (${userTimezone})`;
              }
              confirmationMessage += ".";
            }
          }
          
          // Ensure confirmationMessage is never undefined
          if (!confirmationMessage) {
            confirmationMessage = `Your reminder "${updatedReminder.title}" has been updated.`;
          }
          
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
