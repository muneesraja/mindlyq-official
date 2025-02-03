import { prisma } from './db';
import { Prisma } from '@prisma/client';

// Define a type that matches Prisma's JSON structure
type MessageJSON = {
  [key: string]: string | Date;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

interface Message extends MessageJSON {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface PartialReminderData {
  title?: string;
  date?: string;
  time?: string;
  recurrence?: {
    type: 'none' | 'daily' | 'weekly';
    days?: number[];
  };
}

export async function getOrCreateContext(userId: string): Promise<string> {
  // Clean up expired contexts

  await prisma.conversationContext.deleteMany({
    where: {
      expiresAt: {
        lt: new Date()
      }
    }
  });

  // Find existing active context
  const existingContext = await prisma.conversationContext.findFirst({
    where: {
      userId,
      expiresAt: {
        gt: new Date()
      }
    }
  });

  if (existingContext) {
    // Update expiry
    const newExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
    await prisma.conversationContext.update({
      where: { id: existingContext.id },
      data: { expiresAt: newExpiry }
    });
    return existingContext.id;
  }

  // Create new context
  const newContext = await prisma.conversationContext.create({
    data: {
      userId,
      messages: [],
      partialData: {},
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    }
  });

  return newContext.id;
}

export async function addMessage(contextId: string, role: 'user' | 'assistant', content: string) {
  const context = await prisma.conversationContext.findUnique({
    where: { id: contextId }
  });

  if (!context) throw new Error('Context not found');

  // Safely cast the messages array
  const messages = (context.messages as any[]).map(msg => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content as string,
    timestamp: new Date(msg.timestamp)
  })) as Message[];

  messages.push({
    role,
    content,
    timestamp: new Date()
  } as MessageJSON);

  // Keep only last 5 messages
  const recentMessages = messages.slice(-5);

  await prisma.conversationContext.update({
    where: { id: contextId },
    data: {
      messages: recentMessages as unknown as Prisma.InputJsonValue[],
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    }
  });

  return recentMessages;
}

export async function updatePartialData(contextId: string, data: Partial<PartialReminderData>) {
  const context = await prisma.conversationContext.findUnique({
    where: { id: contextId }
  });

  if (!context) throw new Error('Context not found');

  const currentData = context.partialData as PartialReminderData || {};
  const updatedData = { ...currentData, ...data };

  await prisma.conversationContext.update({
    where: { id: contextId },
    data: {
      partialData: updatedData,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    }
  });

  return updatedData;
}

export async function getContext(contextId: string) {
  const context = await prisma.conversationContext.findUnique({
    where: { id: contextId }
  });

  if (!context) throw new Error('Context not found');

  // Safely cast the messages array
  const messages = (context.messages as any[]).map(msg => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content as string,
    timestamp: new Date(msg.timestamp)
  })) as Message[];

  return {
    messages,
    partialData: context.partialData as PartialReminderData
  };
}

export async function clearContext(contextId: string) {
  await prisma.conversationContext.delete({
    where: { id: contextId }
  });
}
