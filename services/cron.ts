import cron from 'node-cron';
import { prisma } from '../lib/db';
import twilio from 'twilio';
import { Reminder } from '@prisma/client';
import { 
  formatUTCDate,
  getUserTimezone,
  timeStringToMinutes,
  minutesToTimeString
} from '../lib/utils/date-converter';
import { formatDateForDisplay } from '../lib/utils/date-calculator';

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// We've moved this function to time-utils.ts

/**
 * Check if a reminder's recurrence time matches the current time
 * @param reminderTimeMinutes The reminder's recurrence time in minutes since midnight (UTC)
 * @param currentTime The current time to check against (UTC)
 * @returns True if the times match exactly or within the same minute
 */
function isTimeMatching(reminderTimeMinutes: number, currentTime: Date): boolean {
  try {
    // Convert current time to minutes since midnight (in UTC)
    const currentTimeMinutes = currentTime.getUTCHours() * 60 + currentTime.getUTCMinutes();
    const currentSeconds = currentTime.getUTCSeconds();
    
    // Log detailed time information for debugging
    console.log(`[isTimeMatching] Comparing times:`);
    console.log(`- Reminder time: ${Math.floor(reminderTimeMinutes / 60).toString().padStart(2, '0')}:${(reminderTimeMinutes % 60).toString().padStart(2, '0')} UTC (${reminderTimeMinutes} minutes)`);
    console.log(`- Current time: ${currentTime.getUTCHours().toString().padStart(2, '0')}:${currentTime.getUTCMinutes().toString().padStart(2, '0')}:${currentTime.getUTCSeconds().toString().padStart(2, '0')} UTC (${currentTimeMinutes} minutes)`);
    console.log(`- Difference: ${reminderTimeMinutes - currentTimeMinutes} minutes`);
    
    // For exact matching, we want to trigger the reminder when:
    // 1. The minute exactly matches (no diff in minutes)
    if (reminderTimeMinutes === currentTimeMinutes) {
      console.log(`[isTimeMatching] ✅ MATCH: Exact minute match`);
      return true;
    } 
    // 2. OR we're in the last few seconds of the previous minute (to account for cron timing)
    else if (reminderTimeMinutes === currentTimeMinutes + 1 && currentSeconds >= 55) {
      console.log(`[isTimeMatching] ✅ MATCH: Last 5 seconds before the next minute`);
      return true;
    }
    // 3. OR we're within 2 minutes of the target time (to account for cron job delays)
    else if (Math.abs(reminderTimeMinutes - currentTimeMinutes) <= 2) {
      console.log(`[isTimeMatching] ✅ MATCH: Within 2-minute window`);
      return true;
    }
    
    // Handle edge case at midnight (23:59 vs 00:00)
    if (reminderTimeMinutes === 0 && currentTimeMinutes === 1439 && currentSeconds >= 55) {
      console.log(`[isTimeMatching] ✅ MATCH: Midnight transition case`);
      return true;
    }
    
    console.log(`[isTimeMatching] ❌ NO MATCH: Times don't match within tolerance`);
    return false;
  } catch (error) {
    console.error(`[isTimeMatching] Error matching time ${reminderTimeMinutes}:`, error);
    return false;
  }
}

/**
 * Check if a reminder is due based on current UTC time
 * @param reminder The reminder to check
 * @param currentUTCTime The current time in UTC
 * @returns True if the reminder is due, false otherwise
 */
