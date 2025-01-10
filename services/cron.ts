import cron from 'node-cron';
import { prisma } from '../lib/db';
import twilio from 'twilio';

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function logReminders() {
  const reminders = await prisma.reminder.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      recurrence_type: true,
      last_sent: true,
      due_date: true
    },
    orderBy: {
      created_at: 'desc'
    }
  });
  console.log('Current reminders in DB:', JSON.stringify(reminders, null, 2));
}

export async function processDueReminders() {
  try {
    const now = new Date();
    console.log("\n=== Starting reminder check at:", now.toISOString(), "===");
    
    // Log current state
    await logReminders();

    // Find due reminders
    const dueReminders = await prisma.reminder.findMany({
      where: {
        OR: [
          // Active recurring reminders that are due
          {
            AND: [
              { status: "active" },
              { recurrence_type: { in: ["daily", "weekly"] } },
              { due_date: { lte: now } }
            ]
          },
          // Pending non-recurring reminders that are due
          {
            AND: [
              { status: "pending" },
              { recurrence_type: "none" },
              { due_date: { lte: now } }
            ]
          }
        ]
      },
    });

    console.log(`Found ${dueReminders.length} due reminders:`, JSON.stringify(dueReminders, null, 2));

    const results = await Promise.all(
      dueReminders.map(async (reminder) => {
        try {
          console.log(`\nProcessing reminder: ${JSON.stringify(reminder, null, 2)}`);
          
          // Send WhatsApp message
          await twilioClient.messages.create({
            body: `🔔 Reminder: ${reminder.title}${
              reminder.description ? `\n\n${reminder.description}` : ""
            }`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: `whatsapp:${reminder.user_id}`,
          });

          console.log(`Sent WhatsApp message for reminder: ${reminder.id}`);

          // Handle recurring reminders
          if (reminder.recurrence_type === "daily" || reminder.recurrence_type === "weekly") {
            let nextDueDate = new Date(reminder.due_date);

            switch (reminder.recurrence_type) {
              case "daily":
                nextDueDate.setDate(nextDueDate.getDate() + 1);
                break;
              case "weekly":
                nextDueDate.setDate(nextDueDate.getDate() + 7);
                break;
            }

            console.log(`Updating recurring reminder: ${reminder.id} with next due date: ${nextDueDate}`);

            // Update recurring reminder with next due date
            const updatedRecurring = await prisma.reminder.update({
              where: { id: reminder.id },
              data: {
                due_date: nextDueDate,
                last_sent: now,
                status: "active" // Ensure it stays active
              },
            });
            
            console.log(`Updated recurring reminder: ${JSON.stringify(updatedRecurring, null, 2)}`);
          } else {
            // For non-recurring reminders, mark as completed
            console.log(`Marking non-recurring reminder ${reminder.id} as completed`);
            
            const updatedNonRecurring = await prisma.reminder.update({
              where: { id: reminder.id },
              data: {
                status: "completed",
                last_sent: now,
              },
            });
            
            console.log(`Updated non-recurring reminder: ${JSON.stringify(updatedNonRecurring, null, 2)}`);
          }

          return {
            reminder_id: reminder.id,
            status: "success",
          };
        } catch (error) {
          console.error(`Error processing reminder ${reminder.id}:`, error);
          return {
            reminder_id: reminder.id,
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      })
    );

    console.log("\nFinished processing reminders:", results);
    
    // Log final state
    console.log("\nFinal DB state:");
    await logReminders();
    
    return results;
  } catch (error) {
    console.error("Error in processDueReminders:", error);
    throw error;
  }
}

export function startCronJobs() {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      await processDueReminders();
    } catch (error) {
      console.error('Error in CRON job:', error);
    }
  });

  console.log('CRON jobs started');
}
