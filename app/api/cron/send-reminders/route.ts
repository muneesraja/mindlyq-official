import { NextResponse } from "next/server";
import twilio from "twilio";
import { prisma } from "@/lib/db";

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Remove edge runtime, use Node.js runtime instead
export const dynamic = "force-dynamic";

// Helper function to calculate next due date for recurring reminders
function calculateNextDueDate(reminder: any): Date {
  const currentDueDate = new Date(reminder.due_date);
  const nextDueDate = new Date(currentDueDate);

  switch (reminder.recurrence_type) {
    case "daily":
      nextDueDate.setDate(nextDueDate.getDate() + 1);
      break;
    case "weekly":
      // If specific days are set, find the next occurrence
      if (reminder.recurrence_days && reminder.recurrence_days.length > 0) {
        const currentDay = currentDueDate.getDay();
        const nextDays = reminder.recurrence_days.filter((day: number) => day > currentDay);
        if (nextDays.length > 0) {
          // Next day is in the same week
          nextDueDate.setDate(nextDueDate.getDate() + (nextDays[0] - currentDay));
        } else {
          // Next day is in the next week
          nextDueDate.setDate(nextDueDate.getDate() + (7 - currentDay + reminder.recurrence_days[0]));
        }
      } else {
        // Default to every 7 days if no specific days are set
        nextDueDate.setDate(nextDueDate.getDate() + 7);
      }
      break;
    case "monthly":
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      break;
  }

  // If a specific time is set for recurring reminders, use it
  if (reminder.recurrence_time) {
    const [hours, minutes] = reminder.recurrence_time.split(':');
    nextDueDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
  }

  return nextDueDate;
}

// Helper function to send WhatsApp message with retry logic
async function sendWhatsAppMessage(reminder: any, retryCount = 3): Promise<void> {
  let lastError;
  for (let i = 0; i < retryCount; i++) {
    try {
      await twilioClient.messages.create({
        body: reminder.description,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: `whatsapp:${reminder.user_id}`,
      });
      return;
    } catch (error) {
      lastError = error;
      console.error(`Failed to send WhatsApp message (attempt ${i + 1}/${retryCount}):`, error);
      if (i < retryCount - 1) {
        // Wait for 1 second before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  throw lastError;
}

// This endpoint will be called by Vercel Cron
export async function GET(req: Request) {
  try {
    console.log("Starting reminder check");
    const now = new Date();
    
    // Find all active reminders that are due
    const dueReminders = await prisma.reminder.findMany({
      where: {
        status: "active",
        due_date: {
          lte: now,
        },
      },
    });

    console.log(`Found ${dueReminders.length} due reminders`);

    const results = await Promise.all(
      dueReminders.map(async (reminder) => {
        try {
          console.log(`Processing reminder: ${reminder.id}`);
          
          // Send WhatsApp message with retry logic
          await sendWhatsAppMessage(reminder);
          console.log(`Sent WhatsApp message for reminder: ${reminder.id}`);

          if (reminder.recurrence_type) {
            const nextDueDate = calculateNextDueDate(reminder);
            console.log(`Updating recurring reminder: ${reminder.id} with next due date: ${nextDueDate}`);

            // Update recurring reminder
            await prisma.reminder.update({
              where: { id: reminder.id },
              data: {
                due_date: nextDueDate,
                last_sent: now,
              },
            });
          } else {
            // Update non-recurring reminder status
            await prisma.reminder.update({
              where: { id: reminder.id },
              data: {
                status: "sent",
                last_sent: now,
              },
            });
          }

          return {
            reminder_id: reminder.id,
            status: "success",
            next_due_date: reminder.recurrence_type ? calculateNextDueDate(reminder) : null,
          };
        } catch (error) {
          console.error(`Error processing reminder ${reminder.id}:`, error);
          
          // Update reminder status to error if max retries exceeded
          await prisma.reminder.update({
            where: { id: reminder.id },
            data: {
              status: "error",
              description: reminder.description + "\n\nError: Failed to send notification. Will retry in next cycle.",
            },
          });

          return {
            reminder_id: reminder.id,
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      })
    );

    const successCount = results.filter(r => r.status === "success").length;
    const errorCount = results.filter(r => r.status === "error").length;

    console.log(`Finished processing reminders. Success: ${successCount}, Errors: ${errorCount}`);

    return NextResponse.json({
      timestamp: now.toISOString(),
      total_processed: results.length,
      success_count: successCount,
      error_count: errorCount,
      results,
    });
  } catch (error) {
    console.error("Error in reminder cron job:", error);
    return NextResponse.json(
      { error: "Failed to process reminders", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
