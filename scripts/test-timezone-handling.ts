import { prisma } from '../lib/db';
import { 
  getUserTimezone, 
  toUTC, 
  fromUTC, 
  formatUTCDate 
} from '../lib/utils/date-converter';
import { formatDateForDisplay } from '../lib/utils/date-calculator';

/**
 * Test script to verify timezone handling in the reminder system
 * This script creates a test reminder and shows how dates are converted
 * between UTC and the user's local timezone
 */
async function testTimezoneHandling() {
  try {
    console.log('Starting timezone handling test...');
    
    // Use a test user ID
    const userId = 'test-user-123';
    
    // Get the user's timezone
    const userTimezone = await getUserTimezone(userId);
    console.log(`User timezone: ${userTimezone}`);
    
    // Current time in UTC
    const now = new Date();
    console.log(`\nCurrent time (UTC): ${now.toISOString()}`);
    console.log(`Current time (Local): ${now.toString()}`);
    
    // Test conversion from local to UTC
    console.log('\n--- Testing local to UTC conversion ---');
    // Create a date in the user's timezone (e.g., 3:00 PM tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(15, 0, 0, 0); // 3:00 PM
    
    console.log(`Local date (before conversion): ${tomorrow.toString()}`);
    console.log(`Local date components: ${tomorrow.getFullYear()}-${tomorrow.getMonth() + 1}-${tomorrow.getDate()} ${tomorrow.getHours()}:${tomorrow.getMinutes()}`);
    
    // Convert to UTC for storage
    const utcDate = toUTC(tomorrow, userTimezone);
    console.log(`Converted to UTC: ${utcDate.toISOString()}`);
    console.log(`UTC date components: ${utcDate.getUTCFullYear()}-${utcDate.getUTCMonth() + 1}-${utcDate.getUTCDate()} ${utcDate.getUTCHours()}:${utcDate.getUTCMinutes()}`);
    
    // Test conversion from UTC back to local
    console.log('\n--- Testing UTC to local conversion ---');
    const localDate = fromUTC(utcDate, userTimezone);
    console.log(`Converted back to local: ${localDate.toString()}`);
    console.log(`Local date components: ${localDate.getFullYear()}-${localDate.getMonth() + 1}-${localDate.getDate()} ${localDate.getHours()}:${localDate.getMinutes()}`);
    
    // Test formatting for display
    console.log('\n--- Testing date formatting ---');
    const formattedWithDateConverter = formatUTCDate(utcDate, userTimezone, 'EEEE, MMMM d, yyyy h:mm a');
    console.log(`Formatted with formatUTCDate: ${formattedWithDateConverter}`);
    
    const formattedWithDateCalculator = formatDateForDisplay(utcDate, userTimezone);
    console.log(`Formatted with formatDateForDisplay: ${formattedWithDateCalculator}`);
    
    // Create a test reminder in the database
    console.log('\n--- Creating test reminder ---');
    
    // Calculate recurrence time in minutes since midnight (UTC)
    const recurrenceTimeMinutes = utcDate.getUTCHours() * 60 + utcDate.getUTCMinutes();
    
    // Delete any existing test reminder
    await prisma.reminder.deleteMany({
      where: {
        user_id: userId,
        title: 'Timezone Test Reminder'
      }
    });
    
    // Create a new test reminder
    const reminder = await prisma.reminder.create({
      data: {
        title: 'Timezone Test Reminder',
        due_date: utcDate,
        description: 'Testing timezone handling',
        user_id: userId,
        status: 'active',
        recurrence_type: 'none',
        recurrence_time: recurrenceTimeMinutes
      }
    });
    
    console.log(`Created reminder with ID: ${reminder.id}`);
    console.log(`Due date (UTC): ${reminder.due_date.toISOString()}`);
    console.log(`Recurrence time (minutes): ${reminder.recurrence_time} (${Math.floor(reminder.recurrence_time / 60)}:${reminder.recurrence_time % 60})`);
    
    // Format the reminder date for display
    const reminderFormattedDate = formatDateForDisplay(reminder.due_date, userTimezone);
    console.log(`Formatted due date: ${reminderFormattedDate}`);
    
    console.log('\nTimezone handling test completed successfully!');
  } catch (error) {
    console.error('Error in timezone handling test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testTimezoneHandling();
