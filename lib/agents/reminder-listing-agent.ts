import { Agent, AgentResponse } from "./agent-interface";
import { prisma } from "../db";
import { formatDateForHumans, formatRecurrenceForHumans } from "../ai-date-parser";
import { getUserTimezone } from "../utils/date-converter";
import { fromUTC, formatUTCDate, minutesToTimeString } from "../utils/date-converter";
import { getConversationState, updateConversationState, clearConversationState } from "../conversation-state";
import { ReminderQueryOptions } from "../utils/reminder-query-builder";
import { AIPrismaQuery, createSecurePrismaQueryBuilder, logPrismaQueryAttempt } from "../utils/ai-prisma-query-builder";

// Define pagination state interface
interface PaginationState {
  page: number;
  totalPages: number;
  totalReminders: number;
  lastQuery: string;
  prismaQuery?: AIPrismaQuery;
}

/**
 * Agent responsible for listing reminders
 */
export class ReminderListingAgent implements Agent {
  /**
   * Process a user message to list reminders
   * @param message The user's message
   * @param userId The user's ID
   * @returns A response with the list of reminders
   */
  async process(message: string, userId: string): Promise<AgentResponse> {
    // Get the user's timezone preference
    const userTimezone = await getUserTimezone(userId);
    try {
      console.log("Processing reminder listing request:", message);
      
      // Get conversation state to check for pagination
      const conversationState = await getConversationState(userId);
      let paginationState: PaginationState | null = null;
      
      // Check if there's stored pagination state
      if (conversationState?.partialData && 
          typeof conversationState.partialData === 'object' && 
          'paginationState' in conversationState.partialData) {
        paginationState = conversationState.partialData.paginationState as PaginationState;
      }
      
      // Determine if this is a pagination request with improved detection
      const isPaginationRequest = message.toLowerCase().match(/next(\s+page)?|more|show\s+more|continue|following|see\s+more|page\s+\d+|next\s+\d+/i) !== null;
      
      let prismaQuery: AIPrismaQuery;
      let page = 0;
      
      // Handle pagination request
      if (isPaginationRequest && paginationState) {
        console.log("Handling pagination request");
        // Continue with the same query from previous request
        if (paginationState.prismaQuery) {
          prismaQuery = paginationState.prismaQuery;
          page = paginationState.page + 1;
          
          // Don't exceed total pages
          if (page >= paginationState.totalPages) {
            page = paginationState.totalPages - 1;
          }
          
          // Update skip for pagination
          const pageSize = prismaQuery.take || 10;
          prismaQuery.skip = page * pageSize;
        } else {
          // Fall back to generating a new query if prismaQuery not available
          console.log("No previous query found, generating new query");
          const queryBuilder = createSecurePrismaQueryBuilder(userId);
          prismaQuery = await queryBuilder.buildPrismaQuery(message);
          page = 0;
        }
      } else {
        console.log("Generating new Prisma query from user message");
        // Create a secure query builder for this user
        const queryBuilder = createSecurePrismaQueryBuilder(userId);
        
        // Generate Prisma query from the user's message
        prismaQuery = await queryBuilder.buildPrismaQuery(message);
        page = 0;
        
        // Log the generated query for debugging
        console.log("Generated Prisma query:", JSON.stringify(prismaQuery, null, 2));
      }
      
      // Log the query attempt for security auditing
      logPrismaQueryAttempt(userId, prismaQuery, true);
      
      // Handle count query type
      if (prismaQuery.queryType === 'count') {
        const count = await prisma.reminder.count({
          where: prismaQuery.where
        });
        
        return {
          success: true,
          message: `You have ${count} reminder(s) matching your criteria.`,
          data: { count }
        };
      }
      
      // Execute the query to get reminders
      console.log("Executing Prisma query:", JSON.stringify({
        where: prismaQuery.where,
        orderBy: prismaQuery.orderBy,
        take: prismaQuery.take,
        skip: prismaQuery.skip
      }, null, 2));
      
      // If the query doesn't explicitly filter for recurring or non-recurring reminders,
      // make sure we include both types by default
      if (!prismaQuery.where.recurrence_type && 
          !prismaQuery.queryContext?.filter?.toLowerCase().includes('recurring')) {
        console.log("Query doesn't specify recurrence type, ensuring we include both recurring and non-recurring reminders");
        // Remove any recurrence_type filter if it exists to ensure we get all types
        if (prismaQuery.where.recurrence_type) {
          delete prismaQuery.where.recurrence_type;
        }
      }
      
      const reminders = await prisma.reminder.findMany({
        where: prismaQuery.where,
        orderBy: prismaQuery.orderBy,
        take: prismaQuery.take || 10,
        skip: prismaQuery.skip || 0
      });
      
      // Format reminders for display
      if (reminders.length === 0) {
        // Provide context-aware empty results message
        if (prismaQuery.queryType === 'next') {
          return {
            success: true,
            message: "You don't have any upcoming reminders."
          };
        } else if (prismaQuery.queryContext?.timeDescription?.includes('tomorrow')) {
          return {
            success: true,
            message: "You don't have any reminders scheduled for tomorrow."
          };
        } else if (prismaQuery.queryContext?.searchTerms) {
          return {
            success: true,
            message: `You don't have any reminders matching "${prismaQuery.queryContext.searchTerms}".`
          };
        } else {
          return {
            success: true,
            message: "You don't have any reminders matching your criteria."
          };
        }
      }
      
      // Calculate pagination details - enforce maximum of 10 reminders per page
      const pageSize = Math.min(prismaQuery.take || 10, 10); // Ensure maximum of 10 reminders per page
      
      // Get total count for accurate pagination
      const totalReminders = await prisma.reminder.count({
        where: prismaQuery.where
      });
      
      const totalPages = Math.ceil(totalReminders / pageSize);
      
      // Ensure page is within bounds
      if (page >= totalPages) {
        page = Math.max(0, totalPages - 1);
      }
      
      // Store pagination state for future requests
      const newPaginationState: PaginationState = {
        page,
        totalPages,
        totalReminders,
        lastQuery: message,
        prismaQuery // Store the full Prisma query for future pagination
      };
      
      // Update conversation state with pagination info
      await updateConversationState(userId, {
        role: 'assistant',
        content: 'Updated pagination state'
      }, {
        paginationState: newPaginationState
      });
      
      // We don't need to slice reminders since we're already limiting in the query
      const displayReminders = reminders;
      
      // Calculate current page and total displayed
      const currentPage = page + 1;
      const startIndex = page * pageSize;
      const endIndex = startIndex + displayReminders.length;
      const totalDisplayed = Math.min(endIndex, totalReminders);
      
      // Determine if there are more pages
      const hasMorePages = totalReminders > endIndex;
      
      // Get filter and sorting descriptions from query context
      let filterType = prismaQuery.queryContext?.filter || 'active reminders';
      let sortingInfo = prismaQuery.queryContext?.sorting || 'by due date';
      let timeDescription = prismaQuery.queryContext?.timeDescription || '';
      
      // Create header with more conversational formatting
      let headerText = `Here are your ${filterType}`;
      if (timeDescription) {
        headerText += ` ${timeDescription}`;
      }
      
      // Only add sorting info if it's meaningful
      if (sortingInfo && !sortingInfo.includes('none') && !sortingInfo.includes('default')) {
        headerText += `, ${sortingInfo}`;
      }
      
      // Add pagination guidance if there are more pages in a more conversational way
      let paginationGuidance = '';
      if (hasMorePages) {
        if (totalReminders - endIndex === 1) {
          paginationGuidance = '\n\nThere\'s 1 more reminder. Just say "show more" to see it.';  
        } else {
          paginationGuidance = `\n\nI found ${totalReminders} reminders in total. Say "show more" to see the next set.`;  
        }
      }
      
      // Create header with enhanced formatting
      let responseMessage = `${headerText}:\n`;
      
      const formattedReminders = displayReminders.map((reminder, index) => {
        const date = new Date(reminder.due_date);
        
        // Debug logs to track timezone conversion
        console.log(`Reminder ${index + 1} - ${reminder.title}:`);
        console.log(`- Original UTC date from DB: ${date.toISOString()}`);
        console.log(`- User timezone: ${userTimezone}`);
        
        // Check if reminder has recurrence_time (which is in minutes since midnight UTC)
        if (reminder.recurrence_time !== null) {
          // Convert minutes to HH:MM format for logging
          const hours = Math.floor(reminder.recurrence_time / 60);
          const mins = reminder.recurrence_time % 60;
          const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
          console.log(`- Has recurrence_time: ${reminder.recurrence_time} minutes (${timeStr} UTC)`);
        }
        
        // Format date using our date-converter utility
        // Determine if we need to include the year
        const currentYear = new Date().getFullYear();
        const reminderYear = date.getFullYear();
        const formatString = reminderYear !== currentYear ? 
          'MMM d, yyyy h:mm aa' : 
          'MMM d h:mm aa';
        
        // Use recurrence_time if available for display (converting from UTC minutes to local time)
        let dueDate;
        if (reminder.recurrence_time !== null) {
          // Extract just the date part from the formatted date
          const datePart = formatUTCDate(date, userTimezone, 'MMM d');
          
          // Create a Date object with the current date and the recurrence time in UTC
          const utcHours = Math.floor(reminder.recurrence_time / 60);
          const utcMinutes = reminder.recurrence_time % 60;
          
          // Create a date object with today's date and the recurrence time in UTC
          const utcDate = new Date();
          utcDate.setUTCHours(utcHours, utcMinutes, 0, 0);
          
          // Format the time in the user's timezone
          const timeInUserTz = new Intl.DateTimeFormat('en-US', {
            timeZone: userTimezone,
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }).format(utcDate);
          
          dueDate = `${datePart} ${timeInUserTz}`;
          console.log(`- Using recurrence_time for display: ${dueDate} (from ${reminder.recurrence_time} minutes UTC)`);
        } else {
          // Use standard UTC to local conversion
          dueDate = formatUTCDate(date, userTimezone, formatString);
          console.log(`- Formatted date using formatUTCDate: ${dueDate}`);
        }
        
        // Determine status emoji
        let statusEmoji = "";
        if (reminder.recurrence_type && reminder.recurrence_type !== "none") {
          statusEmoji = "🔄 "; // Recurring
        } else {
          const nowUTC = new Date();
          const userTimezoneNow = fromUTC(nowUTC, userTimezone);
          const reminderLocalDate = fromUTC(date, userTimezone);
          
          // Check if the reminder is due today
          const isToday = (
            reminderLocalDate.getDate() === userTimezoneNow.getDate() &&
            reminderLocalDate.getMonth() === userTimezoneNow.getMonth() &&
            reminderLocalDate.getFullYear() === userTimezoneNow.getFullYear()
          );
          
          if (isToday) {
            statusEmoji = "⏰ "; // Due today
          } else {
            statusEmoji = "📅 "; // Future date
          }
        }
        
        // Format description if available
        const description = reminder.description ? `\n   ${reminder.description}` : "";
        
        return `${index + 1}. ${statusEmoji}"${reminder.title}" - ${dueDate}${description}`;
      });

      responseMessage += formattedReminders.join("\n");
      
      // Add pagination info with better formatting
      responseMessage += `\n\nShowing ${startIndex + 1}-${totalDisplayed} of ${totalReminders} reminder(s)`;
      
      // Add pagination instructions if there are more pages
      if (currentPage < totalPages) {
        responseMessage += "\n\nSay 'show next page' or 'next' to see more reminders.";
      }
      
      // Add tips section with better formatting
      responseMessage += "\n\nTips:\n" +
        "• Sort options: 'Show my reminders newest first' or 'Show oldest reminders first'\n" +
        "• Modify time: 'Change my meeting reminder to 5 PM'\n" +
        "• Modify title: 'Update the title of my 3 PM reminder to team meeting'\n" +
        "• Modify description: 'Change the description of my meeting reminder to prepare agenda first'";
      

      // Determine whether to include tips based on format options
      const includeTips = prismaQuery.formatOptions?.includeTips !== false;
      
      // Remove tips as requested
      const tips = [];
      
      // Format output based on requested format
      if (prismaQuery.formatOptions?.outputFormat === 'json') {
        // For JSON output, return a structured response
        const jsonOutput = {
          reminders: displayReminders.map(r => ({
            id: r.id,
            title: r.title,
            description: prismaQuery.formatOptions?.includeDescription ? r.description : undefined,
            due_date: r.due_date,
            status: r.status,
            recurrence_type: r.recurrence_type
          })),
          pagination: {
            current_page: currentPage,
            total_pages: totalPages,
            total_reminders: totalReminders,
            showing_start: startIndex + 1,
            showing_end: totalDisplayed
          },
          query_context: {
            filter: filterType,
            sorting: sortingInfo,
            time_description: timeDescription,
            search_terms: prismaQuery.queryContext?.searchTerms
          }
        };
        
        // Return JSON formatted response
        return {
          success: true,
          message: `JSON output of your ${filterType} reminders:\n${JSON.stringify(jsonOutput, null, 2)}${hasMorePages ? paginationGuidance : ''}`,
          data: reminders,
          queryContext: {
            filter: filterType,
            sorting: sortingInfo,
            searchTerms: prismaQuery.queryContext?.searchTerms ? [prismaQuery.queryContext.searchTerms] : undefined,
            hasMorePages,
            currentPage,
            totalPages
          },
          formattedOutput: {
            header: headerText,
            reminders: formattedReminders,
            pagination: hasMorePages ? `I've shown ${displayReminders.length} out of ${totalReminders} reminders` : `These are all ${totalReminders} reminders`,
            tips: []
          }
        };
      } else if (prismaQuery.formatOptions?.outputFormat === 'minimal') {
        // For minimal output, return a simplified response without tips
        return {
          success: true,
          message: responseMessage + (hasMorePages ? paginationGuidance : ''),
          data: reminders,
          queryContext: {
            filter: filterType,
            sorting: sortingInfo,
            searchTerms: prismaQuery.queryContext?.searchTerms ? [prismaQuery.queryContext.searchTerms] : undefined,
            hasMorePages,
            currentPage,
            totalPages
          },
          formattedOutput: {
            header: headerText,
            reminders: formattedReminders,
            pagination: hasMorePages ? `I've shown ${displayReminders.length} out of ${totalReminders} reminders` : `These are all ${totalReminders} reminders`,
            tips: []
          }
        };
      } else {
        // For standard text output
        return {
          success: true,
          message: responseMessage + (hasMorePages ? paginationGuidance : ''),
          data: reminders,
          queryContext: {
            filter: filterType,
            sorting: sortingInfo,
            searchTerms: prismaQuery.queryContext?.searchTerms ? [prismaQuery.queryContext.searchTerms] : undefined,
            hasMorePages,
            currentPage,
            totalPages
          },
          formattedOutput: {
            header: headerText,
            reminders: formattedReminders,
            pagination: hasMorePages ? `I've shown ${displayReminders.length} out of ${totalReminders} reminders` : `These are all ${totalReminders} reminders`,
            tips: []
          }
        };
      }
    } catch (error) {
      console.error("Error in reminder listing:", error);
      
      return {
        success: false,
        message: "An error occurred while retrieving your reminders."
      };
    }
  }
  
  // The extractSearchTerms method has been removed as it's now handled by the reminder-query-builder
}
