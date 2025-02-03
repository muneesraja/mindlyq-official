import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/db";

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

const SYSTEM_PROMPT = `You are a helpful AI assistant that helps users set reminders. Your task is to:
1. Parse natural language input for reminder details
2. Extract time, date, and recurrence information
3. Format the response in a specific JSON structure
4. Handle both one-time and recurring reminders
5. Be conversational for general messages

IMPORTANT FORMATTING RULES:
1. All times should be calculated relative to the provided current time
2. Response MUST be valid JSON only, no additional text
3. Escape all special characters in strings
4. Use double quotes for JSON properties
5. Format dates in ISO string format with timezone

If the input is a reminder request, respond with ONLY this JSON structure:
{
  "type": "reminder",
  "title": "Brief title of the reminder",
  "description": "First part: Creative message\\nSecond part: Your reminder description: [Original Message]",
  "dueDate": "ISO date string",
  "recurrence": {
    "type": "none",
    "days": [],
    "time": "HH:mm"
  },
  "aiMessage": "Confirmation message"
}

For recurring reminders:
1. Set type as one of: "none", "daily", "weekly", "monthly"
2. For weekly reminders:
   - Set days as array of numbers (0-6, where 0=Sunday)
   - Example: Monday meetings would have days: [1]
3. Always set time in "HH:mm" format for recurring reminders
4. Set the first occurrence in dueDate

Examples:
1. "Set weekly reminder for team meeting every Monday at 10am"
   {
     "type": "reminder",
     "title": "Team Meeting",
     "description": "Time to sync with the team! 👥\\nYour reminder description: Weekly team meeting",
     "dueDate": "[next Monday at 10am in ISO format]",
     "recurrence": {
       "type": "weekly",
       "days": [1],
       "time": "10:00"
     },
     "aiMessage": "I've set up your weekly team meeting reminder for Mondays at 10 AM"
   }

2. "Remind me to take medicine daily at 9am and 9pm"
   {
     "type": "reminder",
     "title": "Take Medicine",
     "description": "Health reminder! 💊\\nYour reminder description: Take daily medicine",
     "dueDate": "[next occurrence in ISO format]",
     "recurrence": {
       "type": "daily",
       "days": [],
       "time": "09:00"
     },
     "aiMessage": "I've set your daily medicine reminder for 9 AM"
   }

For general chat, respond with ONLY:
{
  "type": "chat",
  "message": "friendly response"
}

Current timezone: Asia/Kolkata`;

export interface ReminderResponse {
  success: boolean;
  message: string;
  reminder?: any;
  error?: string;
}

export async function parseAndCreateReminder(message: string, userId: string): Promise<ReminderResponse> {
  try {
    // Get current time in ISO format with timezone
    const currentTime = new Date().toISOString();

    // Get Gemini model with safety settings
    const model = genAI.getGenerativeModel({ 
      model: "gemini-pro",
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_NONE",
        },
      ],
    });

    // Generate response with current time context
    const result = await model.generateContent([
      { text: SYSTEM_PROMPT },
      { text: `Current time is: ${currentTime}\n\nUser message: ${message}` },
    ]);

    // Check if response was blocked
    if (result.response.promptFeedback?.blockReason) {
      console.error("Response blocked:", result.response.promptFeedback);
      return {
        success: false,
        message: "I can only help with setting reminders and scheduling tasks. Please rephrase your request to focus on the reminder you'd like to set.",
        error: "Response blocked by safety filters"
      };
    }

    const response = await result.response;
    const text = response.text();

    console.log("Raw AI response:", text);

    try {
      // Clean up the response text to ensure valid JSON
      const cleanedText = text
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove control characters
        .replace(/\n/g, "\\n") // Properly escape newlines
        .replace(/\r/g, "\\r") // Properly escape carriage returns
        .trim();

      console.log("Cleaned response:", cleanedText);

      let parsedResponse;
      try {
        parsedResponse = JSON.parse(cleanedText);
      } catch (parseError) {
        console.error("First parse attempt failed:", parseError);
        // Try to extract JSON from the response if it's wrapped in other text
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[0]);
        } else {
          throw parseError;
        }
      }

      if (parsedResponse.type === "reminder") {
        console.log("Current time:", currentTime);
        console.log("Parsed due date:", parsedResponse.dueDate);
        
        // Validate the parsed response
        if (!parsedResponse.title || !parsedResponse.dueDate) {
          throw new Error("Missing required fields in reminder");
        }

        // Ensure description is a string
        const description = typeof parsedResponse.description === 'string' 
          ? parsedResponse.description 
          : 'Your reminder is due!';

        // Create reminder in database
        const reminder = await prisma.reminder.create({
          data: {
            title: parsedResponse.title,
            description: description,
            due_date: new Date(parsedResponse.dueDate),
            user_id: userId,
            recurrence_type: parsedResponse.recurrence?.type || "none",
            recurrence_days: parsedResponse.recurrence?.days || [],
            recurrence_time: parsedResponse.recurrence?.time || null,
            // Set initial status based on recurrence type
            status: parsedResponse.recurrence?.type === "none" ? "pending" : "active"
          },
        });

        console.log("Created reminder with due date:", reminder.due_date);

        return {
          success: true,
          message: parsedResponse.aiMessage || "Reminder set successfully!",
          reminder: {
            ...reminder,
            formattedMessage: reminder.description
          }
        };
      }

      // For general chat
      return {
        success: true,
        message: parsedResponse.message || "I understand, but I'm not sure how to help with that.",
      };
    } catch (error) {
      console.error("Error parsing AI response:", error);
      console.error("Problematic response:", text);
      return {
        success: false,
        error: "Failed to understand the reminder request. Please try rephrasing it.",
        message: "Failed to understand the reminder request. Please try rephrasing it."
      };
    }
  } catch (error) {
    console.error("Error in reminder parser:", error);
    return {
      success: false,
      error: "Failed to process the reminder",
      message: "Sorry, I encountered an error while processing your request. Please try again."
    };
  }
}
