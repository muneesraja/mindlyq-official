import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

// Define the model to use
// Note: If the API version changes, we might need to update this
// Current available models include: gemini-pro, gemini-1.5-pro, etc.
const MODEL_NAME = "gemini-1.5-pro";

/**
 * Interface for reminder query options
 */
export interface ReminderQueryOptions {
  userId: string;
  filter?: 'active' | 'completed' | 'pending' | 'all';
  sortField?: 'due_date' | 'created_at' | 'title';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  timeRange?: {
    before?: Date;
    after?: Date;
  };
  search?: string;
  formatOptions?: {
    includeTips?: boolean;
    outputFormat?: 'text' | 'json';
  };
}

/**
 * Validates query parameters to ensure they are safe
 * @param params The parameters to validate
 * @returns Validated parameters
 */
export function validateQueryParameters(params: any): ReminderQueryOptions {
  // Start with default safe values
  const validatedParams: ReminderQueryOptions = {
    userId: params.userId, // This will be overridden by the security wrapper
    filter: 'active',
    sortField: 'due_date',
    sortOrder: 'asc',
    limit: 10,
    offset: 0
  };
  
  // Validate filter (whitelist approach)
  if (params.filter && ['active', 'completed', 'pending', 'all'].includes(params.filter)) {
    validatedParams.filter = params.filter;
  }
  
  // Validate sortField (whitelist approach)
  if (params.sortField && ['due_date', 'created_at', 'title'].includes(params.sortField)) {
    validatedParams.sortField = params.sortField;
  }
  
  // Validate sortOrder (whitelist approach)
  if (params.sortOrder && ['asc', 'desc'].includes(params.sortOrder)) {
    validatedParams.sortOrder = params.sortOrder;
  }
  
  // Validate numeric parameters
  if (typeof params.limit === 'number' && params.limit > 0 && params.limit <= 50) {
    validatedParams.limit = params.limit;
  }
  
  if (typeof params.offset === 'number' && params.offset >= 0) {
    validatedParams.offset = params.offset;
  }
  
  // Validate date ranges (if provided)
  if (params.timeRange) {
    validatedParams.timeRange = {};
    
    if (params.timeRange.before && isValidDate(params.timeRange.before)) {
      validatedParams.timeRange.before = new Date(params.timeRange.before);
    }
    
    if (params.timeRange.after && isValidDate(params.timeRange.after)) {
      validatedParams.timeRange.after = new Date(params.timeRange.after);
    }
  }
  
  // Validate search
  if (typeof params.search === 'string' && params.search.trim()) {
    validatedParams.search = params.search.trim();
  }
  
  // Validate format options
  if (params.formatOptions) {
    validatedParams.formatOptions = {};
    
    if (typeof params.formatOptions.includeTips === 'boolean') {
      validatedParams.formatOptions.includeTips = params.formatOptions.includeTips;
    }
    
    if (params.formatOptions.outputFormat && ['text', 'json'].includes(params.formatOptions.outputFormat)) {
      validatedParams.formatOptions.outputFormat = params.formatOptions.outputFormat;
    }
  }
  
  return validatedParams;
}

/**
 * Checks if a value is a valid date
 * @param date The value to check
 * @returns Whether the value is a valid date
 */
function isValidDate(date: any): boolean {
  return date instanceof Date && !isNaN(date.getTime()) || 
         (typeof date === 'string' && !isNaN(new Date(date).getTime()));
}

/**
 * Generates secure query parameters from a user message using AI
 * @param message The user message
 * @param userId The user's ID
 * @returns Secure query parameters
 */
/**
 * Extracts query parameters from a message using rule-based parsing
 * This serves as a fallback when AI query generation fails
 * @param message The user message
 * @returns Extracted query parameters
 */
