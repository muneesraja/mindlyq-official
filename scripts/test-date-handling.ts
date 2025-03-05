import {
  toUTC,
  fromUTC,
  formatUTCDate,
  parseToUTC,
  adjustForDST,
  isTimeMatching,
  getUserTimezone,
  detectTimezoneFromLocation,
  isValidTimezone
} from '../lib/utils/date-converter';

// Test timezone detection
async function testTimezoneDetection() {
  console.log('\n--- Testing Timezone Detection ---');
  
  const locations = [
    'I live in New York',
    'Mumbai, India',
    'London',
    'Tokyo',
    'PST',
    'EST',
    'IST',
    'CET'
  ];
  
  for (const location of locations) {
    try {
      const timezone = await detectTimezoneFromLocation(location);
      console.log(`Location: "${location}" => Timezone: ${timezone}`);
    } catch (error) {
      console.error(`Error detecting timezone for "${location}":`, error);
    }
  }
}

// Test date conversion
function testDateConversion() {
  console.log('\n--- Testing Date Conversion ---');
  
  const timezones = [
    'America/New_York',
    'Asia/Kolkata',
    'Europe/London',
    'Asia/Tokyo',
    'Australia/Sydney'
  ];
  
  const now = new Date();
  
  for (const timezone of timezones) {
    try {
      // Convert to UTC
      const utcDate = toUTC(now, timezone);
      console.log(`\nOriginal date: ${now.toISOString()}`);
      console.log(`Converted to UTC from ${timezone}: ${utcDate.toISOString()}`);
      
      // Convert back from UTC
      const localDate = fromUTC(utcDate, timezone);
      console.log(`Converted back to ${timezone}: ${localDate.toISOString()}`);
      
      // Format date
      const formatted = formatUTCDate(utcDate, timezone, 'yyyy-MM-dd HH:mm:ss zzz');
      console.log(`Formatted in ${timezone}: ${formatted}`);
    } catch (error) {
      console.error(`Error with timezone ${timezone}:`, error);
    }
  }
}

// Test time matching
function testTimeMatching() {
  console.log('\n--- Testing Time Matching ---');
  
  const now = new Date();
  now.setMinutes(0, 0, 0); // Set to exact hour for testing
  
  const testTimes = [
    `${now.getHours()}:00`, // Should match
    `${now.getHours()}:01`, // Should match (within 1 minute)
    `${now.getHours() + 1}:00`, // Should not match
    'invalid', // Should not match
    '' // Should not match
  ];
  
  for (const time of testTimes) {
    const matches = isTimeMatching(time, now);
    console.log(`Time "${time}" matches with ${now.toISOString()}: ${matches}`);
  }
}

// Run all tests
async function runTests() {
  console.log('=== STARTING DATE HANDLING TESTS ===');
  
  await testTimezoneDetection();
  testDateConversion();
  testTimeMatching();
  
  console.log('\n=== ALL TESTS COMPLETED ===');
}

runTests().catch(error => {
  console.error('Error running tests:', error);
});
