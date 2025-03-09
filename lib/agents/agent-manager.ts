import { Agent, AgentResponse, IntentType } from "./agent-interface";
import { IntentDetectionAgent } from "./intent-detection-agent";
import { ReminderCreationAgent } from "./reminder-creation-agent";
import { BulkReminderCreationAgent } from "./bulk-reminder-creation-agent";
import { ReminderListingAgent } from "./reminder-listing-agent";
import { ReminderModificationAgent } from "./reminder-modification-agent";
import { ReminderDeletionAgent } from "./reminder-deletion-agent";
import { ChatAgent } from "./chat-agent";
import { TimezoneAgent } from "./timezone-agent";
import { updateConversationState } from "../conversation-state";

/**
 * Manager class that orchestrates all agents
 */
export class AgentManager {
  private intentDetectionAgent: IntentDetectionAgent;
  private reminderCreationAgent: ReminderCreationAgent;
  private bulkReminderCreationAgent: BulkReminderCreationAgent;
  private reminderListingAgent: ReminderListingAgent;
  private reminderModificationAgent: ReminderModificationAgent;
  private reminderDeletionAgent: ReminderDeletionAgent;
  private timezoneAgent: TimezoneAgent;
  private chatAgent: ChatAgent;
  
  constructor() {
    this.intentDetectionAgent = new IntentDetectionAgent();
    this.reminderCreationAgent = new ReminderCreationAgent();
    this.bulkReminderCreationAgent = new BulkReminderCreationAgent();
    this.reminderListingAgent = new ReminderListingAgent();
    this.reminderModificationAgent = new ReminderModificationAgent();
    this.reminderDeletionAgent = new ReminderDeletionAgent();
    this.timezoneAgent = new TimezoneAgent();
    this.chatAgent = new ChatAgent();
  }
  
  /**
   * Process a user message by detecting intent and routing to the appropriate agent
   * @param message The user's message
   * @param userId The user's ID
   * @returns A response from the appropriate agent
   */
  async processMessage(message: string, userId: string): Promise<AgentResponse> {
    try {
      console.log(`Processing message from user ${userId}: "${message}"`);
      
      // Update conversation history with user message
      await updateConversationState(userId, {
        role: 'user',
        content: message
      });
      
      // First, detect the intent
      console.log("Detecting intent...");
      const intentResult = await this.intentDetectionAgent.process(message, userId);
      
      if (!intentResult.success || !intentResult.data) {
        console.error("Intent detection failed:", intentResult.message);
        return {
          success: false,
          message: "I'm having trouble understanding what you want to do. Could you try rephrasing your request?"
        };
      }
      
      const intentData = intentResult.data;
      console.log(`Detected intent: ${intentData.intent} with confidence ${intentData.confidence}`);
      
      // Route to the appropriate agent based on intent
      let agentResponse: AgentResponse;
      
      switch (intentData.intent) {
        case IntentType.SET_REMINDER:
          console.log("Routing to reminder creation agent");
          agentResponse = await this.reminderCreationAgent.process(message, userId);
          break;
          
        case IntentType.BULK_REMINDER:
          console.log("Routing to bulk reminder creation agent");
          agentResponse = await this.bulkReminderCreationAgent.process(message, userId);
          break;
          
        case IntentType.LIST_REMINDERS:
          console.log("Routing to reminder listing agent");
          agentResponse = await this.reminderListingAgent.process(message, userId);
          break;
          
        case IntentType.MODIFY_REMINDER:
          console.log("Routing to reminder modification agent");
          agentResponse = await this.reminderModificationAgent.process(message, userId);
          break;
          
        case IntentType.DELETE_REMINDER:
          console.log("Routing to reminder deletion agent");
          agentResponse = await this.reminderDeletionAgent.process(message, userId);
          break;
          
        case IntentType.SET_TIMEZONE:
          console.log("Routing to timezone agent");
          agentResponse = await this.timezoneAgent.process(message, userId);
          break;
          
        case IntentType.CHAT:
        case IntentType.UNKNOWN:
        default:
          console.log("Routing to chat agent");
          agentResponse = await this.chatAgent.process(message, userId);
          break;
      }
      
      // Update conversation history with assistant response
      if (agentResponse.success) {
        await updateConversationState(userId, {
          role: 'assistant',
          content: agentResponse.message
        });
      }
      
      return agentResponse;
    } catch (error) {
      console.error("Error in agent manager:", error);
      
      return {
        success: false,
        message: "I encountered an error while processing your request. Please try again later."
      };
    }
  }
  
  /**
   * Split a long message into smaller chunks to comply with messaging platform limits
   * @param message The message to split
   * @param maxLength Maximum length for each chunk
   * @returns Array of message chunks
   */
  splitLongMessage(message: string, maxLength: number = 1500): string[] {
    // If message is already short enough, return it as is
    if (message.length <= maxLength) {
      return [message];
    }
    
    const parts: string[] = [];
    let currentPart = "";
    
    // Split the message by newlines to preserve formatting
    const lines = message.split('\n');
    
    for (const line of lines) {
      // If adding this line would exceed the max length
      if (currentPart.length + line.length + 1 > maxLength) {
        // If the current part is not empty, add it to parts
        if (currentPart.length > 0) {
          parts.push(currentPart);
          currentPart = "";
        }
        
        // If the line itself is longer than maxLength, split it
        if (line.length > maxLength) {
          let remainingLine = line;
          while (remainingLine.length > 0) {
            // Find a good breaking point (space)
            let breakPoint = maxLength;
            if (remainingLine.length > maxLength) {
              breakPoint = remainingLine.lastIndexOf(' ', maxLength);
              if (breakPoint <= 0) breakPoint = maxLength; // If no space found, just break at maxLength
            }
            
            parts.push(remainingLine.substring(0, breakPoint));
            remainingLine = remainingLine.substring(breakPoint).trim();
          }
        } else {
          // Line fits in a new part
          currentPart = line;
        }
      } else {
        // Add line to current part
        if (currentPart.length > 0) {
          currentPart += '\n';
        }
        currentPart += line;
      }
    }
    
    // Add the last part if not empty
    if (currentPart.length > 0) {
      parts.push(currentPart);
    }
    
    return parts;
  }
}
