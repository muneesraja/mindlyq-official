import { NextResponse } from "next/server";
import twilio from "twilio";
import { prisma } from "@/lib/db";

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const runtime = "edge";
export const dynamic = "force-dynamic";

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
          if (reminder.recurrence_type) {
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

    console.log("Finished processing reminders");

    return NextResponse.json({
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error("Error in send-reminders cron:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
