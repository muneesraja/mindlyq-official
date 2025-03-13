import { prisma } from '../lib/db';
import { 
  getUserTimezone, 
  toUTC, 
  fromUTC, 
  formatUTCDate,
  timeStringToMinutes,
  minutesToTimeString
} from '../lib/utils/date-converter';
import { formatDateForDisplay } from '../lib/utils/date-calculator';

/**
 * Test script to verify that due_date and recurrence_time are consistent
 * This script creates test reminders and verifies that the recurrence_time
 * correctly matches the time in the due_date
 */
async function verifyReminderTimeConsistency() {
  try {
    console.log('Starting reminder time consistency verification...');
    
    // Use a test user ID
    const userId = 'test-user-123';
    
    // Get the user's timezone
    const userTimezone = await getUserTimezone(userId);
    console.log(`User timezone: ${userTimezone}`);
    
    // Current time in UTC
    const now = new Date();
    console.log(`\nCurrent time (UTC): ${now.toISOString()}`);
    console.log(`Current time (Local): ${now.toString()}`);
    
    // Create test times at different hours
    const testTimes = [
      { hour: 9, minute: 0 },   // 9:00 AM
      { hour: 12, minute: 30 }, // 12:30 PM
      { hour: 16, minute: 45 }, // 4:45 PM
      { hour: 23, minute: 15 }  // 11:15 PM
    ];
    
    // Delete any existing test reminders
    await prisma.reminder.deleteMany({
      where: {
        user_id: userId,
        title: { startsWith: 'Time Test' }
      }
    });
    
    console.log('\n--- Creating test reminders with different times ---');
    
    for (const testTime of testTimes) {
      // Create a date for tomorrow at the specified time
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(testTime.hour, testTime.minute, 0, 0);
      
      // Convert to UTC for storage
      const utcDate = toUTC(tomorrow, userTimezone);
      
      // Calculate recurrence time in minutes since midnight (UTC)
      const recurrenceTimeMinutes = utcDate.getUTCHours() * 60 + utcDate.getUTCMinutes();
      
      // Create a test reminder
      const reminder = await prisma.reminder.create({
        data: {
          title: `Time Test ${testTime.hour}:${testTime.minute}`,
          due_date: utcDate,
          description: 'Testing time consistency',
          user_id: userId,
          status: 'active',
          recurrence_type: 'none',
          recurrence_time: recurrenceTimeMinutes
        }
      });
      
      // Verify the consistency between due_date and recurrence_time
      const dueDate = reminder.due_date;
      const dueDateMinutes = dueDate.getUTCHours() * 60 + dueDate.getUTCMinutes();
      const recurrenceTime = reminder.recurrence_time ?? -1; // Use -1 as a fallback if null
      const isConsistent = dueDateMinutes === recurrenceTime;
      
      console.log(`\nReminder: ${reminder.title}`);
      console.log(`Due date (UTC): ${dueDate.toISOString()}`);
      console.log(`Due date time: ${dueDate.getUTCHours()}:${dueDate.getUTCMinutes()} UTC`);
      
      if (recurrenceTime !== -1) {
        console.log(`Recurrence time: ${recurrenceTime} minutes (${Math.floor(recurrenceTime / 60)}:${(recurrenceTime % 60).toString().padStart(2, '0')} UTC)`);
      } else {
        console.log(`Recurrence time: null (not set)`);
      }
      
      console.log(`Time consistency check: ${isConsistent ? '✅ PASSED' : '❌ FAILED'}`);
      
      if (!isConsistent) {
        console.log(`ERROR: Due date minutes (${dueDateMinutes}) does not match recurrence_time (${recurrenceTime})`);
      }
    }
    
    console.log('\n--- Retrieving and checking all test reminders ---');
    
    // Retrieve all test reminders and check consistency
    const reminders = await prisma.reminder.findMany({
      where: {
        user_id: userId,
        title: { startsWith: 'Time Test' }
      }
    });
    
    let allConsistent = true;
    
    for (const reminder of reminders) {
      const dueDate = reminder.due_date;
      const dueDateMinutes = dueDate.getUTCHours() * 60 + dueDate.getUTCMinutes();
      const recurrenceTime = reminder.recurrence_time ?? -1; // Use -1 as a fallback if null
      const isConsistent = dueDateMinutes === recurrenceTime;
      
      if (!isConsistent) {
        allConsistent = false;
        console.log(`\nInconsistency found in reminder: ${reminder.title}`);
        console.log(`Due date (UTC): ${dueDate.toISOString()}`);
        console.log(`Due date time: ${dueDate.getUTCHours()}:${dueDate.getUTCMinutes()} UTC (${dueDateMinutes} minutes)`);
        
        if (recurrenceTime !== -1) {
          console.log(`Recurrence time: ${recurrenceTime} minutes (${Math.floor(recurrenceTime / 60)}:${(recurrenceTime % 60).toString().padStart(2, '0')} UTC)`);
        } else {
          console.log(`Recurrence time: null (not set)`);
        }
      }
    }
    
    if (allConsistent) {
      console.log('✅ All reminders have consistent due_date and recurrence_time values');
    } else {
      console.log('❌ Some reminders have inconsistent due_date and recurrence_time values');
    }
    
    console.log('\nReminder time consistency verification completed!');
  } catch (error) {
    console.error('Error in reminder time consistency verification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the verification
verifyReminderTimeConsistency();
