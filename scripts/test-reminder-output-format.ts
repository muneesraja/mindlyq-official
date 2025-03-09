import { ReminderListingAgent } from "../lib/agents/reminder-listing-agent";
import { prisma } from "../lib/db";
import { createSecureReminderQuery } from "../lib/utils/reminder-query-builder";

// Test user ID
const TEST_USER_ID = "test-user-123";

// Test queries
const TEST_QUERIES = [
  "Show my reminders",
  "Show my completed reminders",
  "Show my reminders newest first",
  "Show reminders about meeting",
  "Show reminders in JSON format without tips",
  "Show reminders due tomorrow"
];

async function setupTestData() {
  // Check if test user exists
  const existingUser = await prisma.user.findUnique({
    where: { id: TEST_USER_ID }
  });

  if (!existingUser) {
    // Create test user
    await prisma.user.create({
      data: {
        id: TEST_USER_ID,
        name: "Test User",
        email: "test@example.com",
        timezone: "Asia/Kolkata"
      }
    });
  }

  // Clear existing reminders for test user
  await prisma.reminder.deleteMany({
    where: { user_id: TEST_USER_ID }
  });

  // Create test reminders
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const reminders = [
    {
      user_id: TEST_USER_ID,
      title: "Test reminder 1",
      description: "This is a test reminder",
      due_date: now,
      status: "active",
      recurrence_type: "none",
      recurrence_time: "10:00"
    },
    {
      user_id: TEST_USER_ID,
      title: "Meeting with team",
      description: "Discuss project progress",
      due_date: tomorrow,
      status: "active",
      recurrence_type: "none",
      recurrence_time: "14:00"
    },
    {
      user_id: TEST_USER_ID,
      title: "Completed task",
      description: "This task is already done",
      due_date: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Yesterday
      status: "completed",
      recurrence_type: "none",
      recurrence_time: "09:00"
    }
  ];

  for (const reminder of reminders) {
    await prisma.reminder.create({ data: reminder });
  }

  console.log("Test data setup complete");
}

async function testReminderListingOutput() {
  console.log("🧪 Testing Reminder Listing Output Format");
  console.log("=======================================");

  const agent = new ReminderListingAgent();
  
  for (const query of TEST_QUERIES) {
    console.log(`\n🔍 Testing query: "${query}"`);
    
    try {
      const result = await agent.process(query, TEST_USER_ID);
      
      console.log("Success:", result.success);
      
      // Check if we have formatted output
      if (result.formattedOutput) {
        console.log("\nFormatted Output Structure:");
        console.log("- Header:", result.formattedOutput.header);
        console.log("- Reminders:", result.formattedOutput.reminders.length);
        console.log("- Pagination:", result.formattedOutput.pagination);
        console.log("- Tips count:", result.formattedOutput.tips.length);
      } else {
        console.log("No formatted output available");
      }
      
      // Check if we have query context
      if (result.queryContext) {
        console.log("\nQuery Context:");
        console.log(JSON.stringify(result.queryContext, null, 2));
      } else {
        console.log("No query context available");
      }
      
      // Print the actual message that would be sent to the user
      console.log("\nActual message (truncated to 100 chars):");
      console.log(result.message.substring(0, 100) + "...");
      
      console.log("\n✅ Test completed");
    } catch (error) {
      console.error("❌ Test failed:", error);
    }
  }
}

async function main() {
  try {
    await setupTestData();
    await testReminderListingOutput();
  } catch (error) {
    console.error("Error in test:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
