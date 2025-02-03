// In-memory conversation state manager
const conversationStates = new Map<string, {
  data: {
    title?: string;
    date?: Date;
    time?: string;
    lastUpdate: Date;
  },
  messages: { role: 'user' | 'assistant', content: string }[]
}>();

// Clean up expired conversations every 5 minutes
setInterval(() => {
  const now = new Date();
  for (const [userId, state] of conversationStates.entries()) {
    if (now.getTime() - state.data.lastUpdate.getTime() > 5 * 60 * 1000) {
      conversationStates.delete(userId);
    }
  }
}, 5 * 60 * 1000);

export function updateConversationState(userId: string, message: string, role: 'user' | 'assistant') {
  let state = conversationStates.get(userId);
  
  if (!state) {
    state = {
      data: { lastUpdate: new Date() },
      messages: []
    };
    conversationStates.set(userId, state);
  }

  // Update last activity
  state.data.lastUpdate = new Date();
  
  // Add message to history, keep last 5 messages
  state.messages.push({ role, content: message });
  if (state.messages.length > 5) {
    state.messages.shift();
  }
  
  return state;
}

export function getConversationState(userId: string) {
  return conversationStates.get(userId) || {
    data: { lastUpdate: new Date() },
    messages: []
  };
}

export function updateReminderData(userId: string, updates: {
  title?: string;
  date?: Date;
  time?: string;
}) {
  let state = conversationStates.get(userId);
  
  if (!state) {
    state = {
      data: { lastUpdate: new Date() },
      messages: []
    };
    conversationStates.set(userId, state);
  }

  // Update the data
  state.data = {
    ...state.data,
    ...updates
  };

  return state.data;
}

export function clearConversationState(userId: string) {
  conversationStates.delete(userId);
}
