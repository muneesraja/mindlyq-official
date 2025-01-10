import { startCronJobs } from '@/services/cron';

// Start the CRON jobs when the API route is first accessed
startCronJobs();

export async function GET() {
  return new Response('CRON service is running', { status: 200 });
}
