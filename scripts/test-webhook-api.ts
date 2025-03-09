/**
 * Script to test the webhook API with simulated requests
 */

// Function to simulate a Twilio webhook request
async function simulateWebhookRequest(message: string, from: string = "whatsapp:+1234567890") {
  console.log(`\n🔍 Testing webhook with message: "${message}"`);
  
  try {
    // Create form data for the request
    const formData = new FormData();
    formData.append("Body", message);
    formData.append("From", from);
    
    // Send the request to the webhook API
    const response = await fetch("http://localhost:3000/api/webhook", {
      method: "POST",
      body: formData
    });
    
    // Get the response
    const responseText = await response.text();
    
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${responseText}`);
    
    return {
      status: response.status,
      response: responseText
    };
  } catch (error) {
    console.error("❌ Error sending webhook request:", error);
    return {
      status: 500,
      response: "Error sending request"
    };
  }
}

// Test cases for the webhook API
const testCases = [
  {
    name: "Show active reminders",
    message: "Show my active reminders"
  },
  {
    name: "Show completed reminders",
    message: "Show my completed reminders"
  },
  {
    name: "Show reminders with sorting",
    message: "Show my reminders newest first"
  },
  {
    name: "Show reminders with search",
    message: "Show reminders about meeting"
  },
  {
    name: "Show reminders with time range",
    message: "Show reminders due tomorrow"
  },
  {
    name: "Invalid request (empty message)",
    message: ""
  },
  {
    name: "Potentially malicious input",
    message: "Show reminders; DROP TABLE reminders; --"
  }
];

// Run all test cases
async function runTests() {
  console.log("🧪 Testing Webhook API");
  console.log("=====================");
  
  for (const testCase of testCases) {
    console.log(`\n🔍 Test case: ${testCase.name}`);
    
    try {
      await simulateWebhookRequest(testCase.message);
    } catch (error) {
      console.error("❌ Error running test case:", error);
    }
    
    // Add a delay between requests to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log("\n🏁 All webhook tests completed!");
}

// Check if the server is running before starting tests
async function checkServerStatus() {
  try {
    const response = await fetch("http://localhost:3000");
    if (response.status >= 200 && response.status < 500) {
      console.log("✅ Server is running");
      return true;
    } else {
      console.error("❌ Server returned an error status:", response.status);
      return false;
    }
  } catch (error) {
    console.error("❌ Server is not running. Please start the server with 'npm run dev' before running this test.");
    return false;
  }
}

// Main function
async function main() {
  const serverRunning = await checkServerStatus();
  
  if (serverRunning) {
    await runTests();
  } else {
    console.log("Please start the server with 'npm run dev' or 'bun run dev' and try again.");
  }
}

// Run the main function
main();
