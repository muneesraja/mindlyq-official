import { NextResponse } from "next/server";
import twilio from "twilio";
import { AgentManager } from "@/lib/agents/agent-manager";

// Initialize Twilio client for sending responses
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const dynamic = "force-dynamic";

// Initialize the agent manager
const agentManager = new AgentManager();

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

    // Process the message using our agent manager
    console.log(`Processing message from ${userId}: "${message}"`);
    const result = await agentManager.processMessage(message, userId);

    // Ensure we have a non-empty response message
    const responseMessage = result.message || "I'm here to help with your reminders. What would you like me to do?";

    console.log("Sending response:", responseMessage);

    try {
      // Twilio has a 1600 character limit for WhatsApp messages
      // Split long messages if needed
      const MAX_MESSAGE_LENGTH = 1500; // Using 1500 to be safe
      
      // Use the agent manager's splitLongMessage function
      const messageParts = agentManager.splitLongMessage(responseMessage, MAX_MESSAGE_LENGTH);
      
      if (messageParts.length === 1) {
        // Message is within limits, send as is
        console.log("Sending single message:", {
          to: from,
          from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
          body: responseMessage
        });

        // Send response back to user via Twilio
        const twilioResponse = await twilioClient.messages.create({
          body: responseMessage,
          from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
          to: from,
        });
        
        console.log("Twilio response sent:", twilioResponse.sid);
      } else {
        // Message is too long, send multiple parts
        console.log(`Splitting message into ${messageParts.length} parts`);
        
        for (let i = 0; i < messageParts.length; i++) {
          const part = messageParts[i];
          const partNumber = messageParts.length > 1 ? ` (${i+1}/${messageParts.length})` : '';
          
          console.log(`Sending part ${i+1} of ${messageParts.length}`);
          
          const twilioResponse = await twilioClient.messages.create({
            body: part + partNumber,
            from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
            to: from,
          });
          
          console.log(`Part ${i+1} sent, SID:`, twilioResponse.sid);
          
          // Add a small delay between messages to ensure order
          if (i < messageParts.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      // We don't need to fetch message status anymore since we're handling
      // multiple messages and have already logged the SIDs
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
