import { prisma } from './db';

// Define the structure for a conversation message
interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Define the structure for conversation context
interface ConversationContextData {
  messages: ConversationMessage[];
  partialData?: any;
  expiresAt: Date;
}

// In-memory cache for conversation contexts
const conversationContexts: Map<string, ConversationContextData> = new Map();

// Set expiration time for conversation contexts (30 minutes)
const CONTEXT_EXPIRATION_MS = 30 * 60 * 1000;

/**
 * Get the conversation context for a user
 * @param userId The user ID
 * @returns The conversation context
 */
export async function getConversationContext(userId: string): Promise<ConversationContextData> {
  // Check if we have the context in memory
  if (conversationContexts.has(userId)) {
    const context = conversationContexts.get(userId)!;
    
    // Check if the context has expired
    if (context.expiresAt > new Date()) {
      return context;
    }
    
    // Context has expired, remove it from memory
    conversationContexts.delete(userId);
  }
  
  // Try to get the context from the database
  const dbContext = await prisma.conversationContext.findUnique({
    where: { userId }
  });
  
  if (dbContext && dbContext.expiresAt > new Date()) {
    // Parse the messages and partial data
    const messages = dbContext.messages as ConversationMessage[];
    const partialData = dbContext.partialData ? JSON.parse(dbContext.partialData as string) : undefined;
    
    // Create the context
    const context: ConversationContextData = {
      messages,
      partialData,
      expiresAt: dbContext.expiresAt
    };
    
    // Store the context in memory
    conversationContexts.set(userId, context);
    
    return context;
  }
  
  // No valid context found, create a new one
  const newContext: ConversationContextData = {
    messages: [],
    expiresAt: new Date(Date.now() + CONTEXT_EXPIRATION_MS)
  };
  
  // Store the new context in memory
  conversationContexts.set(userId, newContext);
  
  return newContext;
}

/**
 * Add a message to the conversation context
 * @param userId The user ID
 * @param content The message content
 * @param role The role of the message sender
 */
export async function addMessageToContext(userId: string, content: string, role: 'user' | 'assistant'): Promise<void> {
  // Get the current context
  const context = await getConversationContext(userId);
  
  // Add the message
  context.messages.push({
    role,
    content,
    timestamp: new Date()
  });
  
  // Limit the number of messages to 10 (keep the conversation focused)
  if (context.messages.length > 10) {
    context.messages = context.messages.slice(-10);
  }
  
  // Reset the expiration time
  context.expiresAt = new Date(Date.now() + CONTEXT_EXPIRATION_MS);
  
  // Update the context in memory
  conversationContexts.set(userId, context);
  
  // Update the context in the database
  await prisma.conversationContext.upsert({
    where: { userId },
    update: {
      messages: context.messages,
      partialData: context.partialData ? JSON.stringify(context.partialData) : null,
      expiresAt: context.expiresAt
    },
    create: {
      userId,
      messages: context.messages,
      partialData: context.partialData ? JSON.stringify(context.partialData) : null,
      expiresAt: context.expiresAt
    }
  });
}

/**
 * Update the partial data in the conversation context
 * @param userId The user ID
 * @param partialData The partial data
 */
export async function updatePartialData(userId: string, partialData: any): Promise<void> {
  // Get the current context
  const context = await getConversationContext(userId);
  
  // Update the partial data
  context.partialData = partialData;
  
  // Reset the expiration time
  context.expiresAt = new Date(Date.now() + CONTEXT_EXPIRATION_MS);
  
  // Update the context in memory
  conversationContexts.set(userId, context);
  
  // Update the context in the database
  await prisma.conversationContext.upsert({
    where: { userId },
    update: {
      partialData: JSON.stringify(partialData),
      expiresAt: context.expiresAt
    },
    create: {
      userId,
      messages: context.messages,
      partialData: JSON.stringify(partialData),
      expiresAt: context.expiresAt
    }
  });
}

/**
 * Clear the conversation context for a user
 * @param userId The user ID
 */
export async function clearConversationContext(userId: string): Promise<void> {
  // Remove the context from memory
  conversationContexts.delete(userId);
  
  // Remove the context from the database
  await prisma.conversationContext.delete({
    where: { userId }
  }).catch(() => {
    // Ignore errors if the context doesn't exist
  });
}

/**
 * Get the conversation history as a formatted string
 * @param userId The user ID
 * @returns The conversation history
 */
export async function getFormattedConversationHistory(userId: string): Promise<string> {
  const context = await getConversationContext(userId);
  
  if (context.messages.length === 0) {
    return "No previous messages.";
  }
  
  return context.messages
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');
}
