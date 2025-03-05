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
        console.log("Listing active reminders for user:", userId);
        
        // Get current date in UTC
        const nowUTC = new Date();
        
        // Convert to user's timezone for proper comparison
        const userTimezoneNow = fromUTC(nowUTC, userTimezone);
        console.log("Current time in user timezone:", userTimezoneNow.toISOString());
        
        // Fetch all active reminders regardless of due date
        const allReminders = await prisma.reminder.findMany({
          where: {
            user_id: userId,
            status: "active", // Only get active reminders
            ...(searchTerms ? { title: { contains: searchTerms, mode: 'insensitive' } } : {})
          },
          orderBy: {
            due_date: 'asc'
          }
        });
        
        console.log(`Found ${allReminders.length} active reminders in database`);
        
        // Include all active reminders - don't filter by date
        // This ensures future reminders are shown
        reminders = allReminders;
        
        // Log details of each reminder for debugging
        allReminders.forEach((reminder, index) => {
          const reminderDate = new Date(reminder.due_date);
          const reminderLocalDate = fromUTC(reminderDate, userTimezone);
          console.log(`Reminder ${index + 1}: "${reminder.title}" - Due: ${reminderLocalDate.toISOString()} - Status: ${reminder.status} - Recurrence: ${reminder.recurrence_type || 'none'}`);
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
        
        // Debug logs to track timezone conversion
        console.log(`Reminder ${index + 1} - ${reminder.title}:`);
        console.log(`- Original UTC date from DB: ${date.toISOString()}`);
        console.log(`- User timezone: ${userTimezone}`);
        
        // Check if reminder has recurrence_time (which is in local time format HH:MM)
        if (reminder.recurrence_time) {
          console.log(`- Has recurrence_time: ${reminder.recurrence_time}`);
        }
        
        // Format date using our date-converter utility
        // Determine if we need to include the year
        const currentYear = new Date().getFullYear();
        const reminderYear = date.getFullYear();
        const formatString = reminderYear !== currentYear ? 
          'MMM d, yyyy h:mm aa' : 
          'MMM d h:mm aa';
        
        // Use recurrence_time if available for display (since it's already in user's local time format)
        let dueDate;
        if (reminder.recurrence_time) {
          // Extract just the date part from the formatted date
          const datePart = formatUTCDate(date, userTimezone, 'MMM d');
          // Use the recurrence_time which is already in local time
          const [hours, minutes] = reminder.recurrence_time.split(':').map(Number);
          const period = hours >= 12 ? 'PM' : 'AM';
          const hour12 = hours % 12 || 12;
          dueDate = `${datePart} ${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
          console.log(`- Using recurrence_time for display: ${dueDate}`);
        } else {
          // Use standard UTC to local conversion
          dueDate = formatUTCDate(date, userTimezone, formatString);
          console.log(`- Formatted date using formatUTCDate: ${dueDate}`);
        }
        
        // Determine status emoji
        let statusEmoji = "";
        if (reminder.recurrence_type && reminder.recurrence_type !== "none") {
          statusEmoji = "🔄 "; // Recurring
        } else {
          const nowUTC = new Date();
          const userTimezoneNow = fromUTC(nowUTC, userTimezone);
          const reminderLocalDate = fromUTC(date, userTimezone);
          
          // Check if the reminder is due today
          const isToday = (
            reminderLocalDate.getDate() === userTimezoneNow.getDate() &&
            reminderLocalDate.getMonth() === userTimezoneNow.getMonth() &&
            reminderLocalDate.getFullYear() === userTimezoneNow.getFullYear()
          );
          
          if (isToday) {
            statusEmoji = "⏰ "; // Due today
          } else {
            statusEmoji = "📅 "; // Future date
          }
        }
        
        // Format description if available
        const description = reminder.description ? `\n   ${reminder.description}` : "";
        
        return `${index + 1}. ${statusEmoji}"${reminder.title}" - ${dueDate}${description}`;
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
