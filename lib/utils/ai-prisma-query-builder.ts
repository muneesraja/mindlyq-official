import { HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { getUserTimezone } from "./date-converter";
import { Prisma } from "@prisma/client";
import { genAI, getModelForTask } from "./ai-config";

/**
 * Interface for AI-generated Prisma query
 */
export interface AIPrismaQuery {
  // Prisma query components
  where: any;
  orderBy: any;
  take?: number;
  skip?: number;
  
  // Additional metadata for response handling
  queryType: 'standard' | 'next' | 'first' | 'last' | 'count' | 'specific_date';
  formatOptions: {
    includeTips: boolean;
    includeDescription: boolean;
    outputFormat: 'text' | 'json' | 'minimal';
    showQueryContext: boolean;
  };
  queryContext?: {
    filter?: string;
    sorting?: string;
    timeDescription?: string;
    searchTerms?: string;
  };
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
 * Validates and secures the AI-generated Prisma query
 * @param query The query to validate
 * @param userId The user's ID
 * @returns A validated and secured query
 */
function validateAndSecureQuery(query: any, userId: string): AIPrismaQuery {
  // Start with a safe default query - only include active reminders by default
  const safeQuery: AIPrismaQuery = {
    where: { 
      user_id: userId,
      status: 'active' // Default to only active reminders
    },
    orderBy: [{ due_date: 'asc' }],
    take: 10, // Default to 10 reminders per page
    skip: 0,
    queryType: 'standard',
    formatOptions: {
      includeTips: true,
      includeDescription: true,
      outputFormat: 'text',
      showQueryContext: false
    }
  };
  
  try {
    // Always enforce user ID in where clause
    if (query.where) {
      query.where.user_id = userId;
    } else {
      query.where = { user_id: userId };
    }
    
    // Validate and copy where conditions
    safeQuery.where = query.where;
    
    // Validate and copy orderBy
    if (query.orderBy && (Array.isArray(query.orderBy) || typeof query.orderBy === 'object')) {
      safeQuery.orderBy = query.orderBy;
    }
    
    // Validate and copy pagination - enforce maximum of 10 reminders per page
    if (typeof query.take === 'number' && query.take > 0) {
      // Enforce maximum of 10 reminders per page
      safeQuery.take = Math.min(query.take, 10);
    }
    
    if (typeof query.skip === 'number' && query.skip >= 0) {
      safeQuery.skip = query.skip;
    }
    
    // Validate and copy query type
    if (query.queryType && ['standard', 'next', 'first', 'last', 'count', 'specific_date'].includes(query.queryType)) {
      safeQuery.queryType = query.queryType;
    }
    
    // Validate and copy format options
    if (query.formatOptions) {
      if (typeof query.formatOptions.includeTips === 'boolean') {
        safeQuery.formatOptions.includeTips = query.formatOptions.includeTips;
      }
      
      if (typeof query.formatOptions.includeDescription === 'boolean') {
        safeQuery.formatOptions.includeDescription = query.formatOptions.includeDescription;
      }
      
      if (query.formatOptions.outputFormat && 
          ['text', 'json', 'minimal'].includes(query.formatOptions.outputFormat)) {
        safeQuery.formatOptions.outputFormat = query.formatOptions.outputFormat;
      }
      
      if (typeof query.formatOptions.showQueryContext === 'boolean') {
        safeQuery.formatOptions.showQueryContext = query.formatOptions.showQueryContext;
      }
    }
    
    // Copy query context if present
    if (query.queryContext) {
      safeQuery.queryContext = {
        filter: typeof query.queryContext.filter === 'string' ? query.queryContext.filter : undefined,
        sorting: typeof query.queryContext.sorting === 'string' ? query.queryContext.sorting : undefined,
        timeDescription: typeof query.queryContext.timeDescription === 'string' ? query.queryContext.timeDescription : undefined,
        searchTerms: typeof query.queryContext.searchTerms === 'string' ? query.queryContext.searchTerms : undefined
      };
    }
    
    return safeQuery;
  } catch (error) {
    console.error("Error validating AI-generated query:", error);
    return safeQuery;
  }
}

/**
 * Generates a Prisma query directly from a user message using AI
 * @param message The user message
 * @param userId The user's ID
 * @returns A secure Prisma query
 */
export async function generatePrismaQueryFromUserMessage(message: string, userId: string): Promise<AIPrismaQuery> {
  try {
    // Get user timezone for time-based queries
    const userTimezone = await getUserTimezone(userId);
    
    // Current date in user's timezone
    const now = new Date();
    const userNow = now.toLocaleString('en-US', { timeZone: userTimezone });
    
    // Tomorrow's date in user's timezone
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const userTomorrow = tomorrow.toLocaleString('en-US', { timeZone: userTimezone });
    
    // Create a prompt for the AI
    const prompt = `
      Analyze the following user request and generate a Prisma query object for fetching reminders.
      
      User request: "${sanitizeUserInput(message)}"
      
      Current date and time in user's timezone: ${userNow}
      
      REMINDER DATABASE SCHEMA:
      \`\`\`
      model Reminder {
        id              String    @id @default(cuid())
        title           String
        description     String?
        due_date        DateTime
        user_id         String
        status          String    @default("active")
        recurrence_type String?   // Can be "none", "daily", "weekly", etc.
        recurrence_days Int[]     @default([])  // For weekly recurring: 0=Sunday, 1=Monday, etc.
        recurrence_time Int?      // Minutes since midnight in UTC
        last_sent       DateTime?
        created_at      DateTime  @default(now())
        updated_at      DateTime  @updatedAt
      }
      \`\`\`
      
      Return a JSON object with the following Prisma query structure:
      {
        "where": {
          // Prisma where conditions
          "user_id": "PLACEHOLDER_USER_ID", // This will be replaced with the actual userId
          // Additional conditions based on user request
        },
        "orderBy": [
          // Prisma orderBy conditions
        ],
        "take": number, // Limit (IMPORTANT: Maximum of 10 reminders per page)
        "skip": number, // Offset
        "queryType": "standard" | "next" | "first" | "last" | "count" | "specific_date", // For specialized handling
        "formatOptions": {
          "includeTips": boolean,
          "includeDescription": boolean,
          "outputFormat": "text" | "json" | "minimal",
          "showQueryContext": boolean
        },
        "queryContext": {
          "filter": string description of filter,
          "sorting": string description of sorting,
          "timeDescription": string description of time range,
          "searchTerms": string description of search terms
        }
      }
      
      IMPORTANT RULES FOR QUERY GENERATION:
      
      1. REMINDER STATUS FILTERING:
         - "active" reminders: status: "active"
         - "completed" reminders: status: "sent" (completed reminders have status "sent" in the database)
         - "deleted" reminders: status: "deleted"
         - DEFAULT: When user simply asks to list reminders without specifying status, ONLY show active reminders
      
      2. RECURRING REMINDERS HANDLING:
         - For "recurring reminders": use { "where": { "recurrence_type": { "not": "none" } } }
         - For "non-recurring reminders": use { "where": { "recurrence_type": "none" } }
         - For "daily reminders": use { "where": { "recurrence_type": "daily" } }
         - For "weekly reminders": use { "where": { "recurrence_type": "weekly" } }
         - For specific days (e.g., "Monday reminders"): use { "where": { "recurrence_type": "weekly", "recurrence_days": { "has": 1 } } } (0=Sunday, 1=Monday, etc.)
         - IMPORTANT: When user doesn't explicitly mention recurring or non-recurring reminders, DO NOT include any recurrence_type filter in the query to ensure both types are included
      
      3. TIME-BASED QUERIES:
         - Use the current date/time provided above for relative time references
         - For "tomorrow", use: { "where": { "status": "active", "due_date": { "gte": "TOMORROW_START", "lt": "TOMORROW_END" } } }
         - For "today", use: { "where": { "status": "active", "due_date": { "gte": "TODAY_START", "lt": "TODAY_END" } } }
         - For "yesterday", use: { "where": { "status": "active", "due_date": { "gte": "YESTERDAY_START", "lt": "YESTERDAY_END" } } }
         - For "next reminder", use: { "where": { "status": "active", "due_date": { "gte": "CURRENT_DATE" } }, "orderBy": [{ "due_date": "asc" }], "take": 1 }
         - DEFAULT: Only include non-completed reminders unless explicitly asked for completed/old/past reminders
      
      4. PAGINATION:
         - ALWAYS limit results to a maximum of 10 reminders per page
         - If user asks for more than 10 reminders, set take to 10 and indicate in queryContext that pagination is required
         - For requests like "show all my reminders", still limit to 10 and indicate more are available
      
      5. SPECIALIZED QUERIES:
         - "next reminder": Set queryType to "next" and limit to 1
         - "first/oldest reminder": Set queryType to "first" and sort by creation date
         - "last/newest reminder": Set queryType to "last" and sort by creation date descending
         - "count of reminders": Set queryType to "count"
         - "reminders tomorrow": Set queryType to "specific_date" and filter for tomorrow's date
      
      6. OUTPUT FORMATTING:
         - JSON output: set outputFormat to "json"
         - Minimal output (no tips): set includeTips to false
         - Include/exclude descriptions: set includeDescription accordingly
      
      7. ERROR HANDLING:
         - If you cannot understand the query or it's impossible to create a valid Prisma query, return a basic query that shows active reminders
         - Always ensure the query will work with the Reminder schema shown above
         - Never reference fields that don't exist in the schema
         - For complex filtering that can't be expressed in Prisma, use simpler filters and note the limitation in queryContext
      
      DO NOT include any explanation, just return the JSON object.
    `;

    // Call the Gemini model using the centralized configuration
    const model = genAI.getGenerativeModel({ model: getModelForTask('query') });
    
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
    console.log("AI response for Prisma query generation:", aiResponse);
    
    try {
      // Extract JSON from the response (in case the AI includes explanations)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : aiResponse;
      
      // Parse the AI response
      const rawQuery = JSON.parse(jsonString);
      
      // Validate and secure the query
      const validatedQuery = validateAndSecureQuery(rawQuery, userId);
      
      return validatedQuery;
    } catch (error) {
      console.error("Error parsing AI query response:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error generating Prisma query from user message:", error);
    
    // Fallback to a basic query when AI fails
    return {
      where: { user_id: userId, status: 'active' },
      orderBy: [{ due_date: 'asc' }],
      take: 10,
      skip: 0,
      queryType: 'standard',
      formatOptions: {
        includeTips: true,
        includeDescription: true,
        outputFormat: 'text',
        showQueryContext: false
      },
      queryContext: {
        filter: "active reminders",
        sorting: "oldest first",
        timeDescription: "all time",
        searchTerms: undefined
      }
    };
  }
}

/**
 * Creates a secure Prisma query executor for reminders
 * @param userId The user's ID
 * @returns A secure query executor
 */
export function createSecurePrismaQueryBuilder(userId: string) {
  // Return a query builder that always enforces the user ID
  return {
    // The userId is locked in the closure and can't be overridden
    buildPrismaQuery: async (message: string): Promise<AIPrismaQuery> => {
      const prismaQuery = await generatePrismaQueryFromUserMessage(message, userId);
      
      // Force the userId to be the authenticated user's ID
      prismaQuery.where.user_id = userId;
      
      return prismaQuery;
    }
  };
}

/**
 * Logs query attempts for security auditing
 * @param userId The user's ID
 * @param query The Prisma query
 * @param success Whether the query was successful
 */
export function logPrismaQueryAttempt(userId: string, query: AIPrismaQuery, success: boolean) {
  console.log(`[SECURITY] User ${userId} executed Prisma reminder query:`, {
    query: {
      where: query.where,
      orderBy: query.orderBy,
      take: query.take,
      skip: query.skip,
      queryType: query.queryType
    },
    success,
    timestamp: new Date().toISOString()
  });
}