function extractQueryParametersFromMessage(message: string): Partial<ReminderQueryOptions> {
  const params: Partial<ReminderQueryOptions> = {};
  const lowerMessage = message.toLowerCase();
  
  // Extract filter
  if (lowerMessage.includes('all reminder')) {
    params.filter = 'all';
  } else if (lowerMessage.includes('completed reminder') || lowerMessage.includes('finished reminder') || lowerMessage.includes('done reminder')) {
    params.filter = 'completed';
  } else if (lowerMessage.includes('pending reminder') || lowerMessage.includes('upcoming reminder')) {
    params.filter = 'pending';
  } else {
    params.filter = 'active';
  }
  
  // Extract sort order
  if (lowerMessage.includes('newest first') || lowerMessage.includes('recent first') || 
      lowerMessage.includes('descending') || lowerMessage.includes('reverse order')) {
    params.sortOrder = 'desc';
  } else if (lowerMessage.includes('oldest first') || lowerMessage.includes('chronological') || 
           lowerMessage.includes('ascending')) {
    params.sortOrder = 'asc';
  }
  
  // Extract sort field
  if (lowerMessage.includes('sort by title') || lowerMessage.includes('sorted by title') || 
      lowerMessage.includes('alphabetical')) {
    params.sortField = 'title';
  } else if (lowerMessage.includes('sort by created') || lowerMessage.includes('sorted by created') || 
           lowerMessage.includes('creation date')) {
    params.sortField = 'created_at';
  } else {
    params.sortField = 'due_date';
  }
  
  // Extract limit
  const limitMatch = lowerMessage.match(/show (\d+) reminder/i) || 
                    lowerMessage.match(/list (\d+) reminder/i) || 
                    lowerMessage.match(/next (\d+) reminder/i);
  if (limitMatch && limitMatch[1]) {
    const limit = parseInt(limitMatch[1], 10);
    if (limit > 0 && limit <= 50) {
      params.limit = limit;
    }
  }
  
  // Extract search terms
  const searchPatterns = [
    /about ([\w\s]+)/i,
    /related to ([\w\s]+)/i,
    /containing ([\w\s]+)/i,
    /with ([\w\s]+)/i
  ];
  
  for (const pattern of searchPatterns) {
    const match = lowerMessage.match(pattern);
    if (match && match[1]) {
      params.search = match[1].trim();
      break;
    }
  }
  
  // Extract format options
  if (lowerMessage.includes('json')) {
    params.formatOptions = { outputFormat: 'json' };
  }
  
  if (lowerMessage.includes('without tips') || lowerMessage.includes('no tips')) {
    params.formatOptions = { ...params.formatOptions, includeTips: false };
  }
  
  // Extract time range
  if (lowerMessage.includes('tomorrow') || lowerMessage.includes('next day')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
    
    params.timeRange = {
      after: tomorrow,
      before: dayAfterTomorrow
    };
  } else if (lowerMessage.includes('today')) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    params.timeRange = {
      after: today,
      before: tomorrow
    };
  } else if (lowerMessage.includes('this week')) {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    
    params.timeRange = {
      after: startOfWeek,
      before: endOfWeek
    };
  }
  
  return params;
}

