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

    console.log("Sending response:", result.message);

    try {
      // Log the exact values being used
      console.log("Sending with:", {
        to: from,
        from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
        body: result.message
      });

      // Send response back to user via Twilio
      const twilioResponse = await twilioClient.messages.create({
        body: result.message,
        from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
        to: from,
      });

      console.log("Twilio response sent:", twilioResponse.sid);
      
      // Fetch and log the message status
      const messageStatus = await twilioClient.messages(twilioResponse.sid).fetch();
      console.log("Message status:", {
        sid: messageStatus.sid,
        status: messageStatus.status,
        errorCode: messageStatus.errorCode,
        errorMessage: messageStatus.errorMessage,
        direction: messageStatus.direction,
        from: messageStatus.from,
        to: messageStatus.to
      });
    } catch (sendError) {
      console.error("Error sending WhatsApp message:", sendError);
    }

    // Return a success response to Twilio
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
