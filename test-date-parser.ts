import { parseDateTime, formatDateForHumans } from './lib/ai-date-parser';

async function testDateParser() {
  console.log('Testing Date Parser with new date-calculator module\n');
  
  const testCases = [
    'remind me tomorrow at 3pm',
    'remind me in 5 minutes',
    'remind me next Monday at 10am',
    'remind me on March 15 at 2pm',
    'remind me every Monday at 9am',
    'remind me every day at 8pm',
    'call mom'
  ];
  
  for (const testCase of testCases) {
    console.log(`\nTesting: "${testCase}"`);
    try {
      const result = await parseDateTime(testCase);
      console.log('Result:', JSON.stringify(result, null, 2));
      
      if (result.success && result.date) {
        console.log('Formatted date:', formatDateForHumans(result.date));
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }
}

// Run the test
testDateParser().catch(console.error);
