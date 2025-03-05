/**
 * Test script for the date-converter utilities
 * 
 * This script tests various date conversion and formatting functions
 * to ensure they work correctly across different timezones.
 */

import { 
  toUTC, 
  fromUTC, 
  formatUTCDate, 
  parseToUTC,
  parseUserInput,
  adjustForDST
} from '../lib/utils/date-converter';

// Test timezones
const timezones = [
  'Asia/Kolkata',    // IST
  'America/New_York', // EST/EDT
  'Europe/London',    // GMT/BST
  'Australia/Sydney', // AEST/AEDT
  'Pacific/Auckland', // NZST/NZDT
  'Etc/UTC'           // UTC
];

// Current time in UTC
const now = new Date();
console.log('Current time (UTC):', now.toISOString());
console.log('');

// Test 1: Convert current time to different timezones and back
console.log('=== Test 1: Convert UTC to local and back ===');
for (const timezone of timezones) {
  console.log(`\nTimezone: ${timezone}`);
  
  // Convert UTC to local time
  const localTime = fromUTC(now, timezone);
  console.log(`UTC to local: ${localTime.toISOString()} (${formatUTCDate(localTime, timezone)})`);
  
  // Convert local time back to UTC
  const backToUTC = toUTC(localTime, timezone);
  console.log(`Local to UTC: ${backToUTC.toISOString()}`);
  
  // Check if the conversion is accurate (should be close to the original time)
  const diffMs = Math.abs(backToUTC.getTime() - now.getTime());
  console.log(`Difference: ${diffMs}ms (should be close to 0)`);
}

// Test 2: Format dates in different timezones
console.log('\n=== Test 2: Format dates in different timezones ===');
for (const timezone of timezones) {
  console.log(`\nTimezone: ${timezone}`);
  
  // Different format strings
  const formats = [
    'yyyy-MM-dd HH:mm:ss',
    'MMMM d, yyyy h:mm a',
    'EEEE, MMMM d, yyyy',
    'HH:mm:ss zzz'
  ];
  
  for (const formatString of formats) {
    const formatted = formatUTCDate(now, timezone, formatString);
    console.log(`Format "${formatString}": ${formatted}`);
  }
}

// Test 3: Parse date strings in different formats
console.log('\n=== Test 3: Parse date strings ===');
const dateStrings = [
  '2025-03-05 08:57',
  '03/05/2025 08:57',
  '05/03/2025 08:57 AM',
  '2025-03-05T08:57:00Z'
];

for (const timezone of timezones.slice(0, 3)) { // Test with a few timezones
  console.log(`\nTimezone: ${timezone}`);
  
  for (const dateString of dateStrings) {
    try {
      // Parse with specific format
      const parsed = parseToUTC(dateString, timezone, 'yyyy-MM-dd HH:mm');
      console.log(`Parsed "${dateString}": ${parsed ? parsed.toISOString() : 'Failed'}`);
      
      // Parse with auto-detection
      const autoParsed = parseUserInput(dateString, timezone);
      console.log(`Auto-parsed "${dateString}": ${autoParsed ? autoParsed.toISOString() : 'Failed'}`);
    } catch (error) {
      console.log(`Error parsing "${dateString}": ${error}`);
    }
  }
}

// Test 4: Test DST handling
console.log('\n=== Test 4: DST handling ===');

// Create dates during DST transitions
const dstDates = [
  new Date('2025-03-09T02:30:00Z'), // US DST start
  new Date('2025-11-02T01:30:00Z'), // US DST end
  new Date('2025-03-30T01:30:00Z'), // EU DST start
  new Date('2025-10-26T01:30:00Z')  // EU DST end
];

for (const date of dstDates) {
  console.log(`\nTesting DST for date: ${date.toISOString()}`);
  
  for (const timezone of ['America/New_York', 'Europe/London']) {
    console.log(`\n  Timezone: ${timezone}`);
    
    // Convert to local time
    const localTime = fromUTC(date, timezone);
    console.log(`  UTC to local: ${formatUTCDate(localTime, timezone, 'yyyy-MM-dd HH:mm:ss zzz')}`);
    
    // Adjust for DST to maintain 9:00 AM
    const adjusted = adjustForDST(date, timezone, 9, 0);
    console.log(`  Adjusted to 9:00 AM: ${formatUTCDate(adjusted, timezone, 'yyyy-MM-dd HH:mm:ss zzz')}`);
    
    // Check if the adjusted time is actually 9:00 AM in local time
    const localAdjusted = fromUTC(adjusted, timezone);
    console.log(`  Local adjusted hours: ${localAdjusted.getHours()}:${localAdjusted.getMinutes()}`);
  }
}

// Test 5: Real-world reminder scenario
console.log('\n=== Test 5: Reminder scenario ===');

// Simulate user creating a reminder
const userTimezone = 'Asia/Kolkata';
const reminderLocalDate = new Date('2025-03-05T15:30:00');
console.log(`User in ${userTimezone} creates reminder for: ${formatUTCDate(reminderLocalDate, userTimezone)}`);

// Convert to UTC for storage
const reminderUTC = toUTC(reminderLocalDate, userTimezone);
console.log(`Stored in database as UTC: ${reminderUTC.toISOString()}`);

// Simulate retrieving and displaying in different timezones
for (const displayTimezone of timezones) {
  const displayDate = fromUTC(reminderUTC, displayTimezone);
  console.log(`Displayed in ${displayTimezone}: ${formatUTCDate(displayDate, displayTimezone)}`);
}

console.log('\nAll tests completed!');
