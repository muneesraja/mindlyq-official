import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { Agent, AgentResponse } from "./agent-interface";
import { getConversationState, clearConversationState } from "../conversation-state";
import { prisma } from "../db";
import { getUserTimezone } from "../utils/date-converter";
import { formatUTCDate } from "../utils/date-converter";

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

const REMINDER_DELETION_PROMPT = `You are MindlyQ, a helpful reminder assistant. Your job is to help users delete their existing reminders.

Current time: {current_time}

Recent conversation history:
{conversation_history}

User's existing reminders:
{existing_reminders}

IMPORTANT: Your response must be PURE JSON without any markdown formatting, code blocks, or extra text. DO NOT use \`\`\`json or \`\`\` in your response.

For reminder deletion:
{
  "type": "delete",
  "data": {
    "reminder_id": 123, // ID of the reminder to delete
    "confirmation_message": "I've deleted your reminder about the meeting with John."
  }
}

For failed deletion (reminder not found):
{
  "type": "not_found",
  "message": "I couldn't find a reminder matching that description. Please try again with a different description."
}

For ambiguous deletion (multiple matches):
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
1. Identify which reminder to delete based on:
   - Exact title match if provided
   - Partial title match
   - Time/date references
   - Context from previous messages
2. If multiple reminders match the criteria, return them all so the user can clarify
3. If no reminders match, provide a helpful error message
`;

interface ReminderDeletionResponse {
  type: 'delete' | 'not_found' | 'ambiguous';
  message?: string;
  data?: {
    reminder_id?: number;
    confirmation_message?: string;
    matches?: Array<{
      id: number;
      title: string;
      due_date: string;
    }>;
  };
}

/**
 * Agent responsible for deleting reminders
 */
export class ReminderDeletionAgent implements Agent {
  /**
   * Process a user message to delete a reminder
   * @param message The user's message
   * @param userId The user's ID
   * @returns A response with the deletion result or an error
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
          message: "You don't have any active reminders to delete."
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
      
      // Format reminders for the prompt
      const formattedReminders = reminders.map(reminder => {
        const date = new Date(reminder.due_date);
        return {
          id: reminder.id,
          title: reminder.title,
          due_date: date.toISOString(),
          recurrence_type: reminder.recurrence_type
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
      const prompt = REMINDER_DELETION_PROMPT
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
        
        console.log("Reminder deletion response:", cleanedText);
        
        const parsed = JSON.parse(cleanedText) as ReminderDeletionResponse;
        
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
        } else if (parsed.type === 'delete') {
          // We have the reminder to delete
          if (!parsed.data?.reminder_id) {
            return {
              success: false,
              message: "Missing reminder ID in deletion response."
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
              message: "The reminder you want to delete no longer exists."
            };
          }
          
          // Delete the reminder (soft delete by changing status)
          const deletedReminder = await prisma.reminder.update({
            where: {
              id: reminder.id
            },
            data: {
              status: "deleted"
            }
          });
          
          // Clear conversation state
          await clearConversationState(userId);
          
          return {
            success: true,
            message: parsed.data.confirmation_message || `I've deleted your reminder "${reminder.title}".`,
            data: deletedReminder
          };
        }
        
        return {
          success: false,
          message: "Invalid response type from reminder deletion."
        };
      } catch (parseError) {
        console.error("Error parsing AI response:", parseError);
        console.error("Raw response:", responseText);
        
        return {
          success: false,
          message: "Failed to parse reminder deletion response."
        };
      }
    } catch (error) {
      console.error("Error in reminder deletion:", error);
      
      return {
        success: false,
        message: "An error occurred during reminder deletion."
      };
    }
  }
}
