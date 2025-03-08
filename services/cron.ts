import cron from 'node-cron';
import { prisma } from '../lib/db';
import twilio from 'twilio';
import { Reminder } from '@prisma/client';
import { 
  formatUTCDate,
  isTimeMatching,
  getUserTimezone
} from '../lib/utils/date-converter';
import { formatDateForDisplay } from '../lib/utils/date-calculator';

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// We've moved this function to time-utils.ts

// We've moved this function to time-utils.ts

/**
 * Check if a reminder is due based on current UTC time
 * @param reminder The reminder to check
 * @param currentUTCTime The current time in UTC
 * @returns True if the reminder is due, false otherwise
 */
async function isReminderDue(reminder: Reminder, currentUTCTime: Date): Promise<boolean> {
  try {
    // For one-time reminders
    if (reminder.recurrence_type === 'none' || !reminder.recurrence_type) {
      // Get the reminder date in UTC (it's already stored in UTC)
      const reminderDate = new Date(reminder.due_date);
      
      // Check if the reminder has a recurrence_time set (used for time-specific reminders)
      if (reminder.recurrence_time) {
        // Check if the reminder date is today in UTC
        const isToday = (
          reminderDate.getUTCDate() === currentUTCTime.getUTCDate() &&
          reminderDate.getUTCMonth() === currentUTCTime.getUTCMonth() &&
          reminderDate.getUTCFullYear() === currentUTCTime.getUTCFullYear()
        );
        
        // Check if current time matches the recurrence_time (within 1 minute)
        // recurrence_time is stored in UTC
        const timeMatches = isTimeMatching(reminder.recurrence_time, currentUTCTime);
        
        // For time-specific reminders, we check that it's both today AND the time matches
        if (isToday && timeMatches) {
          return true;
        }
        
        // If it has a specific time but the time doesn't match yet, don't trigger it
        if (isToday && !timeMatches) {
          return false;
        }
      }
      
      // Standard due_date check - simple UTC comparison
      return reminderDate <= currentUTCTime && reminder.status === 'pending';
    }
    
    // For daily reminders
    if (reminder.recurrence_type === 'daily') {
      // Check if the reminder has a recurrence_time
      if (reminder.recurrence_time) {
        // Check if current time matches the recurrence_time (within 1 minute)
        return isTimeMatching(reminder.recurrence_time, currentUTCTime);
      }
    }
    
    // For weekly reminders
    if (reminder.recurrence_type === 'weekly') {
      // Get the current day of week in UTC
      const currentDay = currentUTCTime.getUTCDay();
      
      // Check if today is one of the recurrence days
      if (reminder.recurrence_days && reminder.recurrence_days.includes(currentDay) && reminder.recurrence_time) {
        // Check if current time matches the recurrence_time (within 1 minute)
        return isTimeMatching(reminder.recurrence_time, currentUTCTime);
      }
    }
    
    // For monthly reminders
    if (reminder.recurrence_type === 'monthly') {
      // Check if today is the same day of the month as the reminder's due date
      const reminderDate = new Date(reminder.due_date);
      
      const isSameDayOfMonth = reminderDate.getUTCDate() === currentUTCTime.getUTCDate();
      
      if (isSameDayOfMonth && reminder.recurrence_time) {
        // Check if current time matches the recurrence_time (within 1 minute)
        return isTimeMatching(reminder.recurrence_time, currentUTCTime);
      }
    }
    
    // For yearly reminders
    if (reminder.recurrence_type === 'yearly') {
      // Check if today is the same day and month as the reminder's due date
      const reminderDate = new Date(reminder.due_date);
      
      const isSameDayAndMonth = (
        reminderDate.getUTCDate() === currentUTCTime.getUTCDate() &&
        reminderDate.getUTCMonth() === currentUTCTime.getUTCMonth()
      );
      
      if (isSameDayAndMonth && reminder.recurrence_time) {
        // Check if current time matches the recurrence_time (within 1 minute)
        return isTimeMatching(reminder.recurrence_time, currentUTCTime);
      }
    }
    
    return false;
  } catch (error) {
    console.error(`Error checking if reminder ${reminder.id} is due:`, error);
    return false;
  }
}

/**
 * Process due reminders for all users
 * @returns Object with success status and number of processed reminders
 */