async function isReminderDue(reminder: Reminder, currentUTCTime: Date): Promise<boolean> {
  try {
    // Check if the reminder has reached its end date (for recurring reminders)
    if (reminder.end_date && reminder.recurrence_type && reminder.recurrence_type !== 'none') {
      const endDate = new Date(reminder.end_date);
      // Set end date to end of day in UTC
      endDate.setUTCHours(23, 59, 59, 999);
      
      if (currentUTCTime > endDate) {
        // Reminder has passed its end date, mark it as complete
        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { status: 'completed' }
        });
        console.log(`Reminder ${reminder.id} marked as completed as it reached its end date`);
        return false;
      }
    }

    // Check if this reminder was already sent today (for recurring reminders)
    if (reminder.recurrence_type && reminder.recurrence_type !== 'none' && reminder.last_sent) {
      const lastSent = new Date(reminder.last_sent);
      
      // If the reminder was already sent today (same day in UTC), don't send it again
      if (
        lastSent.getUTCFullYear() === currentUTCTime.getUTCFullYear() &&
        lastSent.getUTCMonth() === currentUTCTime.getUTCMonth() &&
        lastSent.getUTCDate() === currentUTCTime.getUTCDate()
      ) {
        return false;
      }
    }
    
    // For one-time reminders
    if (reminder.recurrence_type === 'none' || !reminder.recurrence_type) {
      // Get the reminder date in UTC (it's already stored in UTC)
      const reminderDate = new Date(reminder.due_date);
      
      // Check if the reminder has a recurrence_time set (used for time-specific reminders)
      if (reminder.recurrence_time !== null) {
        // Check if the reminder date is today in UTC
        const isToday = (
          reminderDate.getUTCDate() === currentUTCTime.getUTCDate() &&
          reminderDate.getUTCMonth() === currentUTCTime.getUTCMonth() &&
          reminderDate.getUTCFullYear() === currentUTCTime.getUTCFullYear()
        );
        
        // Check if current time matches the recurrence_time (within 1 minute)
        // recurrence_time is stored in minutes since midnight UTC
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
      if (reminder.recurrence_time !== null) {
        // Check if current time matches the recurrence_time (within 1 minute)
        return isTimeMatching(reminder.recurrence_time, currentUTCTime);
      }
    }
    
    // For weekly reminders
    if (reminder.recurrence_type === 'weekly') {
      // Get the current day of week in UTC
      const currentDay = currentUTCTime.getUTCDay();
      
      // Check if today is one of the recurrence days
      if (reminder.recurrence_days && reminder.recurrence_days.includes(currentDay) && reminder.recurrence_time !== null) {
        // Check if current time matches the recurrence_time (within 1 minute)
        return isTimeMatching(reminder.recurrence_time, currentUTCTime);
      }
    }
    
    // For monthly reminders
    if (reminder.recurrence_type === 'monthly') {
      // Check if today is the same day of the month as the reminder's due date
      const reminderDate = new Date(reminder.due_date);
      
      const isSameDayOfMonth = reminderDate.getUTCDate() === currentUTCTime.getUTCDate();
      
      if (isSameDayOfMonth && reminder.recurrence_time !== null) {
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
      
      if (isSameDayAndMonth && reminder.recurrence_time !== null) {
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
    console.log(`Current time (UTC): ${formatDateForDisplay(now, 'UTC')}\n`);
    
    // Time window for recurring reminders (in minutes)
    // We're using exact minute matching now, but we still need a small window for the database query
    // The actual exact matching is done in the isTimeMatching function
    const timeWindow = 2;
    
    // Calculate current time in minutes since midnight (UTC)
    const currentTimeInMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    
    // Calculate the time window boundaries in minutes
    const lowerTimeInMinutes = (currentTimeInMinutes - timeWindow + 24 * 60) % (24 * 60);
    const upperTimeInMinutes = (currentTimeInMinutes + timeWindow) % (24 * 60);
    
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
          // Recurring daily reminders with time in the current window
          {
            AND: [
              { recurrence_type: 'daily' },
              { status: 'active' },
              // End date check
              {
                OR: [
                  { end_date: null },              // No end date set
                  { end_date: { gte: now } }        // End date hasn't passed
                ]
              },
              // Time window check using integer minutes since midnight
              {
                OR: [
                  // If lower time < upper time (normal case)
                  lowerTimeInMinutes <= upperTimeInMinutes
                    ? {
                        AND: [
                          { recurrence_time: { gte: lowerTimeInMinutes } },
                          { recurrence_time: { lte: upperTimeInMinutes } }
                        ]
                      }
                    // If lower time > upper time (crossing midnight)
                    : {
                        OR: [
                          { recurrence_time: { gte: lowerTimeInMinutes } },
                          { recurrence_time: { lte: upperTimeInMinutes } }
                        ]
                      }
                ]
              }
            ]
          },
          // Recurring weekly reminders with time in the current window
          {
            AND: [
              { recurrence_type: 'weekly' },
              { status: 'active' },
              // End date check
              {
                OR: [
                  { end_date: null },              // No end date set
                  { end_date: { gte: now } }        // End date hasn't passed
                ]
              },
              // Check that today's day of week is in the recurrence_days array
              { recurrence_days: { has: now.getUTCDay() } },
              // Time window check using integer minutes since midnight
              {
                OR: [
                  // If lower time < upper time (normal case)
                  lowerTimeInMinutes <= upperTimeInMinutes
                    ? {
                        AND: [
                          { recurrence_time: { gte: lowerTimeInMinutes } },
                          { recurrence_time: { lte: upperTimeInMinutes } }
                        ]
                      }
                    // If lower time > upper time (crossing midnight)
                    : {
                        OR: [
                          { recurrence_time: { gte: lowerTimeInMinutes } },
                          { recurrence_time: { lte: upperTimeInMinutes } }
                        ]
                      }
                ]
              }
            ]
          },
          // Recurring monthly reminders with time in the current window
          {
            AND: [
              { recurrence_type: 'monthly' },
              { status: 'active' },
              // End date check
              {
                OR: [
                  { end_date: null },              // No end date set
                  { end_date: { gte: now } }        // End date hasn't passed
                ]
              },
              // Check that today's day of month is in the recurrence_days array
              { recurrence_days: { has: now.getUTCDate() } },
              // Time window check using integer minutes since midnight
              {
                OR: [
                  // If lower time < upper time (normal case)
                  lowerTimeInMinutes <= upperTimeInMinutes
                    ? {
                        AND: [
                          { recurrence_time: { gte: lowerTimeInMinutes } },
                          { recurrence_time: { lte: upperTimeInMinutes } }
                        ]
                      }
                    // If lower time > upper time (crossing midnight)
                    : {
                        OR: [
                          { recurrence_time: { gte: lowerTimeInMinutes } },
                          { recurrence_time: { lte: upperTimeInMinutes } }
                        ]
                      }
                ]
              }
            ]
          },
          // Recurring yearly reminders with time in the current window
          // For yearly reminders, we need to check the month and day of the due_date
          // We'll do a broader query here and filter more precisely in isReminderDue
          {
            AND: [
              { recurrence_type: 'yearly' },
              { status: 'active' },
              // End date check
              {
                OR: [
                  { end_date: null },              // No end date set
                  { end_date: { gte: now } }        // End date hasn't passed
                ]
              },
              // Time window check using integer minutes since midnight
              {
                OR: [
                  // If lower time < upper time (normal case)
                  lowerTimeInMinutes <= upperTimeInMinutes
                    ? {
                        AND: [
                          { recurrence_time: { gte: lowerTimeInMinutes } },
                          { recurrence_time: { lte: upperTimeInMinutes } }
                        ]
                      }
                    // If lower time > upper time (crossing midnight)
                    : {
                        OR: [
                          { recurrence_time: { gte: lowerTimeInMinutes } },
                          { recurrence_time: { lte: upperTimeInMinutes } }
                        ]
                      }
                ]
              }
            ]
          }
        ]
      }
    });
    
    // Log the number of potentially due reminders found by the database query
    console.log(`Found ${potentiallyDueReminders.length} potentially due reminders to check`);
    
    // First, filter out reminders that were already sent today
    // Then filter yearly reminders based on month and day
    const filteredReminders = potentiallyDueReminders.filter(reminder => {
      // For recurring reminders, check if it was already sent today
      if (reminder.recurrence_type && reminder.recurrence_type !== 'none' && reminder.last_sent) {
        const lastSent = new Date(reminder.last_sent);
        
        // If the reminder was already sent today (same day in UTC), filter it out
        if (
          lastSent.getUTCFullYear() === now.getUTCFullYear() &&
          lastSent.getUTCMonth() === now.getUTCMonth() &&
          lastSent.getUTCDate() === now.getUTCDate()
        ) {
          console.log(`Skipping reminder ${reminder.id} - already sent today at ${lastSent.toISOString()}`);
          return false;
        }
      }
      // If it's not a yearly reminder, include it
      if (reminder.recurrence_type !== 'yearly') {
        return true;
      }
      
      // For yearly reminders, check if today is the same day and month as the due_date
      const reminderDate = new Date(reminder.due_date);
      const isSameDayAndMonth = (
        reminderDate.getUTCDate() === now.getUTCDate() &&
        reminderDate.getUTCMonth() === now.getUTCMonth()
      );
      
      return isSameDayAndMonth;
    });
    
    console.log(`After filtering yearly reminders: ${filteredReminders.length} reminders to process`);
    
    
    // Track how many reminders are actually due
    let dueReminderCount = 0;
    
    // Process reminders directly
    for (const reminder of filteredReminders) {
      // Get user's timezone preference (only for display purposes)
      const userTimezone = await getUserTimezone(reminder.user_id);
      
      console.log(`\nChecking reminder: ${reminder.id}`);
      console.log(`- Title: ${reminder.title}`);
      console.log(`- Due date (UTC): ${reminder.due_date.toISOString()}`);
      
      // Use formatDateForDisplay which has enhanced logging for debugging
      const formattedDueDate = formatDateForDisplay(reminder.due_date, userTimezone);
      console.log(`- Formatted due date (User TZ): ${formattedDueDate}`);
      
      // Also log the formatted date using formatUTCDate for comparison
      const formattedUTCDate = formatUTCDate(reminder.due_date, userTimezone);
      console.log(`- Formatted due date (alternative method): ${formattedUTCDate}`);
      
      console.log(`- Recurrence type: ${reminder.recurrence_type || 'none'}`);
      
      // Convert recurrence_time from minutes to HH:MM format for better readability
      const recurrenceTimeStr = reminder.recurrence_time !== null ? 
        `${Math.floor(reminder.recurrence_time / 60).toString().padStart(2, '0')}:${(reminder.recurrence_time % 60).toString().padStart(2, '0')}` : 'N/A';
      console.log(`- Recurrence time (UTC): ${reminder.recurrence_time || 'N/A'} (${recurrenceTimeStr})`);
      
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
          
          // Format the reminder date in user's timezone using our enhanced date formatter
          const reminderDate = new Date(reminder.due_date);
          
          // Use formatDateForDisplay for consistent date formatting across the application
          const formattedDate = formatDateForDisplay(reminderDate, userTimezone);
          console.log(`- Formatted date for message: ${formattedDate}`);
          
          // Create a structured reminder message with bell emoji using the format from the database
          // Include the formatted date in the message for clarity
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
          
          // Update reminder status and last_sent timestamp
          if (reminder.recurrence_type === 'none' || !reminder.recurrence_type) {
            // For one-time reminders, mark as sent
            await prisma.reminder.update({
              where: { id: reminder.id },
              data: { status: 'sent', last_sent: now }
            });
          } else {
            // For recurring reminders, update the last_sent timestamp
            await prisma.reminder.update({
              where: { id: reminder.id },
              data: { last_sent: now }
            });
            console.log(`Updated last_sent for recurring reminder ${reminder.id} to ${now.toISOString()}`);
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
      // Get current time in UTC for logging
      const now = new Date();
      console.log(`\n[CRON JOB] Running scheduled reminder check at ${now.toISOString()} (UTC)`);
      
      // Log the current time in different formats for debugging timezone issues
      console.log(`[CRON JOB] Current time details:`);
      console.log(`- UTC ISO: ${now.toISOString()}`);
      console.log(`- UTC String: ${now.toUTCString()}`);
      console.log(`- Local String: ${now.toString()}`);
      console.log(`- UTC Hours: ${now.getUTCHours()}, UTC Minutes: ${now.getUTCMinutes()}`);
      console.log(`- Local Hours: ${now.getHours()}, Local Minutes: ${now.getMinutes()}`);
      
      // Process due reminders
      const result = await processDueReminders();
      console.log(`[CRON JOB] Processed ${result.processed} reminders`);
    } catch (error) {
      console.error("[CRON JOB] Error in cron job:", error);
    }
  });
  
  console.log("Cron jobs started successfully");
}
