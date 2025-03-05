import cron from 'node-cron';
import { prisma } from '../lib/db';
import twilio from 'twilio';
import { Reminder } from '@prisma/client';
import { 
  getUserTimezone,
  getCurrentTimeInTimezone,
  formatDateInTimezone,
  formatDateForUser,
  isTimeMatching
} from '../lib/time-utils';

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// We've moved this function to time-utils.ts

// We've moved this function to time-utils.ts

/**
 * Check if a reminder is due based on user's local time
 * @param reminder The reminder to check
 * @param userLocalTime The current time in user's timezone
 * @param userTimezone The user's timezone
 * @returns True if the reminder is due, false otherwise
 */
async function isReminderDue(reminder: Reminder, userLocalTime: Date, userTimezone: string): Promise<boolean> {
  // For one-time reminders
  if (reminder.recurrence_type === 'none' || !reminder.recurrence_type) {
    const reminderDate = new Date(reminder.due_date);
    
    // Check if the reminder has a recurrence_time set (used for immediate reminders)
    if (reminder.recurrence_time) {
      // Check if current time matches the recurrence_time (within 1 minute)
      const timeMatches = isTimeMatching(reminder.recurrence_time, userLocalTime);
      
      // For immediate reminders, we check both the due_date and the recurrence_time
      if (timeMatches) {
        console.log(`Immediate reminder detected: ${reminder.id} with time ${reminder.recurrence_time}`);
        return true;
      }
    }
    
    // Standard due_date check
    return reminderDate <= userLocalTime && reminder.status === 'pending';
  }
  
  // For daily reminders
  if (reminder.recurrence_type === 'daily') {
    // Check if the reminder has a recurrence_time
    if (reminder.recurrence_time) {
      // Check if current time matches the recurrence_time (within 1 minute)
      return isTimeMatching(reminder.recurrence_time, userLocalTime);
    }
  }
  
  // For weekly reminders
  if (reminder.recurrence_type === 'weekly') {
    const currentDay = userLocalTime.getDay();
    
    // Check if today is one of the recurrence days
    if (reminder.recurrence_days.includes(currentDay) && reminder.recurrence_time) {
      // Check if current time matches the recurrence_time (within 1 minute)
      return isTimeMatching(reminder.recurrence_time, userLocalTime);
    }
  }
  
  return false;
}

/**
 * Process due reminders for all users
 * @returns Object with success status and number of processed reminders
 */
export async function processDueReminders(): Promise<{ success: boolean; processed: number }> {
  try {
    // Get current time in UTC (neutral timezone)
    const now = new Date();
    
    console.log("\n=== Starting reminder check at:", now.toISOString(), "===");

    // Get all active reminders
    const activeReminders = await prisma.reminder.findMany({
      where: {
        status: { in: ["active", "pending"] }
      }
    });
    
    // Process each reminder in its user's timezone
    const dueReminders: Reminder[] = [];
    
    console.log(`Found ${activeReminders.length} active reminders to check`);
    
    for (const reminder of activeReminders) {
      // Get user's timezone preference
      const userTimezone = await getUserTimezone(reminder.user_id);
      
      // Get current time in user's timezone
      const userLocalTime = getCurrentTimeInTimezone(userTimezone);
      
      console.log(`\nChecking reminder: ${reminder.id}`);
      console.log(`- Title: ${reminder.title}`);
      console.log(`- Due date: ${reminder.due_date.toISOString()}`);
      console.log(`- Recurrence type: ${reminder.recurrence_type || 'none'}`);
      console.log(`- Recurrence time: ${reminder.recurrence_time || 'N/A'}`);
      console.log(`- User timezone: ${userTimezone}`);
      console.log(`- Current time in user timezone: ${userLocalTime.toISOString()}`);
      
      // Check if the reminder is due based on user's local time
      const isDue = await isReminderDue(reminder, userLocalTime, userTimezone);
      
      console.log(`- Is due: ${isDue}`);
      
      if (isDue) {
        dueReminders.push(reminder);
      }
    }
    
    console.log(`Found ${dueReminders.length} due reminders`);
    
    // Process the due reminders that we've identified
    for (const reminder of dueReminders) {
      try {
        // Get user's timezone for formatting messages
        const userTimezone = await getUserTimezone(reminder.user_id);
        
        // Get user's phone number from user table
        // We're just validating that the user exists in our system
        const user = await prisma.userPreference.findUnique({
          where: { userId: reminder.user_id }
        });
        
        if (!user) {
          console.log(`Skipping reminder ${reminder.id} - user not found`);
          continue;
        }
        
        // In a real implementation, you would get the phone number from the user
        // For now, we'll use the user_id as a placeholder
        const phone = reminder.user_id;
        
        // Format the reminder date in user's timezone
        const reminderDate = new Date(reminder.due_date);
        const formattedDate = formatDateForUser(reminderDate, userTimezone);
        
        // Send SMS reminder
        const message = `MindlyQ Reminder: ${reminder.title} ${formattedDate}`;
        
        console.log(`Sending reminder to ${phone}: ${message}`);
        
        // Only send if TWILIO_PHONE_NUMBER is configured
        if (process.env.TWILIO_PHONE_NUMBER) {
          await twilioClient.messages.create({
            body: message,
            from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
            to: `whatsapp:${phone}`
          });
        } else {
          console.log('Skipping SMS send - TWILIO_PHONE_NUMBER not configured');
        }
        
        // Update one-time reminder status to 'sent'
        if (reminder.recurrence_type === 'none' || !reminder.recurrence_type) {
          await prisma.reminder.update({
            where: { id: reminder.id },
            data: { status: 'sent' }
          });
        }
        
        console.log(`Successfully processed reminder ${reminder.id}`);
      } catch (error) {
        console.error(`Error processing reminder ${reminder.id}:`, error);
      }
    }

    console.log(`Processed ${dueReminders.length} reminders`);
    return { success: true, processed: dueReminders.length };
  } catch (error) {
    console.error("Error in processDueReminders:", error);
    throw error;
  }
}

/**
 * Start the cron jobs for processing reminders
 * Runs every minute to check for due reminders
 */
export function startCronJobs(): void {
  console.log("Starting cron jobs...");
  cron.schedule('* * * * *', async () => {
    await processDueReminders();
  });
}
