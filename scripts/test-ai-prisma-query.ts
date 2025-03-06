import { generatePrismaQueryFromUserMessage } from '../lib/utils/ai-prisma-query-builder';
import { prisma } from '../lib/db';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Test user ID
const TEST_USER_ID = 'test-user-123';

// Sample user messages to test
const testMessages = [
  'Show me my reminders',
  'Show me my reminders for tomorrow',
  'What is my next reminder?',
  'Show me all my completed reminders',
  'Show me my oldest reminders first',
  'Show me reminders about meetings',
  'How many reminders do I have?',
  'Show me reminders in JSON format',
  'Show me my first 3 reminders',
  'Show me reminders due this week'
];

async function runTests() {
  console.log('🧪 Testing AI-driven Prisma Query Generation');
  console.log('===========================================\n');
  
  for (const message of testMessages) {
    console.log(`📝 Testing user message: "${message}"`);
    
    try {
      // Generate Prisma query
      const prismaQuery = await generatePrismaQueryFromUserMessage(message, TEST_USER_ID);
      
      // Log the generated query
      console.log('✅ Generated Prisma Query:');
      console.log(JSON.stringify({
        where: prismaQuery.where,
        orderBy: prismaQuery.orderBy,
        take: prismaQuery.take,
        skip: prismaQuery.skip,
        queryType: prismaQuery.queryType,
        formatOptions: prismaQuery.formatOptions,
        queryContext: prismaQuery.queryContext
      }, null, 2));
      
      // Execute the query against the database (if connected)
      if (process.env.DATABASE_URL) {
        try {
          const count = await prisma.reminder.count({
            where: prismaQuery.where
          });
          
          console.log(`📊 Query would return ${count} reminders`);
          
          if (prismaQuery.queryType !== 'count') {
            const reminders = await prisma.reminder.findMany({
              where: prismaQuery.where,
              orderBy: prismaQuery.orderBy,
              take: prismaQuery.take || 10,
              skip: prismaQuery.skip || 0
            });
            
            console.log(`📋 First reminder (if any): ${reminders.length > 0 ? reminders[0].title : 'None'}`);
          }
        } catch (dbError) {
          console.error('❌ Database query error:', dbError.message);
        }
      }
    } catch (error) {
      console.error(`❌ Error generating query for "${message}":`, error);
    }
    
    console.log('\n-------------------------------------------\n');
  }
  
  console.log('🏁 All tests completed');
}

// Run the tests
runTests()
  .then(() => {
    console.log('Tests completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error running tests:', error);
    process.exit(1);
  });
