/**
 * Base interface for all agents in the system
 */
export interface Agent {
  /**
   * Process a user message and generate a response
   * @param message The user's message
   * @param userId The user's ID
   * @returns A response object with success status and message
   */
  process(message: string, userId: string): Promise<AgentResponse>;
}

/**
 * Formatted output structure for reminder listings
 */
export interface FormattedReminderOutput {
  header: string;
  reminders: string[];
  pagination: string;
  tips: string[];
}

/**
 * Query context information
 */
export interface QueryContext {
  filter: string;
  sorting: string;
  pagination?: string;
  search?: string | null;
  searchTerms?: string[];
  timeRange?: {
    before: string | null;
    after: string | null;
  } | null;
  hasMorePages?: boolean;
  currentPage?: number;
  totalPages?: number;
}

/**
 * Standard response format for all agents
 */
export interface AgentResponse {
  success: boolean;
  message: string;
  data?: any;
  formattedOutput?: FormattedReminderOutput;
  queryContext?: QueryContext;
}

/**
 * Types of intents that can be detected from user messages
 */
export enum IntentType {
  CHAT = 'chat',
  SET_REMINDER = 'set_reminder',
  MODIFY_REMINDER = 'modify_reminder',
  DELETE_REMINDER = 'delete_reminder',
  LIST_REMINDERS = 'list_reminders',
  SET_TIMEZONE = 'set_timezone',
  UNKNOWN = 'unknown'
}

/**
 * Result of intent detection
 */
export interface IntentDetectionResult {
  intent: IntentType;
  confidence: number;
  entities?: Record<string, any>;
}