export async function generateSecureQueryFromUserMessage(message: string, userId: string): Promise<ReminderQueryOptions> {
  try {
    // Create a prompt for the AI
    const prompt = `
      Analyze the following user request and extract structured query parameters for a reminder database.
      
      User request: "${sanitizeUserInput(message)}"
      
      IMPORTANT SECURITY CONSTRAINTS:
      1. NEVER attempt to access data from other users
      2. NEVER try to modify the userId parameter
      3. NEVER use raw SQL or any query bypass techniques
      4. ONLY use the allowed parameters listed below
      
      Return a JSON object with ONLY the following allowed parameters:
      {
        "filter": "active" | "completed" | "pending" | "all",
        "sortField": "due_date" | "created_at" | "title",
        "sortOrder": "asc" | "desc",
        "limit": number (1-50),
        "offset": number (0+),
        "timeRange": {
          "before": ISO date string or null,
          "after": ISO date string or null
        },
        "search": string or null,
        "formatOptions": {
          "includeTips": boolean,
          "outputFormat": "text" | "json"
        }
      }
      
      Only include fields that are explicitly mentioned or implied in the user request.
      If the user asks for "newest first", "recent first", "reverse order", etc., set sortOrder to "desc".
      If the user asks for "oldest first", "chronological order", etc., set sortOrder to "asc".
      If the user mentions "all reminders", set filter to "all".
      If the user mentions "completed reminders", set filter to "completed".
      If the user mentions "pending reminders", set filter to "pending".
      If the user doesn't specify, default to active reminders.
      
      For example:
      - "Show my reminders newest first" → {"sortOrder": "desc"}
      - "Show all my reminders" → {"filter": "all"}
      - "Show reminders about meeting" → {"search": "meeting"}
      - "Show reminders in JSON" → {"formatOptions": {"outputFormat": "json"}}
      - "Show reminders without tips" → {"formatOptions": {"includeTips": false}}
      
      DO NOT include any explanation, just return the JSON object.
    `;

    // Call the Gemini model
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    
    const generationConfig = {
      temperature: 0.1,
      topK: 32,
      topP: 0.95,
      maxOutputTokens: 1024,
    };
    
    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ];
    
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
      safetySettings,
    });
    
    const response = result.response;
    const aiResponse = response.text();
    
    // Log the AI response for debugging
    console.log("AI response for query generation:", aiResponse);
    
    try {
      // Extract JSON from the response (in case the AI includes explanations)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : aiResponse;
      
      // Parse and validate the AI response
      const rawParams = JSON.parse(jsonString);
      
      // Run the parameters through strict validation
      const validatedParams = validateQueryParameters(rawParams);
      
      // Always enforce the userId
      validatedParams.userId = userId;
      
      return validatedParams;
    } catch (error) {
      console.error("Error parsing AI query response:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error generating query from user message:", error);
    console.log("Falling back to rule-based query parameter extraction");
    
    // Use rule-based fallback when AI fails
    const extractedParams = extractQueryParametersFromMessage(message);
    
    // Merge with default parameters
    const fallbackParams: ReminderQueryOptions = {
      userId,
      filter: extractedParams.filter || 'active',
      sortField: extractedParams.sortField || 'due_date',
      sortOrder: extractedParams.sortOrder || 'asc',
      limit: extractedParams.limit || 10,
      offset: extractedParams.offset || 0
    };
    
    // Add optional parameters if present
    if (extractedParams.search) {
      fallbackParams.search = extractedParams.search;
    }
    
    if (extractedParams.timeRange) {
      fallbackParams.timeRange = extractedParams.timeRange;
    }
    
    if (extractedParams.formatOptions) {
      fallbackParams.formatOptions = extractedParams.formatOptions;
    }
    
    console.log("Using fallback parameters:", JSON.stringify(fallbackParams, null, 2));
    return fallbackParams;
  }
}

/**
 * Sanitizes user input to prevent injection attacks
 * @param input The user input
 * @returns Sanitized input
 */
function sanitizeUserInput(input: string): string {
  if (!input) return '';
  
  // Remove any potentially dangerous characters or patterns
  return input
    .replace(/[;'"\\]/g, '') // Remove SQL injection characters
    .replace(/\${.*?}/g, '') // Remove template literal expressions
    .replace(/(\b)(on\w+)\s*=/gi, '$1_$2=') // Neutralize event handlers
    .replace(/<(script|iframe|object|embed|style)[^>]*>[\s\S]*?<\/\1>/gi, '') // Remove script tags
    .replace(/(javascript|data|vbscript):/gi, '_$1:') // Neutralize dangerous protocols
    .trim();
}

/**
 * Creates a secure query executor for reminders
 * @param userId The user's ID
 * @returns A secure query executor
 */
export function createSecureReminderQuery(userId: string) {
  // Return a query builder that always enforces the user ID
  return {
    // The userId is locked in the closure and can't be overridden
    buildQueryOptions: async (message: string): Promise<ReminderQueryOptions> => {
      const queryOptions = await generateSecureQueryFromUserMessage(message, userId);
      
      // Force the userId to be the authenticated user's ID
      queryOptions.userId = userId;
      
      return queryOptions;
    }
  };
}

/**
 * Logs query attempts for security auditing
 * @param userId The user's ID
 * @param queryParams The query parameters
 * @param success Whether the query was successful
 */
export function logQueryAttempt(userId: string, queryParams: ReminderQueryOptions, success: boolean) {
  console.log(`[SECURITY] User ${userId} executed reminder query:`, {
    params: queryParams,
    success,
    timestamp: new Date().toISOString()
  });
}
