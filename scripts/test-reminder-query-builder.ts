import { generateSecureQueryFromUserMessage, validateQueryParameters, ReminderQueryOptions } from "../lib/utils/reminder-query-builder";

// Test user ID
const TEST_USER_ID = "test-user-123";

async function runTests() {
  console.log("🧪 Testing Reminder Query Builder");
  console.log("================================");

  // Test cases for different query scenarios
  const testCases = [
    {
      name: "Basic active reminders",
      message: "Show my reminders",
      expected: {
        filter: "active",
        sortField: "due_date",
        sortOrder: "asc"
      }
    },
    {
      name: "Completed reminders",
      message: "Show my completed reminders",
      expected: {
        filter: "completed"
      }
    },
    {
      name: "Newest first",
      message: "Show my reminders newest first",
      expected: {
        sortOrder: "desc"
      }
    },
    {
      name: "Search term",
      message: "Show reminders about meeting",
      expected: {
        search: "meeting"
      }
    },
    {
      name: "Format options",
      message: "Show reminders in JSON format without tips",
      expected: {
        formatOptions: {
          outputFormat: "json",
          includeTips: false
        }
      }
    },
    {
      name: "Time range",
      message: "Show reminders due tomorrow",
      expected: {
        timeRange: {} // We'll just check if timeRange exists
      }
    },
    {
      name: "Complex query",
      message: "Show my completed reminders about meetings from last week sorted by title",
      expected: {
        filter: "completed",
        search: "meeting",
        timeRange: {},
        sortField: "title"
      }
    }
  ];

  // Run each test case
  for (const testCase of testCases) {
    console.log(`\n🔍 Testing: ${testCase.name}`);
    console.log(`Message: "${testCase.message}"`);
    
    try {
      // Generate query options from the message
      const queryOptions = await generateSecureQueryFromUserMessage(testCase.message, TEST_USER_ID);
      
      console.log("Generated query options:", JSON.stringify(queryOptions, null, 2));
      
      // Verify the expected fields
      let passed = true;
      const failures: string[] = [];
      
      for (const [key, expectedValue] of Object.entries(testCase.expected)) {
        if (key === 'timeRange') {
          // For timeRange, just check if it exists when expected
          if (expectedValue && !queryOptions.timeRange) {
            passed = false;
            failures.push(`Expected timeRange to exist, but it doesn't`);
          }
        } else if (key === 'formatOptions') {
          // For formatOptions, check each nested property
          if (!queryOptions.formatOptions) {
            passed = false;
            failures.push(`Expected formatOptions to exist, but it doesn't`);
          } else {
            for (const [formatKey, formatValue] of Object.entries(expectedValue as object)) {
              if (queryOptions.formatOptions[formatKey as keyof typeof queryOptions.formatOptions] !== formatValue) {
                passed = false;
                failures.push(`Expected formatOptions.${formatKey} to be ${formatValue}, but got ${queryOptions.formatOptions[formatKey as keyof typeof queryOptions.formatOptions]}`);
              }
            }
          }
        } else {
          // For other fields, compare directly
          if (queryOptions[key as keyof ReminderQueryOptions] !== expectedValue) {
            passed = false;
            failures.push(`Expected ${key} to be ${expectedValue}, but got ${queryOptions[key as keyof ReminderQueryOptions]}`);
          }
        }
      }
      
      // Always verify that userId is preserved
      if (queryOptions.userId !== TEST_USER_ID) {
        passed = false;
        failures.push(`Expected userId to be ${TEST_USER_ID}, but got ${queryOptions.userId}`);
      }
      
      // Report test result
      if (passed) {
        console.log("✅ Test PASSED");
      } else {
        console.log("❌ Test FAILED");
        for (const failure of failures) {
          console.log(`   - ${failure}`);
        }
      }
    } catch (error) {
      console.error("❌ Test ERROR:", error);
    }
  }

  // Test validation function
  console.log("\n🧪 Testing Query Parameter Validation");
  console.log("================================");
  
  const validationTestCases = [
    {
      name: "Valid parameters",
      params: {
        userId: TEST_USER_ID,
        filter: "active",
        sortField: "due_date",
        sortOrder: "asc",
        limit: 10,
        offset: 0
      },
      expectValid: true
    },
    {
      name: "Invalid filter",
      params: {
        userId: TEST_USER_ID,
        filter: "invalid",
        sortField: "due_date"
      },
      expectValid: true, // Should be valid but with default filter
      expectedFilter: "active"
    },
    {
      name: "Invalid sortField",
      params: {
        userId: TEST_USER_ID,
        sortField: "invalid_field"
      },
      expectValid: true, // Should be valid but with default sortField
      expectedSortField: "due_date"
    },
    {
      name: "Too large limit",
      params: {
        userId: TEST_USER_ID,
        limit: 100
      },
      expectValid: true, // Should be valid but with default limit
      expectedLimit: 10
    }
  ];
  
  for (const testCase of validationTestCases) {
    console.log(`\n🔍 Testing validation: ${testCase.name}`);
    
    try {
      const validated = validateQueryParameters(testCase.params);
      console.log("Validated parameters:", JSON.stringify(validated, null, 2));
      
      let passed = true;
      const failures: string[] = [];
      
      // Check specific expectations
      if (testCase.expectedFilter && validated.filter !== testCase.expectedFilter) {
        passed = false;
        failures.push(`Expected filter to be ${testCase.expectedFilter}, but got ${validated.filter}`);
      }
      
      if (testCase.expectedSortField && validated.sortField !== testCase.expectedSortField) {
        passed = false;
        failures.push(`Expected sortField to be ${testCase.expectedSortField}, but got ${validated.sortField}`);
      }
      
      if (testCase.expectedLimit && validated.limit !== testCase.expectedLimit) {
        passed = false;
        failures.push(`Expected limit to be ${testCase.expectedLimit}, but got ${validated.limit}`);
      }
      
      // Report test result
      if (passed) {
        console.log("✅ Validation test PASSED");
      } else {
        console.log("❌ Validation test FAILED");
        for (const failure of failures) {
          console.log(`   - ${failure}`);
        }
      }
    } catch (error) {
      console.error("❌ Validation test ERROR:", error);
    }
  }
  
  console.log("\n🏁 All tests completed!");
}

// Run the tests
runTests().catch(error => {
  console.error("Error running tests:", error);
});
