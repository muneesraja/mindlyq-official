import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { prisma } from "./db";
import { getConversationState, updateConversationState, updateReminderData, clearConversationState } from "./conversation-state";

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

const SYSTEM_PROMPT = `You are a reminder assistant helping set reminders through natural conversation.

Current time: {current_time}
Previous messages: {conversation_history}
Currently known information: {known_info}

IMPORTANT RULES:
1. Detect if the user is trying to set a reminder or just chatting
2. For casual chat (greetings, small talk), respond with chat type
3. Only try to collect reminder information if user clearly wants to set a reminder
4. NEVER ask for reminder details unless user indicates they want to set one
5. Create engaging and varied reminder notifications:
   - Use friendly, conversational tone
   - Add encouraging or motivational messages when relevant
   - Vary the message format to keep it interesting
   - ALWAYS include important context that was EXPLICITLY mentioned:
     * Names of people involved
     * Specific locations
     * Any other critical details
   - NEVER add assumptions or details that weren't mentioned by the user
   - NEVER mention specific offices, rooms, or requirements unless explicitly stated
6. Date handling rules:
   - If no date is mentioned but time is provided, assume it's for TODAY
   - "tomorrow" = next day
   - "next week" = 7 days from today
   - If only day of week is mentioned (e.g. "Friday"), use the next occurrence
   - Always include date in YYYY-MM-DD format in your response

Your response must be JSON in this format:

For casual chat (no reminder intent):
{
  "type": "chat",
  "message": "friendly chat response"
}

For complete reminder information:
{
  "type": "complete",
  "data": {
    "title": "what to remind about",
    "date": "YYYY-MM-DD (use current date if only time was provided)",
    "time": "HH:mm",
    "confirmation_message": "message confirming the reminder was set",
    "notification_message": "creative message using ONLY explicitly mentioned details"
  }
}

Example responses:
1. User: "remind me at 3pm to call mom about the family dinner"
   Response: {
     "type": "complete",
     "data": {
       "title": "call mom about family dinner",
       "date": "<current_date>",
       "time": "15:00",
       "confirmation_message": "I'll remind you to call mom about the family dinner at 3 PM today",
       "notification_message": "📞 Time to call mom about the family dinner!"
     }
   }

2. User: "remind me tomorrow morning to get documents from John at the office"
   Response: {
     "type": "complete",
     "data": {
       "title": "get documents from John",
       "date": "<tomorrow_date>",
       "time": "09:00",
       "confirmation_message": "I'll remind you to get the documents from John tomorrow at 9 AM",
       "notification_message": "📄 Head to the office to collect those documents from John! "
     }
   }

3. User: "remind me at 4:23 to get my degree certificate from Saravanan"
   Response: {
     "type": "complete",
     "data": {
       "title": "get degree certificate from Saravanan",
       "date": "<current_date>",
       "time": "16:23",
       "confirmation_message": "I'll remind you to collect your degree certificate from Saravanan at 4:23 PM today",
       "notification_message": "🎓 Time to head to college and collect your degree certificate from Saravanan!"
     }
   }

For incomplete reminder information:
{
  "type": "incomplete",
  "data": {
    "title": "extracted title or null",
    "date": "extracted date or null",
    "time": "extracted time or null"
  },
  "missing": ["date", "time", or "title"],
  "message": "question asking ONLY for the next missing piece"
}`;

interface ReminderResponse {
  success: boolean;
  message: string;
  error?: string;
}

// Helper function to parse relative dates
function parseRelativeDate(text: string, currentTime: Date): Date | null {
  const tomorrow = new Date(currentTime);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('tomorrow')) {
    return tomorrow;
  }
  
  return null;
}

// Helper function to parse time references
function parseTimeReference(text: string): string | null {
  const timeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch) {
    const [_, hours, minutes = '00', meridian] = timeMatch;
    let hour = parseInt(hours);
    
    if (meridian?.toLowerCase() === 'pm' && hour < 12) {
      hour += 12;
    } else if (meridian?.toLowerCase() === 'am' && hour === 12) {
      hour = 0;
    }
    
    return `${hour.toString().padStart(2, '0')}:${minutes}`;
  }
  
  const lowerText = text.toLowerCase();
  if (lowerText.includes('afternoon')) return '15:00';
  if (lowerText.includes('morning')) return '09:00';
  if (lowerText.includes('evening')) return '18:00';
  
  return null;
}

