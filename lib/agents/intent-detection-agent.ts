import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { Agent, AgentResponse, IntentType, IntentDetectionResult } from "./agent-interface";
import { getConversationState } from "../conversation-state";
import { getUserTimezone } from "../utils/date-converter";
import { formatUTCDate } from "../utils/date-converter";

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

const INTENT_DETECTION_PROMPT = `You are an intent detection system for a reminder application called MindlyQ.
Your job is to analyze user messages and determine what they want to do.

Current time: {current_time}
Timezone: {timezone}

Recent conversation history:
{conversation_history}

TASK:
Analyze the user's message and determine their intent. Return ONLY a JSON object with the detected intent.

IMPORTANT RULES:
1. Your response must be PURE JSON without any markdown formatting, code blocks, or extra text.
2. DO NOT use \`\`\`json or \`\`\` in your response.
3. Only return the JSON object, nothing else.

Possible intents:
- "chat": General conversation, greetings, or small talk
- "set_reminder": User wants to create a new reminder
- "modify_reminder": User wants to change an existing reminder (time, title, or description)
- "delete_reminder": User wants to remove an existing reminder
- "list_reminders": User wants to see their reminders
- "set_timezone": User is mentioning their location or timezone (e.g., "I'm from India", "My timezone is EST", "I live in New York")

For "modify_reminder" intent, look for phrases like:
- "change my reminder"
- "update my reminder"
- "modify my reminder"
- "reschedule my reminder"
- "move my reminder"
- "change the time of my reminder"
- "change the title of my reminder"
- "change the description of my reminder"
- "update the title"
- "update the description"
- "rename my reminder"

Response format:
{
  "intent": "one of the intent types listed above",
  "confidence": 0.0 to 1.0,
  "entities": {
    // Optional extracted entities relevant to the intent
    // For example: title, date, time, etc.
  }
}

Examples:
1. "Remind me to call mom tomorrow at 5pm"
   {
     "intent": "set_reminder",
     "confidence": 0.95,
     "entities": {
       "title": "call mom",
       "time_expression": "tomorrow at 5pm"
     }
   }

2. "What reminders do I have?"
   {
     "intent": "list_reminders",
     "confidence": 0.9,
     "entities": {
       "filter": "all"
     }
   }

3. "Change my dentist appointment to Friday"
   {
     "intent": "modify_reminder",
     "confidence": 0.85,
     "entities": {
       "title": "dentist appointment",
       "new_time_expression": "Friday"
     }
   }

4. "Hello, how are you?"
   {
     "intent": "chat",
     "confidence": 0.95
   }

5. "Delete my reminder about the meeting"
   {
     "intent": "delete_reminder",
     "confidence": 0.9,
     "entities": {
       "title": "meeting"
     }
   }`;

/**
 * Agent responsible for detecting user intent using Gemini Flash
 */
export class IntentDetectionAgent implements Agent {
  /**
   * Process a user message to detect intent
   * @param message The user's message
   * @param userId The user's ID
   * @returns A response with the detected intent
   */
  async process(message: string, userId: string): Promise<AgentResponse> {
    // Get the user's timezone preference
    const userTimezone = await getUserTimezone(userId);
    try {
      // Get conversation history
      const conversationState = await getConversationState(userId);
      const conversationHistory = conversationState?.history || [];
      
      // Format conversation history for the prompt
      const formattedHistory = conversationHistory
        .slice(-5) // Only use the last 5 messages for context
        .map(item => `${item.role === 'user' ? 'User' : 'Assistant'}: ${item.content}`)
        .join('\n');
      
      // Get the current time
      const currentTime = new Date();
      
      // Format the current time for the prompt using our date-converter utility
      const formattedTime = formatUTCDate(
        currentTime,
        userTimezone,
        'MM/dd/yyyy hh:mm a zzz'
      );
      
      // Create the prompt
      const prompt = INTENT_DETECTION_PROMPT
        .replace("{current_time}", formattedTime)
        .replace("{timezone}", userTimezone)
        .replace("{conversation_history}", formattedHistory || "No previous conversation");
      
      // Generate AI response using Gemini Flash for fast intent detection
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
        
        console.log("Intent detection response:", cleanedText);
        
        const parsed = JSON.parse(cleanedText) as IntentDetectionResult;
        
        return {
          success: true,
          message: "Intent detected successfully",
          data: parsed
        };
      } catch (parseError) {
        console.error("Error parsing AI response:", parseError);
        console.error("Raw response:", responseText);
        
        return {
          success: false,
          message: "Failed to parse intent detection response"
        };
      }
    } catch (error) {
      console.error("Error in intent detection:", error);
      
      return {
        success: false,
        message: "An error occurred during intent detection"
      };
    }
  }
}
