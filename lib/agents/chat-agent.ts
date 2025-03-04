import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { Agent, AgentResponse } from "./agent-interface";
import { getConversationState, updateConversationState } from "../conversation-state";
import { getUserTimezone } from "../timezone-utils";

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

const CHAT_PROMPT = `You are MindlyQ, a friendly and helpful reminder assistant. Your primary purpose is to help users manage their reminders, but you can also engage in casual conversation.

Current time: {current_time}

Recent conversation history:
{conversation_history}

IMPORTANT RULES:
1. Keep responses concise and friendly
2. If the user seems to be trying to set, modify, or delete a reminder, suggest they use more explicit language
3. Remind users of your reminder capabilities if the conversation allows for it
4. Be helpful and conversational, but don't be too verbose
5. Avoid using markdown formatting in your responses
6. Keep responses under 1000 characters when possible
7. Don't use emojis excessively

Example capabilities to mention:
- Setting reminders with natural language
- Creating recurring reminders
- Listing active reminders
- Modifying existing reminders
- Deleting reminders

Your response should be direct text that will be sent to the user via WhatsApp.
`;

/**
 * Agent responsible for general chat
 */
export class ChatAgent implements Agent {
  /**
   * Process a user message for general chat
   * @param message The user's message
   * @param userId The user's ID
   * @returns A response with the chat message
   */
  async process(message: string, userId: string): Promise<AgentResponse> {
    // Get the user's timezone preference
    const userTimezone = await getUserTimezone(userId);
    try {
      // Get conversation state
      const conversationState = await getConversationState(userId);
      const conversationHistory = conversationState?.history || [];
      
      // Format conversation history for the prompt
      const formattedHistory = conversationHistory
        .slice(-5) // Only use the last 5 messages for context
        .map(item => `${item.role === 'user' ? 'User' : 'Assistant'}: ${item.content}`)
        .join('\n');
      
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
      const prompt = CHAT_PROMPT
        .replace("{current_time}", formattedTime)
        .replace("{conversation_history}", formattedHistory || "No previous conversation");
      
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
      
      // Update conversation history
      await updateConversationState(userId, {
        role: 'user',
        content: message
      });
      
      await updateConversationState(userId, {
        role: 'assistant',
        content: responseText
      });
      
      return {
        success: true,
        message: responseText
      };
    } catch (error) {
      console.error("Error in chat:", error);
      
      return {
        success: false,
        message: "I'm having trouble processing your message right now. Could you try again?"
      };
    }
  }
}
