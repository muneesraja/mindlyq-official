import { NextResponse } from "next/server";
import twilio from "twilio";
import { prisma } from "@/lib/db";

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { reminder_id, user_id, title, description } = body;

    if (!reminder_id || !user_id || !title) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Format the reminder message
    const reminderMessage = `🔔 Reminder: ${title}${description ? `\n\n${description}` : ""}`;

    // Send the reminder via WhatsApp
    await twilioClient.messages.create({
      body: reminderMessage,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: `whatsapp:${user_id}`,
    });

    // Update the reminder status in the database
    await prisma.reminder.update({
      where: { id: reminder_id },
      data: { 
        last_sent: new Date(),
        status: "sent"
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in send-message webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
