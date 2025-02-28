import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { prisma } from "./db";
import { getConversationState, updateConversationState, updateReminderData, clearConversationState } from "./conversation-state";
import { parseDateTime, formatDateForHumans, formatRecurrenceForHumans } from "./ai-date-parser";

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

// Set default timezone
const DEFAULT_TIMEZONE = 'Asia/Kolkata';

// Helper function to format date in timezone
function formatInTimezone(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short'
  }).format(date);
}

const SYSTEM_PROMPT = `You are MindlyQ, a helpful reminder assistant. Your job is to help users set, modify, and delete reminders through natural language conversation.

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
Example for casual chat:
1. "Hey, what's up?" -> { "type": "chat", "message": "Hey there! I'm your reminder assistant. How can I help you today?" }
2. "I'm fine, how about you?" -> { "type": "chat", "message": "I'm doing great! I'm here to help you set and manage your reminders. What can I do for you?" }

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

For reminder modification:
{
  "type": "modify",
  "data": {
    "search_criteria": "meeting with John", // text to search for in existing reminders
    "new_title": "Updated meeting with John", // optional, only if title is changing
    "new_date": "2023-04-16", // optional, only if date is changing
    "new_time": "16:00", // optional, only if time is changing
    "confirmation_message": "I've updated your reminder for the meeting with John to 4:00 PM on April 16, 2023."
  }
}

For reminder deletion:
{
  "type": "delete",
  "data": {
    "search_criteria": "meeting with John", // text to search for in existing reminders
    "confirmation_message": "I've deleted your reminder for the meeting with John."
  }
}

IMPORTANT RULES:
1. Detect if the user is trying to set a reminder, modify a reminder, delete a reminder, or just chatting
2. For casual chat (greetings, small talk), respond with chat type
3. Only try to collect reminder information if user clearly wants to set, modify, or delete a reminder
4. If no title is provided, use "Untitled reminder" as the default
5. Create engaging and varied reminder notifications:
   - Use friendly, conversational tone
   - Add encouraging or motivational messages when relevant
   - Vary the message format to keep it interesting
   - ALWAYS include important context that was EXPLICITLY mentioned
   - NEVER add assumptions or details that weren't mentioned by the user
6. Date handling rules:
   - If no date is mentioned but time is provided, assume it's for TODAY
   - "tomorrow" = next day
   - "next week" = 7 days from today
   - If only day of week is mentioned (e.g. "Friday"), use the next occurrence
7. For modification requests, identify which reminder to modify based on:
   - Exact title match if provided
   - Time/date references
   - Context from previous messages
8. For deletion requests, identify which reminder to delete based on:
   - Exact title match if provided
   - Time/date references
   - Context from previous messages
`;

interface ReminderResponse {
  success: boolean;
  message: string;
  error?: string;
}

