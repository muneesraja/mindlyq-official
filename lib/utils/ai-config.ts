/**
 * AI Model Configuration
 * 
 * This file centralizes all AI model configurations to make it easier
 * to switch between different models globally.
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Initialize the Google Generative AI client
export const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

// Model configurations with fallbacks to default values
export const GEMINI_MODELS = {
  // Fast model for intent detection and simple tasks
  FLASH: process.env.GEMINI_FLASH_MODEL || process.env.GEMINI_MODEL || "gemini-2.0-flash-exp",
  
  // Pro model for complex reasoning and detailed responses
  PRO: process.env.GEMINI_PRO_MODEL || process.env.GEMINI_MODEL || "gemini-2.0-pro-exp",
  
  // Model optimized for structured data queries
  QUERY: process.env.GEMINI_QUERY_MODEL || process.env.GEMINI_MODEL || "gemini-1.5-pro"
};

/**
 * Get the appropriate model based on the task type
 * @param taskType - The type of task being performed
 * @returns The appropriate model name
 */
/**
 * Default safety settings for all AI model calls
 * These settings are permissive to allow the AI to respond to a wide range of inputs
 */
export const DEFAULT_SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

/**
 * Default generation config for AI model calls
 */
export const DEFAULT_GENERATION_CONFIG = {
  temperature: 0.2,
  topK: 32,
  topP: 0.95,
  maxOutputTokens: 1024,
};

/**
 * Get the appropriate model based on the task type
 * @param taskType - The type of task being performed
 * @returns The appropriate model name
 */
export function getModelForTask(taskType: 'intent' | 'creation' | 'query' | 'chat' | 'modification' | 'deletion' | 'timezone' | 'dateParser'): string {
  switch (taskType) {
    case 'intent':
    case 'creation':
    case 'timezone':
    case 'dateParser':
      return GEMINI_MODELS.FLASH;
    
    case 'query':
      return GEMINI_MODELS.FLASH;
    
    case 'chat':
    case 'modification':
    case 'deletion':
      return GEMINI_MODELS.PRO;
    
    default:
      return GEMINI_MODELS.FLASH;
  }
}
