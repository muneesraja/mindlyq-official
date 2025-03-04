/**
 * Interface for conversation message
 */
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

/**
 * Interface for conversation state
 */
export interface ConversationState {
  history: ConversationMessage[];
  reminder_data?: {
    title?: string;
    date?: string;
    time?: string;
    isRecurring?: boolean;
    recurrenceType?: string;
    recurrenceDays?: number[];
    recurrenceTime?: string;
    [key: string]: any;
  };
  last_updated: Date;
}

// In-memory conversation state storage
const conversationStates = new Map<string, ConversationState>();

// Clean up expired conversations every 30 minutes
const CONVERSATION_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

setInterval(() => {
  const now = new Date();
  for (const [userId, state] of conversationStates.entries()) {
    if (now.getTime() - state.last_updated.getTime() > CONVERSATION_EXPIRY_MS) {
      console.log(`Cleaning up expired conversation for user ${userId}`);
      conversationStates.delete(userId);
    }
  }
}, 5 * 60 * 1000); // Run cleanup every 5 minutes

/**
 * Get the conversation state for a user
 * @param userId The user's ID
 * @returns The conversation state or undefined if not found
 */
export function getConversationState(userId: string): ConversationState | undefined {
  return conversationStates.get(userId);
}

/**
 * Update the conversation state with a new message
 * @param userId The user's ID
 * @param message The message to add
 * @returns The updated conversation state
 */
export function updateConversationState(userId: string, message: ConversationMessage): ConversationState {
  let state = conversationStates.get(userId);
  
  if (!state) {
    state = {
      history: [],
      last_updated: new Date()
    };
    conversationStates.set(userId, state);
  }

  // Add timestamp if not provided
  if (!message.timestamp) {
    message.timestamp = new Date();
  }

  // Update last activity
  state.last_updated = new Date();
  
  // Add message to history, keep last 10 messages
  state.history.push(message);
  if (state.history.length > 10) {
    state.history.shift();
  }
  
  return state;
}

/**
 * Update reminder data in the conversation state
 * @param userId The user's ID
 * @param updates The data to update
 * @returns The updated reminder data
 */
export function updateReminderData(userId: string, updates: any): any {
  let state = conversationStates.get(userId);
  
  if (!state) {
    state = {
      history: [],
      reminder_data: {},
      last_updated: new Date()
    };
    conversationStates.set(userId, state);
  }

  // Initialize reminder_data if it doesn't exist
  if (!state.reminder_data) {
    state.reminder_data = {};
  }

  // Update the data
  state.reminder_data = {
    ...state.reminder_data,
    ...updates
  };

  // Update last activity
  state.last_updated = new Date();

  return state.reminder_data;
}

/**
 * Clear the conversation state for a user
 * @param userId The user's ID
 */
export function clearConversationState(userId: string): void {
  conversationStates.delete(userId);
}
