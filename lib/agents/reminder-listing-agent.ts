import { Agent, AgentResponse } from "./agent-interface";
import { prisma } from "../db";
import { formatDateForHumans, formatRecurrenceForHumans } from "../ai-date-parser";
import { getUserTimezone } from "../utils/date-converter";
import { fromUTC, formatUTCDate } from "../utils/date-converter";

/**
 * Agent responsible for listing reminders
 */
export class ReminderListingAgent implements Agent {
  /**
   * Process a user message to list reminders
   * @param message The user's message
   * @param userId The user's ID
   * @returns A response with the list of reminders
   */
  async process(message: string, userId: string): Promise<AgentResponse> {
    // Get the user's timezone preference
    const userTimezone = await getUserTimezone(userId);
    try {
      // Determine filter type from message
      let filter = "active"; // Default to active reminders
      
      if (message.toLowerCase().includes("all")) {
        filter = "all";
      } else if (message.toLowerCase().includes("pending")) {
        filter = "pending";
      }
      
      // Extract any search terms
      const searchTerms = this.extractSearchTerms(message);
      
      // Get reminders based on filter
      let reminders;
      
      if (filter === "all") {
        reminders = await prisma.reminder.findMany({
          where: {
            user_id: userId,
            ...(searchTerms ? { title: { contains: searchTerms, mode: 'insensitive' } } : {})
          },
          orderBy: {
            due_date: 'asc'
          }
        });
      } else if (filter === "active") {
        // Get current date in the user's timezone
        const now = new Date();
        
        reminders = await prisma.reminder.findMany({
          where: {
            user_id: userId,
            status: "active",
            OR: [
              // Future reminders
              { due_date: { gt: now } },
              // Recurring reminders
              { recurrence_type: { not: "none" } }
            ],
            ...(searchTerms ? { title: { contains: searchTerms, mode: 'insensitive' } } : {})
          },
          orderBy: {
            due_date: 'asc'
          }
        });
      } else if (filter === "pending") {
        reminders = await prisma.reminder.findMany({
          where: {
            user_id: userId,
            status: "pending",
            ...(searchTerms ? { title: { contains: searchTerms, mode: 'insensitive' } } : {})
          },
          orderBy: {
            due_date: 'asc'
          }
        });
      } else {
        // Search by term
        reminders = await prisma.reminder.findMany({
          where: {
            user_id: userId,
            title: { contains: filter, mode: 'insensitive' }
          },
          orderBy: {
            due_date: 'asc'
          }
        });
      }
      
      // Format reminders for display
      if (reminders.length === 0) {
        return {
          success: true,
          message: "You don't have any reminders at the moment."
        };
      }
      
      // Limit to 10 reminders to avoid message length limits
      const maxReminders = 10;
      const totalReminders = reminders.length;
      const displayReminders = reminders.slice(0, maxReminders);
      
      let responseMessage = `Here are your reminders (${displayReminders.length}${totalReminders > maxReminders ? " of " + totalReminders : ""}):\n`;
      
      const formattedReminders = displayReminders.map((reminder, index) => {
        const date = new Date(reminder.due_date);
        
        // Format date using our date-converter utility
        // Determine if we need to include the year
        const currentYear = new Date().getFullYear();
        const reminderYear = date.getFullYear();
        const formatString = reminderYear !== currentYear ? 
          'MMM d, yyyy h:mm aa' : 
          'MMM d h:mm aa';
        
        const dueDate = formatUTCDate(date, userTimezone, formatString);
        
        // Shorter recurrence description
        let recurrenceInfo = "";
        if (reminder.recurrence_type && reminder.recurrence_type !== "none") {
          recurrenceInfo = " (recurring)";
        }
        
        return `${index + 1}. "${reminder.title}" - ${dueDate}${recurrenceInfo}`;
      });

      responseMessage += formattedReminders.join("\n");
      
      if (totalReminders > maxReminders) {
        responseMessage += `\n\n...and ${totalReminders - maxReminders} more reminder(s).`;
      }
      
      responseMessage += "\n\nTip: Modify by saying 'Change my [title] reminder to [time]'";

      return {
        success: true,
        message: responseMessage,
        data: reminders
      };
    } catch (error) {
      console.error("Error in reminder listing:", error);
      
      return {
        success: false,
        message: "An error occurred while retrieving your reminders."
      };
    }
  }
  
  /**
   * Extract search terms from a message
   * @param message The user message
   * @returns The extracted search term or null
   */
  private extractSearchTerms(message: string): string | null {
    // Common patterns for search terms
    const patterns = [
      /show me my (.+?) reminders/i,
      /list my (.+?) reminders/i,
      /reminders about (.+)/i,
      /reminders for (.+)/i,
      /reminders related to (.+)/i
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return null;
  }
}
