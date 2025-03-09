import { ReminderListingAgent } from "../lib/agents/reminder-listing-agent";
import { prisma } from "../lib/db";
import { createSecureReminderQuery } from "../lib/utils/reminder-query-builder";

// Test user ID
const TEST_USER_ID = "test-user-123";

// Sample test queries
const TEST_QUERIES = [
  "Show my active reminders",
  "Show my completed reminders",
  "Show my reminders sorted by newest first",
  "Show reminders about meeting",
  "Show reminders due tomorrow",
  "Show my next 5 reminders",
  "Show all my reminders in JSON format"
];

/**
 * Creates test reminders for testing
 */
async function createTestReminders() {
  console.log("Creating test reminders...");
  
  // Delete existing test reminders
  await prisma.reminder.deleteMany({
    where: {
      user_id: TEST_USER_ID
    }
  });
  
  // Create a set of test reminders
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const testReminders = [
    {
      user_id: TEST_USER_ID,
      title: "Team meeting",
      description: "Weekly team sync",
      due_date: tomorrow,
      status: "active",
      recurrence_type: "weekly",
      recurrence_time: "10:00"
    },
    {
      user_id: TEST_USER_ID,
      title: "Doctor appointment",
      description: "Annual checkup",
      due_date: nextWeek,
      status: "active",
      recurrence_type: "none",
      recurrence_time: "14:30"
    },
    {
      user_id: TEST_USER_ID,
      title: "Submit report",
      description: "Project status report",
      due_date: yesterday,
      status: "completed",
      recurrence_type: "none",
      recurrence_time: "17:00"
    },
    {
      user_id: TEST_USER_ID,
      title: "Buy groceries",
      description: "Milk, eggs, bread",
      due_date: now,
      status: "active",
      recurrence_type: "none",
      recurrence_time: "18:00"
    },
    {
      user_id: TEST_USER_ID,
      title: "Call mom",
      description: "Weekly call",
      due_date: tomorrow,
      status: "pending",
      recurrence_type: "weekly",
      recurrence_time: "20:00"
    }
  ];
  
  // Create the reminders
  for (const reminder of testReminders) {
    await prisma.reminder.create({
      data: reminder
    });
  }
  
  console.log(`Created ${testReminders.length} test reminders`);
}

/**
 * Tests the reminder listing agent
 */
async function testReminderListingAgent() {
  console.log("\n🧪 Testing ReminderListingAgent");
  console.log("================================");
  
  const agent = new ReminderListingAgent();
  
  for (const query of TEST_QUERIES) {
    console.log(`\n🔍 Testing query: "${query}"`);
    
    try {
      const result = await agent.process(query, TEST_USER_ID);
      
      console.log("✅ Agent response:");
      console.log("------------------");
      console.log(result.message);
      console.log("------------------");
      
      if (result.data) {
        console.log(`Retrieved ${result.data.length} reminders`);
      }
    } catch (error) {
      console.error("❌ Error processing query:", error);
    }
  }
}

/**
 * Tests the secure query generator directly
 */
async function testSecureQueryGenerator() {
  console.log("\n🧪 Testing Secure Query Generator");
  console.log("================================");
  
  const secureQueryGenerator = createSecureReminderQuery(TEST_USER_ID);
  
  for (const query of TEST_QUERIES) {
    console.log(`\n🔍 Testing query: "${query}"`);
    
    try {
      const queryOptions = await secureQueryGenerator.buildQueryOptions(query);
      console.log("Generated query options:", JSON.stringify(queryOptions, null, 2));
    } catch (error) {
      console.error("❌ Error generating query options:", error);
    }
  }
}

/**
 * Main test function
 */
async function runTests() {
  try {
    // Create test data
    await createTestReminders();
    
    // Test the secure query generator
    await testSecureQueryGenerator();
    
    // Test the reminder listing agent
    await testReminderListingAgent();
    
    console.log("\n🏁 All tests completed!");
  } catch (error) {
    console.error("Error running tests:", error);
  } finally {
    // Close the Prisma client
    await prisma.$disconnect();
  }
}

// Run the tests
runTests();