export async function processDueReminders(): Promise<{ success: boolean; processed: number }> {
  try {
    // Get current time in UTC
    const now = new Date();
    const lastThreeMinutes = new Date(now.getTime() - 3 * 60 * 1000);
    console.log(`\n=== Starting reminder check at: ${formatDateForDisplay(now, 'Asia/Kolkata')} ===`);
    console.log(`Current time (UTC): ${formatDateForDisplay(now, 'UTC')}\n`);
    
    // Time window for recurring reminders (in minutes)
    const timeWindow = 5;
    
    // Format the current time as HH:MM for comparison
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    
    // Calculate the time window boundaries
    const lowerMinute = (currentMinute - timeWindow + 60) % 60;
    const lowerHour = lowerMinute > currentMinute ? (currentHour - 1 + 24) % 24 : currentHour;
    const upperMinute = (currentMinute + timeWindow) % 60;
    const upperHour = upperMinute < currentMinute ? (currentHour + 1) % 24 : currentHour;
    
    // Create time strings for comparison
    const lowerTime = `${lowerHour.toString().padStart(2, '0')}:${lowerMinute.toString().padStart(2, '0')}`;
    const upperTime = `${upperHour.toString().padStart(2, '0')}:${upperMinute.toString().padStart(2, '0')}`;
    
    console.log(`Time window for recurring reminders: ${lowerTime} to ${upperTime}`);

    // Get potentially due reminders using database filtering
    // For one-time reminders: Get those where due_date <= now
    // For recurring reminders: Get all active recurring reminders
    const potentiallyDueReminders = await prisma.reminder.findMany({
      where: {
        OR: [
          // One-time reminders that are due (null recurrence_type)
          {
            AND: [
              { recurrence_type: null },
              { due_date: { lte: now, gte: lastThreeMinutes } },
              { status: { in: ['active', 'pending'] } }
            ]
          },
          // One-time reminders that are due ('none' recurrence_type)
          {
            AND: [
              { recurrence_type: 'none' },
              { due_date: { lte: now, gte: lastThreeMinutes } },
              { status: { in: ['active', 'pending'] } }
            ]
          },
          // Recurring reminders with time in the current window
          {
            AND: [
              { recurrence_type: { in: ['daily', 'weekly', 'monthly', 'yearly'] } },
              { status: 'active' },
              {
                OR: [
                  // If lower time < upper time (normal case)
                  lowerTime <= upperTime
                    ? {
                        AND: [
                          { recurrence_time: { gte: lowerTime } },
                          { recurrence_time: { lte: upperTime } }
                        ]
                      }
                    // If lower time > upper time (crossing midnight)
                    : {
                        OR: [
                          { recurrence_time: { gte: lowerTime } },
                          { recurrence_time: { lte: upperTime } }
                        ]
                      }
                ]
              },
              // For weekly reminders, also check the day of week
              {
                OR: [
                  { recurrence_type: { not: 'weekly' } },
                  { recurrence_days: { has: now.getUTCDay() } }
                ]
              }
            ]
          }
        ]
      }
    });
    
    // Log the number of potentially due reminders found by the database query
    console.log(`Found ${potentiallyDueReminders.length} potentially due reminders to check`);
    
    // Track how many reminders are actually due
    let dueReminderCount = 0;
    
    // Process reminders directly
    for (const reminder of potentiallyDueReminders) {
      // Get user's timezone preference (only for display purposes)
      const userTimezone = await getUserTimezone(reminder.user_id);
      
      console.log(`\nChecking reminder: ${reminder.id}`);
      console.log(`- Title: ${reminder.title}`);
      console.log(`- Due date (UTC): ${reminder.due_date.toISOString()}`);
      console.log(`- Formatted due date (User TZ): ${formatUTCDate(reminder.due_date, userTimezone)}`);
      console.log(`- Recurrence type: ${reminder.recurrence_type || 'none'}`);
      console.log(`- Recurrence time (UTC): ${reminder.recurrence_time || 'N/A'}`);
      console.log(`- Recurrence days: ${reminder.recurrence_days ? JSON.stringify(reminder.recurrence_days) : 'N/A'}`);
      console.log(`- User timezone: ${userTimezone}`);
      
      // Check if the reminder is due based on UTC time
      const isDue = await isReminderDue(reminder, now);
      
      console.log(`- Is due: ${isDue}`);
      
      // Only process reminders that are actually due
      if (isDue) {
        dueReminderCount++;
        
        try {
          // We already have the user's timezone from above, but we'll keep the code structure
          // for consistency and in case we need to refresh it
          
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
          
          // Format the reminder date in user's timezone using our date converter utility
          const reminderDate = new Date(reminder.due_date);
          const formattedDate = formatUTCDate(reminderDate, userTimezone, 'MMMM d, yyyy h:mm a');
          
          // Create a structured reminder message with bell emoji using the format from the database
          const message = `🔔 Reminder: ${reminder.title}\n\n${reminder.description || 'No description provided'}`;
          
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
    }

    console.log(`Processed ${dueReminderCount} reminders`);
    return { success: true, processed: dueReminderCount };
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
  
  // Schedule the job to run every minute
  cron.schedule('* * * * *', async () => {
    try {
      console.log("Running scheduled reminder check...");
      await processDueReminders();
    } catch (error) {
      console.error("Error in cron job:", error);
    }
  });
  
  console.log("Cron jobs started successfully");
}
