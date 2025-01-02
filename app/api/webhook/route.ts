import { NextResponse } from "next/server";
import twilio from "twilio";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "@/lib/supabase";
import { parseReminderTime } from "@/lib/utils/dateUtils";

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Mark this route as dynamic
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // Log incoming request
    console.log("Received Twilio webhook request");

    let message: string = "";
    let from: string = "";

    const contentType = req.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      const body = await req.json();
      message = body.Body || "";
      from = (body.From || "").replace("whatsapp:", "");
    } else if (
      contentType?.includes("application/x-www-form-urlencoded") ||
      contentType?.includes("multipart/form-data")
    ) {
      const formData = await req.formData();
      message = formData.get("Body")?.toString() || "";
      from = (formData.get("From")?.toString() || "").replace("whatsapp:", "");
    } else {
      console.error("Unsupported content type:", contentType);
      return NextResponse.json(
        { error: "Unsupported content type" },
        { status: 400 }
      );
    }

    console.log("Message received:", { from, message, contentType });

    if (!message || !from) {
      console.error("Missing required fields:", { message, from });
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Process the message with Gemini
    const prompt = `You are MindlyQ, a WhatsApp bot that helps users manage reminders and organize content. 
    Analyze the following user message and categorize it appropriately.

    IMPORTANT: You must respond ONLY with a valid JSON object, nothing else.
    
    The JSON must follow this format for reminders:
    {
      "type": "reminder",
      "title": "brief descriptive title",
      "description": "full message content",
      "original_message": "exact user message"
    }

    For content:
    {
      "type": "content",
      "title": "brief title",
      "description": "detailed description",
      "contentType": "url|text|image",
      "content": "actual content"
    }

    For queries:
    {
      "type": "query"
    }

    Example responses:
    1. For "Remind me to call John tomorrow at 2pm":
    {
      "type": "reminder",
      "title": "Call John",
      "description": "Phone call with John tomorrow at 2pm",
      "original_message": "Remind me to call John tomorrow at 2pm"
    }

    2. For "remind me everyday to go for a walk at 5 AM":
    {
      "type": "reminder",
      "title": "Daily Walk",
      "description": "Go for a walk",
      "original_message": "remind me everyday to go for a walk at 5 AM"
    }

    User message: "${message}"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiResponse = response.text().trim();
    console.log("Gemini Response:", aiResponse);

    let parsedResponse;
    try {
      // Remove any markdown code block markers if present
      const cleanJson = aiResponse.replace(/```json\n?|\n?```/g, "").trim();
      parsedResponse = JSON.parse(cleanJson);
    } catch (e) {
      console.error(
        "Failed to parse Gemini response:",
        e,
        "Raw response:",
        aiResponse
      );
      parsedResponse = {
        type: "error",
        message: "I had trouble understanding that. Could you please rephrase?",
      };
    }

    // Handle different types of requests
    let responseMessage = "";

    switch (parsedResponse.type) {
      case "reminder": {
        // Parse the reminder time from the original message
        const reminderTime = parseReminderTime(parsedResponse.original_message);
        console.log("Parsed reminder time:", reminderTime);

        if (reminderTime.needs_time_clarification) {
          responseMessage = "What time would you like to set this reminder for?";
          break;
        }

        if (reminderTime.error_message) {
          responseMessage = reminderTime.error_message;
          break;
        }

        if (!reminderTime.due_date) {
          console.error("Failed to parse time from message:", parsedResponse.original_message);
          responseMessage = "I couldn't understand when you want to be reminded. Please try saying something like 'in 5 minutes' or 'tomorrow at 2pm'.";
          break;
        }

        // Save reminder to database
        try {
          const reminderData: any = {
            title: parsedResponse.title,
            description: parsedResponse.description,
            due_date: reminderTime.due_date.toISOString(),
            user_id: from,
            status: 'active'
          };

          // Only add recurrence fields if they have values
          if (reminderTime.recurrence_type && reminderTime.recurrence_type !== 'none') {
            reminderData.recurrence_type = reminderTime.recurrence_type;
            if (reminderTime.recurrence_days?.length) {
              reminderData.recurrence_days = reminderTime.recurrence_days;
            }
            if (reminderTime.recurrence_time) {
              reminderData.recurrence_time = reminderTime.recurrence_time;
            }
          }

          console.log("Saving reminder with data:", reminderData);

          const { data: reminder, error: reminderError } = await supabase
            .from("reminders")
            .insert(reminderData)
            .select()
            .single();

          if (reminderError) {
            console.error("Failed to save reminder:", reminderError);
            responseMessage = "Sorry, I couldn't save your reminder. Please try again.";
          } else {
            if (reminderTime.recurrence_type === 'daily') {
              responseMessage = `✅ Daily reminder set: "${parsedResponse.title}" at ${reminderTime.recurrence_time}`;
            } else if (reminderTime.recurrence_type === 'weekly') {
              const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
              const dayNames = reminderTime.recurrence_days?.map(d => days[d]).join(', ');
              responseMessage = `✅ Weekly reminder set: "${parsedResponse.title}" every ${dayNames} at ${reminderTime.recurrence_time}`;
            } else {
              const formattedTime = reminderTime.due_date.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: 'numeric',
                hour12: true 
              });
              responseMessage = `✅ Reminder "${parsedResponse.title}" set for ${formattedTime}`;
            }
          }
        } catch (error) {
          console.error("Error saving reminder:", error);
          responseMessage = "Sorry, something went wrong while saving your reminder. Please try again.";
        }
        break;
      }
      case "content":
        // Save content to database
        const { data: content, error: contentError } = await supabase
          .from("content_items")
          .insert({
            type: parsedResponse.contentType,
            content: parsedResponse.content,
            user_id: from,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (contentError) {
          console.error("Failed to save content:", contentError);
          responseMessage =
            "Sorry, I could not save your content. Please try again.";
        } else {
          responseMessage =
            "Content saved successfully! Would you like to categorize it?";
        }
        break;

      case "query":
        responseMessage = `Hello! I'm MindlyQ, your personal WhatsApp assistant. I can help you with:
1. Setting reminders (e.g., "Remind me to call John tomorrow at 2pm")
2. Saving content (e.g., "Save this article: https://mindlyq.com")
3. Managing categories (e.g., "Create category Work")

How can I help you today?`;
        break;

      default:
        responseMessage =
          "I'm not sure how to help with that. Try asking me to set a reminder or save some content!";
    }

    console.log("Sending response:", responseMessage);

    // Send response back to WhatsApp
    await twilioClient.messages.create({
      body: responseMessage,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: `whatsapp:${from}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