// Enhanced date parsing function to handle more complex expressions
function parseRelativeDate(text: string, baseDate: Date): Date | null {
  const lowerText = text.toLowerCase();
  
  // Check for "today"
  if (lowerText.includes('today')) {
    return new Date(baseDate);
  }
  
  // Check for "tomorrow"
  if (lowerText.includes('tomorrow')) {
    const tomorrow = new Date(baseDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }
  
  // Check for "next week"
  if (lowerText.includes('next week')) {
    const nextWeek = new Date(baseDate);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek;
  }

  // Check for "in X days/weeks/months"
  const inTimeRegex = /in\s+(\d+)\s+(day|days|week|weeks|month|months)/i;
  const inTimeMatch = lowerText.match(inTimeRegex);
  if (inTimeMatch) {
    const amount = parseInt(inTimeMatch[1]);
    const unit = inTimeMatch[2].toLowerCase();
    const result = new Date(baseDate);
    
    if (unit === 'day' || unit === 'days') {
      result.setDate(result.getDate() + amount);
    } else if (unit === 'week' || unit === 'weeks') {
      result.setDate(result.getDate() + (amount * 7));
    } else if (unit === 'month' || unit === 'months') {
      result.setMonth(result.getMonth() + amount);
    }
    
    return result;
  }
  
  // Check for day of week (e.g., "next Monday", "this Friday")
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < daysOfWeek.length; i++) {
    const day = daysOfWeek[i];
    if (lowerText.includes(day)) {
      const targetDay = i;
      const currentDay = baseDate.getDay();
      let daysToAdd = targetDay - currentDay;
      
      // If the day has already passed this week, go to next week
      if (daysToAdd <= 0 || lowerText.includes('next')) {
        daysToAdd += 7;
      }
      
      const result = new Date(baseDate);
      result.setDate(result.getDate() + daysToAdd);
      return result;
    }
  }
  
  // Check for specific date formats (e.g., "May 15", "15th May", "15/05")
  const dateRegex = /(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{2,4}))?/;
  const dateMatch = lowerText.match(dateRegex);
  if (dateMatch) {
    const day = parseInt(dateMatch[1]);
    const month = parseInt(dateMatch[2]) - 1; // JavaScript months are 0-indexed
    let year = dateMatch[3] ? parseInt(dateMatch[3]) : baseDate.getFullYear();
    
    // Handle 2-digit years
    if (year < 100) {
      year += 2000;
    }
    
    return new Date(year, month, day);
  }
  
  // Check for month and day (e.g., "May 15", "15th of May")
  const months = [
    'january', 'february', 'march', 'april', 'may', 'june', 
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  
  for (let i = 0; i < months.length; i++) {
    const month = months[i];
    if (lowerText.includes(month)) {
      const monthIndex = i;
      
      // Look for a day number
      const dayRegex = new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${month}|${month}\\s+(\\d{1,2})(?:st|nd|rd|th)?`, 'i');
      const dayMatch = lowerText.match(dayRegex);
      
      if (dayMatch) {
        const day = parseInt(dayMatch[1] || dayMatch[2]);
        const year = baseDate.getFullYear();
        
        // If the date has already passed this year, go to next year
        const resultDate = new Date(year, monthIndex, day);
        if (resultDate < baseDate) {
          resultDate.setFullYear(year + 1);
        }
        
        return resultDate;
      }
    }
  }
  
  return null;
}

// Enhanced time parsing function to handle more complex expressions
function parseTimeReference(text: string): string | null {
  const lowerText = text.toLowerCase();
  
  // Regular 12-hour time format (e.g., "3:30 pm", "3pm", "3:30", "15:30")
  const timeRegex = /(\d{1,2})(?::(\d{2}))?(?:\s*(am|pm))?/i;
  const timeMatch = lowerText.match(timeRegex);
  
  if (timeMatch) {
    let hour = parseInt(timeMatch[1]);
    const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const period = timeMatch[3] ? timeMatch[3].toLowerCase() : null;
    
    // Handle 24-hour format
    if (!period && hour >= 0 && hour <= 23) {
      return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    }
    
    // Handle 12-hour format with am/pm
    if (period === 'pm' && hour < 12) {
      hour += 12;
    } else if (period === 'am' && hour === 12) {
      hour = 0;
    }
    
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }
  
  // Handle relative time expressions
  if (lowerText.includes('noon')) {
    return '12:00';
  }
  
  if (lowerText.includes('midnight')) {
    return '00:00';
  }
  
  if (lowerText.includes('morning')) {
    return '09:00';
  }
  
  if (lowerText.includes('afternoon')) {
    return '14:00';
  }
  
  if (lowerText.includes('evening')) {
    return '18:00';
  }
  
  if (lowerText.includes('night')) {
    return '20:00';
  }
  
  // Handle "in X minutes/hours" expressions
  const inTimeRegex = /in\s+(\d+)\s+(minute|minutes|hour|hours)/i;
  const inTimeMatch = lowerText.match(inTimeRegex);
  
  if (inTimeMatch) {
    const amount = parseInt(inTimeMatch[1]);
    const unit = inTimeMatch[2].toLowerCase();
    const now = new Date();
    
    if (unit === 'minute' || unit === 'minutes') {
      now.setMinutes(now.getMinutes() + amount);
    } else if (unit === 'hour' || unit === 'hours') {
      now.setHours(now.getHours() + amount);
    }
    
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  }
  
  return null;
}

export async function parseAndCreateReminder(message: string, userId: string): Promise<ReminderResponse> {
  try {
    // Get current conversation state
    const state = getConversationState(userId);
    
    // Add user message to history
    updateConversationState(userId, message, 'user');

    // Try to extract date and time using AI
    const dateTimeResult = await parseDateTime(message);
    
    // Update state with any extracted information
    if (dateTimeResult.success && dateTimeResult.date) {
      const extractedDate = dateTimeResult.date;
      const extractedTime = dateTimeResult.date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
      
      updateReminderData(userId, {
        date: extractedDate,
        time: extractedTime,
        isRecurring: dateTimeResult.isRecurring || false,
        recurrenceType: dateTimeResult.recurrenceType,
        recurrenceDays: dateTimeResult.recurrenceDays,
        recurrenceTime: dateTimeResult.recurrenceTime
      });
    }

    // Get updated state
    const updatedState = getConversationState(userId);

    // Prepare conversation context
    const conversationHistory = updatedState.messages
      .map(m => `${m.role}: ${m.content}`)
      .join("\n");

    const knownInfo = {
      date: updatedState.data.date?.toISOString().split('T')[0] || null,
      time: updatedState.data.time || null,
      title: updatedState.data.title || "Untitled reminder",
      isRecurring: updatedState.data.isRecurring || false,
      recurrenceType: updatedState.data.recurrenceType || null,
      recurrenceDays: updatedState.data.recurrenceDays || [],
      recurrenceTime: updatedState.data.recurrenceTime || null
    };

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

    const result = await model.generateContent([{
      text: SYSTEM_PROMPT
        .replace("{current_time}", formatInTimezone(new Date(), DEFAULT_TIMEZONE))
        .replace("{conversation_history}", conversationHistory)
        .replace("{known_info}", JSON.stringify(knownInfo, null, 2))
    }]);

    const response = result.response;
    const responseText = response.text();

    try {
      // Clean up the response text if it contains markdown code blocks
      let cleanedText = responseText;
      if (responseText.includes('```')) {
        cleanedText = responseText.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      }
      
      console.log("Cleaned reminder parser response:", cleanedText);
      
      // Parse the JSON response
      const parsed = JSON.parse(cleanedText);

      // Store the assistant's response in the conversation state
      updateConversationState(userId, parsed.message || parsed.data?.confirmation_message || "", 'assistant');

      if (parsed.type === "chat") {
        return {
          success: true,
          message: parsed.message
        };
      } else if (parsed.type === "incomplete") {
        // Update the partial reminder data
        updateReminderData(userId, {
          title: parsed.data.title,
          date: parsed.data.date ? new Date(parsed.data.date) : null,
          time: parsed.data.time
        });

        return {
          success: true,
          message: parsed.message
        };
      } else if (parsed.type === "complete") {
        // Create the reminder with title defaulting to "Untitled reminder" if not provided
        const reminderData: any = {
          title: parsed.data.title || "Untitled reminder",
          description: parsed.data.notification_message,
          due_date: new Date(`${parsed.data.date}T${parsed.data.time}`),
          user_id: userId,
          status: "pending"
        };
        
        // Add recurrence information if available
        if (updatedState.data.isRecurring) {
          reminderData.recurrence_type = updatedState.data.recurrenceType || "none";
          reminderData.recurrence_days = updatedState.data.recurrenceDays || [];
          reminderData.recurrence_time = updatedState.data.recurrenceTime || parsed.data.time;
          reminderData.status = "active"; // Active for recurring reminders
        } else {
          reminderData.recurrence_type = "none";
          reminderData.recurrence_days = [];
          reminderData.recurrence_time = parsed.data.time;
        }
        
        const reminder = await prisma.reminder.create({
          data: reminderData,
        });

        // Clear conversation state
        clearConversationState(userId);

        // Enhance the confirmation message with recurrence information if applicable
        let enhancedMessage = parsed.data.confirmation_message;
        if (updatedState.data.isRecurring && updatedState.data.recurrenceType) {
          const recurrenceDescription = formatRecurrenceForHumans(
            updatedState.data.recurrenceType,
            updatedState.data.recurrenceDays || [],
            updatedState.data.recurrenceTime || parsed.data.time
          );
          enhancedMessage = enhancedMessage.replace(/\.$/, "") + ` ${recurrenceDescription}.`;
        }

        return {
          success: true,
          message: enhancedMessage
        };
      } else if (parsed.type === "modify") {
        // Find the reminder to modify
        const reminder = await prisma.reminder.findFirst({
          where: {
            user_id: userId,
            title: { contains: parsed.data.search_criteria },
          },
        });

        if (!reminder) {
          return {
            success: false,
            message: "Reminder not found",
            error: "Reminder not found"
          };
        }

        // Prepare update data
        const updateData: any = {};
        
        if (parsed.data.new_title) {
          updateData.title = parsed.data.new_title;
        }
        
        if (parsed.data.new_date && parsed.data.new_time) {
          updateData.due_date = new Date(`${parsed.data.new_date}T${parsed.data.new_time}`);
        } else if (parsed.data.new_date) {
          const currentTime = reminder.due_date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          });
          updateData.due_date = new Date(`${parsed.data.new_date}T${currentTime}`);
        } else if (parsed.data.new_time) {
          const currentDate = reminder.due_date.toISOString().split('T')[0];
          updateData.due_date = new Date(`${currentDate}T${parsed.data.new_time}`);
        }
        
        // Update recurrence information if available
        if (updatedState.data.isRecurring !== undefined) {
          if (updatedState.data.isRecurring) {
            updateData.recurrence_type = updatedState.data.recurrenceType || "none";
            updateData.recurrence_days = updatedState.data.recurrenceDays || [];
            updateData.recurrence_time = updatedState.data.recurrenceTime || 
              reminder.recurrence_time || 
              reminder.due_date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
            updateData.status = "active";
          } else {
            updateData.recurrence_type = "none";
            updateData.recurrence_days = [];
            updateData.status = "pending";
          }
        }

        // Update the reminder
        await prisma.reminder.update({
          where: { id: reminder.id },
          data: updateData,
        });

        return {
          success: true,
          message: parsed.data.confirmation_message
        };
      } else if (parsed.type === "delete") {
        // Find the reminder to delete
        const reminder = await prisma.reminder.findFirst({
          where: {
            user_id: userId,
            title: { contains: parsed.data.search_criteria },
          },
        });

        if (!reminder) {
          return {
            success: false,
            message: "Reminder not found",
            error: "Reminder not found"
          };
        }

        // Delete the reminder
        await prisma.reminder.delete({
          where: { id: reminder.id },
        });

        return {
          success: true,
          message: parsed.data.confirmation_message
        };
      }

      // For incomplete reminders, update state and continue conversation
      return {
        success: false,
        message: "I didn't understand that. Could you try again?",
        error: "Unknown response type"
      };
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      console.error("Raw response:", responseText);
      
      return {
        success: false,
        message: "I'm having trouble understanding. Could you rephrase your request?",
        error: "Failed to parse AI response"
      };
    }
  } catch (error) {
    console.error("Error in parseAndCreateReminder:", error);
    
    return {
      success: false,
      message: "Sorry, something went wrong. Please try again.",
      error: "Internal error"
    };
  }
}