export async function parseAndCreateReminder(message: string, userId: string): Promise<ReminderResponse> {
  try {
    // Get current conversation state
    const state = getConversationState(userId);
    
    // Add user message to history
    updateConversationState(userId, message, 'user');

    // Try to extract date and time from current message
    const currentTime = new Date();
    const extractedDate = parseRelativeDate(message, currentTime);
    const extractedTime = parseTimeReference(message);

    // Update state with any extracted information
    if (extractedDate || extractedTime) {
      updateReminderData(userId, {
        date: extractedDate || state.data.date,
        time: extractedTime || state.data.time
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
      title: updatedState.data.title || null
    };

    // Generate AI response
    const model = genAI.getGenerativeModel({ 
      model: "gemini-pro",
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
        .replace("{current_time}", currentTime.toISOString())
        .replace("{conversation_history}", conversationHistory)
        .replace("{known_info}", JSON.stringify(knownInfo))
    }, { text: message }]);

    if (result.response.promptFeedback?.blockReason) {
      return {
        success: false,
        message: "I can only help with setting reminders. Please rephrase your request.",
        error: "Response blocked by safety filters"
      };
    }

    const response = result.response;
    const text = response.text();
    console.log("AI response:", text);

    try {
      const parsed = JSON.parse(text);
      
      // Add AI response to conversation history
      updateConversationState(userId, parsed.message, 'assistant');

      // Handle different response types
      if (parsed.type === "chat") {
        // For casual conversation, just return the message
        return {
          success: true,
          message: parsed.message
        };
      } else if (parsed.type === "complete") {
        // Check if we have all required information
        const missingFields = [];
        if (!parsed.data.title) missingFields.push("title");
        if (!parsed.data.date) missingFields.push("date");
        if (!parsed.data.time) missingFields.push("time");

        // If any required field is missing, treat it as an incomplete reminder
        if (missingFields.length > 0) {
          // Update state with what we have
          updateReminderData(userId, {
            title: parsed.data.title || undefined,
            date: parsed.data.date ? new Date(parsed.data.date) : undefined,
            time: parsed.data.time || undefined
          });

          // Ask for the first missing field
          let message = "";
          if (missingFields.includes("time")) {
            message = `What time would you like to be reminded${parsed.data.title ? ` about ${parsed.data.title}` : ""}${parsed.data.date ? ` on ${parsed.data.date}` : ""}?`;
          } else if (missingFields.includes("date")) {
            message = `When would you like to be reminded${parsed.data.title ? ` about ${parsed.data.title}` : ""}?`;
          } else {
            message = "What would you like to be reminded about?";
          }

          return {
            success: true,
            message: message
          };
        }

        // Create the reminder only if we have all required fields
        const reminder = await prisma.reminder.create({
          data: {
            title: parsed.data.title,
            description: parsed.data.notification_message || parsed.data.message,
            due_date: new Date(`${parsed.data.date}T${parsed.data.time}`),
            user_id: userId,
            status: "pending",
            recurrence_type: "none",
            recurrence_days: [],
            recurrence_time: parsed.data.time
          },
        });

        // Clear conversation state
        clearConversationState(userId);

        return {
          success: true,
          message: parsed.data.confirmation_message || parsed.data.message
        };
      }

      // For incomplete reminders, update state and continue conversation
      if (parsed.data) {
        updateReminderData(userId, {
          title: parsed.data.title || undefined,
          date: parsed.data.date ? new Date(parsed.data.date) : undefined,
          time: parsed.data.time || undefined
        });
      }

      return {
        success: true,
        message: parsed.message
      };

    } catch (error) {
      console.error("Error parsing AI response:", error);
      return {
        success: false,
        message: "I'm having trouble understanding that. Could you please rephrase your request?",
        error: "Failed to parse AI response"
      };
    }
  } catch (error) {
    console.error("Error in reminder parser:", error);
    return {
      success: false,
      message: "Sorry, I encountered an error. Please try again.",
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
