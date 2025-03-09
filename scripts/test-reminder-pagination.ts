import { ReminderListingAgent } from '../lib/agents/reminder-listing-agent';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const agent = new ReminderListingAgent();

async function testPagination() {
  console.log('Testing Reminder Pagination with Conversational Output');
  console.log('==================================================');
  
  // Use a valid user ID for testing
  const userId = '1'; // Replace with a valid user ID from your database
  
  try {
    // Test a query that should return multiple reminders
    console.log('\n\nTEST 1: Initial Query');
    console.log('---------------------');
    const result1 = await agent.process('show all my reminders', userId);
    console.log(JSON.stringify(result1, null, 2));
    
    // Test pagination request
    console.log('\n\nTEST 2: Pagination Request');
    console.log('-------------------------');
    const result2 = await agent.process('show more', userId);
    console.log(JSON.stringify(result2, null, 2));
    
    // Test another pagination request
    console.log('\n\nTEST 3: Another Pagination Request');
    console.log('-------------------------------');
    const result3 = await agent.process('next page', userId);
    console.log(JSON.stringify(result3, null, 2));
    
    // Test a query with specific filter
    console.log('\n\nTEST 4: Query with Specific Filter');
    console.log('--------------------------------');
    const result4 = await agent.process('show my important reminders', userId);
    console.log(JSON.stringify(result4, null, 2));
    
    // Test a query that returns exactly one reminder more than the page size
    console.log('\n\nTEST 5: Query with One More Reminder than Page Size');
    console.log('-----------------------------------------------');
    const result5 = await agent.process('show my next 11 reminders', userId);
    console.log(JSON.stringify(result5, null, 2));
    
  } catch (error) {
    console.error('Error testing pagination:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPagination().catch(console.error);
