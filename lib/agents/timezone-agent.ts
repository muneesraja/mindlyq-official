import { Agent, AgentResponse } from "./agent-interface";
import { setUserTimezone, detectTimezoneFromLocation } from "../utils/date-converter";
import { HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { getConversationState, updateReminderData } from "../conversation-state";
import { ReminderCreationAgent } from "./reminder-creation-agent";
import { formatUTCDate } from "../utils/date-converter";
import { genAI, getModelForTask, DEFAULT_SAFETY_SETTINGS } from "../utils/ai-config";

/**
 * Agent responsible for detecting and setting user timezone
 */
export class TimezoneAgent implements Agent {
  /**
   * Process a user message to detect and set timezone
   * @param message The user's message
   * @param userId The user's ID
   * @returns A response with the detected timezone
   */
  async process(message: string, userId: string): Promise<AgentResponse> {
    try {
      // First, extract location information from the message
      const locationInfo = await this.extractLocationInfo(message);
      
      if (!locationInfo) {
        return {
          success: false,
          message: "I couldn't determine your location from your message. Could you please tell me which country or city you're in?"
        };
      }
      
      // Detect timezone from location
      const timezone = await detectTimezoneFromLocation(locationInfo);
      
      // Save the timezone preference for the user
      await setUserTimezone(userId, timezone);
      
      // Format a friendly response
      const response = this.formatTimezoneResponse(timezone, locationInfo);
      
      // Check if there's a pending reminder request
      const conversationState = getConversationState(userId);
      const pendingTimezone = conversationState?.reminder_data?.pendingTimezone;
      const originalRequest = conversationState?.reminder_data?.originalRequest;
      
      if (pendingTimezone && originalRequest) {
        // Clear the pending timezone flag
        await updateReminderData(userId, { pendingTimezone: false });
        
        // Process the original reminder request
        const reminderAgent = new ReminderCreationAgent();
        const reminderResponse = await reminderAgent.process(originalRequest, userId);
        
        // Combine the timezone confirmation with the reminder response
        return {
          success: true,
          message: `${response} And I've set a reminder for you: ${reminderResponse.message}`,
          data: reminderResponse.data
        };
      }
      
      return {
        success: true,
        message: response,
        data: { timezone }
      };
    } catch (error) {
      console.error("Error in timezone detection:", error);
      
      return {
        success: false,
        message: "I had trouble setting your timezone. For now, I'll use the default timezone (Asia/Kolkata)."
      };
    }
  }
  
  /**
   * Extract location information from a message
   * @param message The user message
   * @returns The extracted location or null if not found
   */
  private async extractLocationInfo(message: string): Promise<string | null> {
    try {
      // Check for common timezone abbreviations directly in the message
      const commonTimezones: Record<string, string> = {
        'IST': 'India',
        'EST': 'Eastern United States',
        'CST': 'Central United States',
        'MST': 'Mountain United States',
        'PST': 'Pacific United States',
        'GMT': 'London',
        'UTC': 'Coordinated Universal Time',
        'JST': 'Japan',
        'AEST': 'Australia Eastern',
        'AEDT': 'Australia Eastern',
        'ACST': 'Australia Central',
        'ACDT': 'Australia Central',
        'AWST': 'Australia Western'
      };
      
      // Extract timezone abbreviation if present
      const timezoneRegex = /\b(IST|EST|CST|MST|PST|GMT|UTC|JST|AEST|AEDT|ACST|ACDT|AWST)\b/i;
      const match = message.match(timezoneRegex);
      
      if (match && match[1]) {
        const tzAbbr = match[1].toUpperCase();
        if (commonTimezones[tzAbbr]) {
          return commonTimezones[tzAbbr];
        }
      }
      
      // If no direct timezone abbreviation, use AI to extract location
      const model = genAI.getGenerativeModel({
        model: getModelForTask('timezone'),
        safetySettings: DEFAULT_SAFETY_SETTINGS,
      });
      
      const prompt = `
      You are a location extraction assistant. Given a message, extract ONLY the location information (country, city, region, etc.).
      
      Message: "${message}"
      
      Return ONLY the location information without any additional text. If no location is mentioned, return "NONE".
      `;
      
      const result = await model.generateContent(prompt);
      const response = result.response.text().trim();
      
      return response === "NONE" ? null : response;
    } catch (error) {
      console.error("Error extracting location:", error);
      return null;
    }
  }
  
  /**
   * Format a friendly response about the timezone
   * @param timezone The IANA timezone
   * @param location The detected location
   * @returns A friendly response
   */
  private formatTimezoneResponse(timezone: string, location: string): string {
    // Get current time in the timezone using our date-converter utility
    const now = new Date();
    const timeInZone = formatUTCDate(
      now,
      timezone,
      'h:mm a zzz'
    );
    
    // Extract the timezone abbreviation (like EST, IST, etc.)
    const tzAbbreviation = timeInZone.split(' ').pop();
    
    return `Your timezone is added as ${tzAbbreviation} (${timezone}). The current time in your timezone is ${timeInZone}. I'll use this timezone for all your reminders from now on.`;
  }
}
