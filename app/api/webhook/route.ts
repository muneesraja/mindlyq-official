import { NextResponse } from "next/server";
import twilio from "twilio";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/db";
import { parseReminderTime } from "@/lib/utils/dateUtils";

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const dynamic = "force-dynamic";

async function sendWhatsAppMessage(to: string, body: string) {
  if (!body || body.trim() === '') {
    console.error('Attempted to send empty message');
    return;
  }

  try {
    await twilioClient.messages.create({
      body: body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: `whatsapp:${to}`,
    });
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    throw error;
  }
}

const HELP_MESSAGE = `👋 Hi! I can help you set reminders. Here are some examples:

With specific tasks:
✅ "Remind me to call John in 5 minutes"
✅ "Remind me to take medicine at 2:30 pm"
✅ "Daily reminder to drink water at 10am"

Without specific tasks:
✅ "Set a reminder at 2:30 pm"
✅ "Set a reminder in 5 minutes"
✅ "Daily reminder at 9am"

You can use these time formats:
• in X minutes/hours
• at HH:MM (24-hour)
• at H:MM am/pm (12-hour)
• tomorrow at H:MM
• daily/weekly at H:MM`;

export async function POST(req: Request) {
  try {
    console.log("Received webhook request");

    let messageBody: string = "";
    let from: string = "";

    // Check content type and parse accordingly
    const contentType = req.headers.get("content-type");
    console.log("Content-Type:", contentType);

    if (contentType?.includes("application/json")) {
      const data = await req.json();
      messageBody = data.Body || "";
      from = (data.From || "").replace("whatsapp:", "");
    } else if (contentType?.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      messageBody = formData.get("Body")?.toString() || "";
      from = (formData.get("From")?.toString() || "").replace("whatsapp:", "");
    } else {
      console.error("Unsupported content type:", contentType);
      return NextResponse.json(
        { error: "Unsupported content type" },
        { status: 400 }
      );
    }

    console.log("Parsed message:", { messageBody, from });

    if (!messageBody || !from) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    messageBody = messageBody.toLowerCase();

    // Store the incoming message
    await prisma.contentItem.create({
      data: {
        type: "incoming_message",
        content: messageBody,
        user_id: from,
      },
    });

    // Process the message with Gemini
    const currentTime = new Date();
    const prompt = `
      You are a helpful AI assistant processing WhatsApp messages for a reminder app.
      The current time is: ${currentTime.toISOString()}

      Analyze this message: "${messageBody}"

      Rules for reminder detection:
      1. Message must include a time reference
      2. Task is optional - if no specific task is mentioned, it's still a valid reminder
      3. Calculate the exact reminder time based on the current time above
      4. Support these time formats:
         - Relative: "in X minutes/hours", "after X minutes/hours", "X minutes/hours from now"
         - Today: "at HH:MM" or "at H:MM am/pm"
         - Tomorrow: "tomorrow at HH:MM" or "tomorrow at H:MM am/pm"
         - Specific date: "on DD/MM at HH:MM" or "on DD/MM/YYYY at HH:MM"
         - Recurring: "daily/weekly at HH:MM"

      Format your response as a JSON object with these fields:
      {
        "isReminder": boolean,
        "title": string (the task/action if specified, or "⏰ Reminder" if no specific task),
        "description": string or null,
        "calculatedTime": string (ISO date string of when the reminder should trigger),
        "recurrence": string or null (only "daily" or "weekly")
      }

      Example responses:
      For "remind me after a minute to go for a walk":
      {
        "isReminder": true,
        "title": "go for a walk",
        "description": null,
        "calculatedTime": "2025-01-10T18:27:40+05:30",
        "recurrence": null
      }

      For "set a reminder at 7pm":
      {
        "isReminder": true,
        "title": "⏰ Reminder",
        "description": null,
        "calculatedTime": "2025-01-10T19:00:00+05:30",
        "recurrence": null
      }

      For "daily reminder at 9am to take medicine":
      {
        "isReminder": true,
        "title": "take medicine",
        "description": null,
        "calculatedTime": "2025-01-11T09:00:00+05:30",
        "recurrence": "daily"
      }

      IMPORTANT: Return ONLY the JSON object, without any markdown formatting or code blocks.
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    console.log("Raw Gemini response:", text);

    try {
      // Clean up the response by removing markdown code blocks and any extra whitespace
      const cleanedText = text
        .replace(/```json\n?/g, '')  // Remove ```json
        .replace(/```\n?/g, '')      // Remove closing ```
        .trim();                     // Remove extra whitespace
      
      console.log("Cleaned response:", cleanedText);
      const parsed = JSON.parse(cleanedText);

      if (parsed.isReminder && parsed.calculatedTime) {
        const reminderDate = new Date(parsed.calculatedTime);
        
        // Validate the parsed date
        if (isNaN(reminderDate.getTime())) {
          await sendWhatsAppMessage(
            from,
            "Sorry, I had trouble understanding the time. Please try again with a different format."
          );
          return NextResponse.json({ success: true });
        }

        // Check if the time is in the past
        if (reminderDate.getTime() <= Date.now()) {
          await sendWhatsAppMessage(
            from,
            "Sorry, I can't set a reminder for a time that's already passed. Please choose a future time."
          );
          return NextResponse.json({ success: true });
        }

        const reminderData = {
          title: parsed.title || "⏰ Reminder",
          description: parsed.description || "",
          due_date: reminderDate,
          user_id: from,
          status: "pending",
          recurrence_type: parsed.recurrence || "none",
          recurrence_days: [] as number[],
          recurrence_time: reminderDate.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          }),
          last_sent: null
        };

        if (parsed.recurrence === "daily" || parsed.recurrence === "weekly") {
          reminderData.status = "active";
          if (parsed.recurrence === "weekly") {
            reminderData.recurrence_days = [reminderDate.getDay()];
          }
        }

        console.log("Creating reminder with data:", JSON.stringify(reminderData, null, 2));

        try {
          const reminder = await prisma.reminder.create({
            data: reminderData
          });

          const confirmationMessage = `✅ Reminder set!\n\n${
            reminderData.title.startsWith("⏰") ? "" : "📝 "
          }${reminderData.title}\n⏰ ${reminderDate.toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })}${
            parsed.description ? `\n📋 ${parsed.description}` : ""
          }${
            parsed.recurrence
              ? `\n🔄 Repeats: ${parsed.recurrence}`
              : ""
          }`;

          await sendWhatsAppMessage(from, confirmationMessage);

          await prisma.contentItem.create({
            data: {
              type: "confirmation",
              content: confirmationMessage,
              user_id: from,
            },
          });
        } catch (error) {
          console.error("Error creating reminder:", error);
          await sendWhatsAppMessage(
            from,
            "Sorry, I encountered an error while setting your reminder. Please try again."
          );
          throw error;
        }
      } else if (parsed.calculatedTime) {
        // If there's a time but parsing failed for some other reason
        await sendWhatsAppMessage(
          from,
          "I couldn't process your reminder. Please try using one of these formats:\n\n" +
          "✅ Set a reminder at 2:30 pm\n" +
          "✅ Remind me to call John at 3pm\n" +
          "✅ Daily reminder at 9am"
        );
      } else {
        // General help message
        await sendWhatsAppMessage(from, HELP_MESSAGE);

        await prisma.contentItem.create({
          data: {
            type: "help_message",
            content: HELP_MESSAGE,
            user_id: from,
          },
        });
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Error parsing Gemini response:", error);
      const errorMessage = "Sorry, I couldn't process your request. Please try again with a different format.";
      await sendWhatsAppMessage(from, errorMessage);
      
      return NextResponse.json(
        { error: "Failed to process reminder" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
