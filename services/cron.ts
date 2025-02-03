import cron from 'node-cron';
import { prisma } from '../lib/db';
import twilio from 'twilio';

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function processDueReminders() {
  try {
    const now = new Date();
    console.log("\n=== Starting reminder check at:", now.toISOString(), "===");

    // Find due reminders
    const dueReminders = await prisma.reminder.findMany({
      where: {
        OR: [
          // One-time reminders that are due and pending
          {
            AND: [
              { status: "pending" },
              { recurrence_type: "none" },
              { due_date: { lte: now } }
            ]
          },
          // Recurring reminders that are active and due
          {
            AND: [
              { status: "active" },
              { recurrence_type: { in: ["daily", "weekly"] } },
              {
                OR: [
                  // For daily reminders, check if current time matches recurrence_time
                  {
                    AND: [
                      { recurrence_type: "daily" },
                      {
                        recurrence_time: {
                          equals: now.toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: false 
                          })
                        }
                      }
                    ]
                  },
                  // For weekly reminders, check both day and time
                  {
                    AND: [
                      { recurrence_type: "weekly" },
                      { recurrence_days: { has: now.getDay() } },
                      {
                        recurrence_time: {
                          equals: now.toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: false 
                          })
                        }
                      }
                    ]
                  }
                ]
              }
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
            to: `whatsapp:${reminder.user_id}`
          });

          // Update reminder status based on type
          if (reminder.recurrence_type === "none") {
            // For one-time reminders, mark as completed
            await prisma.reminder.update({
              where: { id: reminder.id },
              data: { status: "completed", last_sent: now }
            });
          } else {
            // For recurring reminders, just update last_sent
            await prisma.reminder.update({
              where: { id: reminder.id },
              data: { last_sent: now }
            });
          }

          return { success: true, reminderId: reminder.id };
        } catch (error) {
          console.error(`Error processing reminder ${reminder.id}:`, error);
          return { success: false, reminderId: reminder.id, error };
        }
      })
    );

    console.log("\nProcessing results:", results);
    return results;
  } catch (error) {
    console.error("Error in processDueReminders:", error);
    throw error;
  }
}

// Run every minute
export function startCronJobs() {
  console.log("Starting cron jobs...");
  cron.schedule('* * * * *', async () => {
    await processDueReminders();
  });
}
