import { NextResponse } from "next/server";
import twilio from "twilio";
import { parseAndCreateReminder } from "@/lib/reminder-parser";

// Initialize Twilio client for sending responses
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // Parse the incoming form data from Twilio
    const formData = await req.formData();
    
    // Extract message details from Twilio's webhook
    const message = formData.get("Body")?.toString() || "";
    const from = formData.get("From")?.toString() || "";
    
    // Clean up the phone number (remove 'whatsapp:' prefix)
    const userId = from.replace("whatsapp:", "");

    console.log("Received message:", {
      message,
      from,
      userId,
    });

    if (!message || !userId) {
      return new Response(
        "<?xml version='1.0' encoding='UTF-8'?><Response><Message>Invalid request</Message></Response>",
        {
          status: 400,
          headers: {
            "Content-Type": "application/xml",
          },
        }
      );
    }

    // Process the message using our reminder parser
    const result = await parseAndCreateReminder(message, userId);

    // Send response back to user via Twilio
    await twilioClient.messages.create({
      body: result.message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: from,
    });

    // Return TwiML response
    return new Response(
      `<?xml version='1.0' encoding='UTF-8'?><Response></Response>`,
      {
        headers: {
          "Content-Type": "application/xml",
        },
      }
    );
  } catch (error) {
    console.error("Error in webhook:", error);
    
    // Return a TwiML response even in case of error
    return new Response(
      "<?xml version='1.0' encoding='UTF-8'?><Response><Message>Sorry, something went wrong. Please try again.</Message></Response>",
      {
        status: 500,
        headers: {
          "Content-Type": "application/xml",
        },
      }
    );
  }
}
