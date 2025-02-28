import { parseDateTime, formatDateForHumans } from '../lib/ai-date-parser';

async function testDateParser() {
  const testCases = [
    "Remind me tomorrow at 3pm",
    "Set a reminder for next Friday at noon",
    "Remind me on May 15th at 10:30",
    "Set a reminder for every Monday at 10am",
    "Remind me in 30 minutes",
    "Set a reminder for the day after tomorrow at 9am",
    "Remind me every weekday at 8am",
    "Set a reminder for Christmas",
    "Remind me about my dentist appointment on the 21st at 2pm",
    "Set a reminder to call mom in an hour",
  ];

  console.log("Testing AI Date Parser...\n");

  for (const testCase of testCases) {
    console.log(`Input: "${testCase}"`);
    try {
      const result = await parseDateTime(testCase);
      
      if (result.success) {
        console.log("✅ Success!");
        console.log(`Date: ${formatDateForHumans(result.date!)}`);
        
        if (result.isRecurring) {
          console.log(`Recurring: ${result.recurrenceType}`);
          if (result.recurrenceType === 'weekly' && result.recurrenceDays) {
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            console.log(`Days: ${result.recurrenceDays.map(d => days[d]).join(', ')}`);
          }
          console.log(`Time: ${result.recurrenceTime}`);
        }
      } else {
        console.log("❌ Failed to parse");
        console.log(`Error: ${result.error}`);
      }
    } catch (error) {
      console.log("❌ Error during parsing");
      console.error(error);
    }
    
    console.log("\n---\n");
  }
}

testDateParser().catch(console.error);
