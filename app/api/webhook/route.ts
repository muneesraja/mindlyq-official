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
    console.log("Webhook API called");
    
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
      console.error("Invalid request: Missing message or userId");
      return new Response(
        "<?xml version='1.0' encoding='UTF-8'?><Response><Message>Invalid request: Missing message or user ID</Message></Response>",
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
    let result;
    try {
      result = await agentManager.processMessage(message, userId);
      console.log("Agent manager result:", JSON.stringify(result, null, 2));
    } catch (processError) {
      console.error("Error processing message with agent manager:", processError);
      return new Response(
        "<?xml version='1.0' encoding='UTF-8'?><Response><Message>Error processing your request. Please try again.</Message></Response>",
        {
          status: 500,
          headers: {
            "Content-Type": "application/xml",
          },
        }
      );
    }

    // Ensure we have a non-empty response message
    let responseMessage = result?.message || "I'm here to help with your reminders. What would you like me to do?";
    
    // Check if we have formatted output from the ReminderListingAgent
    if (result?.formattedOutput) {
      console.log("Using formatted output from ReminderListingAgent");
      
      // Construct a nicely formatted message using the structured output
      const formattedOutput = result.formattedOutput;
      
      // Build the formatted message
      let formattedMessage = '';
      
      // Add header
      formattedMessage += `${formattedOutput.header}\n\n`;
      
      // Add reminders
      formattedMessage += formattedOutput.reminders.join('\n');
      
      // Add pagination info
      formattedMessage += `\n\n${formattedOutput.pagination}`;
      
      // Add pagination instructions if present in the original message
      if (responseMessage.includes("Say 'show next page'")) {
        formattedMessage += "\n\nSay 'show next page' or 'next' to see more reminders.";
      }
      
      // Add tips
      formattedOutput.tips.forEach(tip => {
        formattedMessage += `\n• ${tip}`;
      });
      
      // Use the formatted message
      responseMessage = formattedMessage;
    }
    
    // Add query context info if available
    if (result?.queryContext && process.env.DEBUG_MODE === 'true') {
      console.log("Query context:", JSON.stringify(result.queryContext, null, 2));
    }

    console.log("Sending response:", responseMessage);

    try {
      // Twilio has a 1600 character limit for WhatsApp messages
      // Split long messages if needed
      const MAX_MESSAGE_LENGTH = 1500; // Using 1500 to be safe
      
      // Use the agent manager's splitLongMessage function
      const messageParts = agentManager.splitLongMessage(responseMessage, MAX_MESSAGE_LENGTH);
      
      if (messageParts.length === 1) {
        // Ensure 'from' has the 'whatsapp:' prefix
        const toNumber = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`;
        
        // Message is within limits, send as is
        console.log("Sending single message:", {
          to: toNumber,
          from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
          body: responseMessage
        });

        // Send response back to user via Twilio
        const twilioResponse = await twilioClient.messages.create({
          body: responseMessage,
          from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
          to: toNumber,
        });
        
        console.log("Twilio response sent:", twilioResponse.sid);
      } else {
        // Message is too long, send multiple parts
        console.log(`Splitting message into ${messageParts.length} parts`);
        
        for (let i = 0; i < messageParts.length; i++) {
          const part = messageParts[i];
          const partNumber = messageParts.length > 1 ? ` (${i+1}/${messageParts.length})` : '';
          
          console.log(`Sending part ${i+1} of ${messageParts.length}`);
          
          // Ensure 'from' has the 'whatsapp:' prefix
          const toNumber = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`;
          
          const twilioResponse = await twilioClient.messages.create({
            body: part + partNumber,
            from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
            to: toNumber,
          });
          
          console.log(`Part ${i+1} sent, SID:`, twilioResponse.sid);
          
          // Add a small delay between messages to ensure order
          if (i < messageParts.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
    } catch (sendError) {
      console.error("Error sending WhatsApp message:", sendError);
      return new Response(
        "<?xml version='1.0' encoding='UTF-8'?><Response><Message>Error sending response message. Please try again.</Message></Response>",
        {
          status: 500,
          headers: {
            "Content-Type": "application/xml",
          },
        }
      );
    }

    // Return a proper TwiML response to Twilio
    return new Response(
      `<?xml version='1.0' encoding='UTF-8'?><Response></Response>`,
      {
        headers: {
          "Content-Type": "application/xml",
        },
      }
    );
  } catch (error) {
    console.error("Unhandled error in webhook:", error);
    
    // Return a detailed TwiML response for error tracking
    return new Response(
      `<?xml version='1.0' encoding='UTF-8'?><Response><Message>Sorry, an unexpected error occurred. Our team has been notified.</Message></Response>`,
      {
        status: 500,
        headers: {
          "Content-Type": "application/xml",
        },
      }
    );
  }
}
