import { 
  addDays, 
  addHours, 
  addMinutes, 
  addMonths, 
  addWeeks, 
  addYears,
  nextMonday,
  nextTuesday,
  nextWednesday,
  nextThursday,
  nextFriday,
  nextSaturday,
  nextSunday,
  setHours,
  setMinutes,
  setSeconds,
  format,
  parse,
  isValid,
  startOfDay,
  endOfDay,
  startOfToday,
  endOfToday,
  startOfTomorrow,
  endOfTomorrow,
  getDay
} from 'date-fns';
import { toUTC, fromUTC, isValidTimezone } from './date-converter';

/**
 * Represents a time expression parsed from user input
 */
export interface TimeExpression {
  type: 'relative_day' | 'specific_date' | 'relative_time' | 'day_of_week' | 'recurring' | 'none';
  value: string | number; // "tomorrow", 5 (minutes), etc.
  unit?: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
  time?: string; // "15:00" if specified
  date?: string; // "2025-03-06" if specified
  dayOfWeek?: number; // 0-6 for Sunday-Saturday
  recurrence?: {
    type: 'daily' | 'weekly' | 'monthly' | 'yearly';
    days?: number[]; // [1, 3, 5] for Mon, Wed, Fri
    interval?: number; // every 2 weeks, etc.
  };
}

/**
 * Result of a date calculation
 */
export interface DateCalculationResult {
  success: boolean;
  date?: Date;
  isRecurring?: boolean;
  recurrenceType?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurrenceDays?: number[];
  recurrenceTime?: string;
  error?: string;
}

/**
 * Calculate a date based on a time expression
 * @param timeExpression The time expression to calculate
 * @param baseDate The base date to calculate from (defaults to now)
 * @param timezone The timezone to use (defaults to UTC)
 * @returns The calculated date
 */
export function calculateDate(
  timeExpression: TimeExpression, 
  baseDate: Date = new Date(), 
  timezone: string = 'UTC'
): DateCalculationResult {
  try {
    if (!isValidTimezone(timezone)) {
      console.warn(`Invalid timezone in calculateDate: ${timezone}, falling back to UTC`);
      timezone = 'UTC';
    }

    // Convert base date to UTC for consistent calculations
    const utcBaseDate = toUTC(baseDate, timezone);
    
    // Default time is 9:00 AM if not specified
    const defaultTime = '09:00';
    const timeString = timeExpression.time || defaultTime;
    const [hours, minutes] = timeString.split(':').map(Number);
    
    let calculatedDate: Date;
    
    switch(timeExpression.type) {
      case 'relative_day': {
        const value = timeExpression.value as string;
        
        if (value === 'today') {
          calculatedDate = startOfDay(utcBaseDate);
        } else if (value === 'tomorrow') {
          calculatedDate = startOfTomorrow();
        } else if (value === 'next_week') {
          calculatedDate = addWeeks(startOfDay(utcBaseDate), 1);
        } else {
          return {
            success: false,
            error: `Unknown relative day: ${value}`
          };
        }
        
        // Set the time
        calculatedDate = setHours(calculatedDate, hours);
        calculatedDate = setMinutes(calculatedDate, minutes);
        calculatedDate = setSeconds(calculatedDate, 0);
        
        return {
          success: true,
          date: calculatedDate,
          isRecurring: false
        };
      }
      
      case 'specific_date': {
        if (!timeExpression.date) {
          return {
            success: false,
            error: 'No date specified for specific_date type'
          };
        }
        
        // Parse the date string (expected format: YYYY-MM-DD)
        try {
          calculatedDate = parse(timeExpression.date, 'yyyy-MM-dd', utcBaseDate);
          
          if (!isValid(calculatedDate)) {
            return {
              success: false,
              error: `Invalid date: ${timeExpression.date}`
            };
          }
          
          // Set the time
          calculatedDate = setHours(calculatedDate, hours);
          calculatedDate = setMinutes(calculatedDate, minutes);
          calculatedDate = setSeconds(calculatedDate, 0);
          
          return {
            success: true,
            date: calculatedDate,
            isRecurring: false
          };
        } catch (error) {
          return {
            success: false,
            error: `Failed to parse date: ${timeExpression.date}`
          };
        }
      }
      
      case 'relative_time': {
        const value = timeExpression.value as number;
        const unit = timeExpression.unit;
        
        if (!unit) {
          return {
            success: false,
            error: 'No unit specified for relative_time type'
          };
        }
        
        switch(unit) {
          case 'minute':
            calculatedDate = addMinutes(utcBaseDate, value);
            break;
          case 'hour':
            calculatedDate = addHours(utcBaseDate, value);
            break;
          case 'day':
            calculatedDate = addDays(utcBaseDate, value);
            break;
          case 'week':
            calculatedDate = addWeeks(utcBaseDate, value);
            break;
          case 'month':
            calculatedDate = addMonths(utcBaseDate, value);
            break;
          case 'year':
            calculatedDate = addYears(utcBaseDate, value);
            break;
          default:
            return {
              success: false,
              error: `Unknown time unit: ${unit}`
            };
        }
        
        return {
          success: true,
          date: calculatedDate,
          isRecurring: false
        };
      }
      
      case 'day_of_week': {
        const dayOfWeek = timeExpression.dayOfWeek;
        
        if (dayOfWeek === undefined || dayOfWeek < 0 || dayOfWeek > 6) {
          return {
            success: false,
            error: `Invalid day of week: ${dayOfWeek}`
          };
        }
        
        // Get the next occurrence of the specified day
        switch(dayOfWeek) {
          case 0: // Sunday
            calculatedDate = nextSunday(utcBaseDate);
            break;
          case 1: // Monday
            calculatedDate = nextMonday(utcBaseDate);
            break;
          case 2: // Tuesday
            calculatedDate = nextTuesday(utcBaseDate);
            break;
          case 3: // Wednesday
            calculatedDate = nextWednesday(utcBaseDate);
            break;
          case 4: // Thursday
            calculatedDate = nextThursday(utcBaseDate);
            break;
          case 5: // Friday
            calculatedDate = nextFriday(utcBaseDate);
            break;
          case 6: // Saturday
            calculatedDate = nextSaturday(utcBaseDate);
            break;
          default:
            return {
              success: false,
              error: `Unknown day of week: ${dayOfWeek}`
            };
        }
        
        // Set the time
        calculatedDate = setHours(calculatedDate, hours);
        calculatedDate = setMinutes(calculatedDate, minutes);
        calculatedDate = setSeconds(calculatedDate, 0);
        
        return {
          success: true,
          date: calculatedDate,
          isRecurring: false
        };
      }
      
      case 'recurring': {
        if (!timeExpression.recurrence) {
          return {
            success: false,
            error: 'No recurrence information provided'
          };
        }
        
        const recurrence = timeExpression.recurrence;
        let firstOccurrence: Date;
        
        switch(recurrence.type) {
          case 'daily':
            // First occurrence is today
            firstOccurrence = startOfDay(utcBaseDate);
            break;
            
          case 'weekly':
            if (recurrence.days && recurrence.days.length > 0) {
              // Find the next occurrence of any of the specified days
              const today = getDay(utcBaseDate);
              const nextDays = recurrence.days
                .map(day => (day - today + 7) % 7) // Calculate days until each occurrence
                .filter(days => days > 0); // Only consider future days
              
              if (nextDays.length === 0) {
                // All days are in the past this week, take the first day next week
                const firstDay = Math.min(...recurrence.days);
                firstOccurrence = addDays(startOfDay(utcBaseDate), (firstDay - today + 7) % 7);
              } else {
                // Take the nearest future day
                const daysUntilNext = Math.min(...nextDays);
                firstOccurrence = addDays(startOfDay(utcBaseDate), daysUntilNext);
              }
            } else {
              // Default to next week same day
              firstOccurrence = addWeeks(startOfDay(utcBaseDate), 1);
            }
            break;
            
          case 'monthly':
            // First occurrence is next month, same day
            firstOccurrence = addMonths(startOfDay(utcBaseDate), 1);
            break;
            
          case 'yearly':
            // First occurrence is next year, same day
            firstOccurrence = addYears(startOfDay(utcBaseDate), 1);
            break;
            
          default:
            return {
              success: false,
              error: `Unknown recurrence type: ${recurrence.type}`
            };
        }
        
        // Set the time
        firstOccurrence = setHours(firstOccurrence, hours);
        firstOccurrence = setMinutes(firstOccurrence, minutes);
        firstOccurrence = setSeconds(firstOccurrence, 0);
        
        // Format the recurrence time
        const recurrenceTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        
        return {
          success: true,
          date: firstOccurrence,
          isRecurring: true,
          recurrenceType: recurrence.type,
          recurrenceDays: recurrence.days || [],
          recurrenceTime: recurrenceTime
        };
      }
      
      case 'none':
      default:
        return {
          success: false,
          error: 'No time expression provided or unsupported type'
        };
    }
  } catch (error) {
    console.error('Error in calculateDate:', error);
    return {
      success: false,
      error: `Failed to calculate date: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Parse common relative time expressions from text
 * @param text The text to parse
 * @returns A time expression if found, or null if not found
 */
export function parseRelativeTimeExpressions(text: string): TimeExpression | null {
  const lowerText = text.toLowerCase().trim();
  
  // Check for "in X minutes/hours" or "after X minutes/hours"
  const minutesRegex = /(?:in|after)\s+(\d+)\s+minute(?:s)?/i;
  const hoursRegex = /(?:in|after)\s+(\d+)\s+hour(?:s)?/i;
  const daysRegex = /(?:in|after)\s+(\d+)\s+day(?:s)?/i;
  
  // Check for day expressions
  const tomorrowRegex = /\btomorrow\b/i;
  const todayRegex = /\btoday\b/i;
  
  // Check for day of week
  const dayOfWeekRegex = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;
  
  // Check for recurring patterns
  const dailyRegex = /\bevery\s+day\b/i;
  const weeklyRegex = /\bevery\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;
  const multiWeeklyRegex = /\bevery\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+and\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday))+/i;
  
  // Check for time expressions
  const timeRegex = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i;
  
  // Extract time if present
  let timeMatch = lowerText.match(timeRegex);
  let timeString: string | undefined;
  
  if (timeMatch) {
    const hour = parseInt(timeMatch[1]);
    const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const period = timeMatch[3]?.toLowerCase();
    
    // Convert to 24-hour format
    let hour24 = hour;
    if (period === 'pm' && hour < 12) {
      hour24 += 12;
    } else if (period === 'am' && hour === 12) {
      hour24 = 0;
    }
    
    timeString = `${hour24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }
  
  // Check for relative minutes
  const minutesMatch = lowerText.match(minutesRegex);
  if (minutesMatch) {
    const minutes = parseInt(minutesMatch[1]);
    return {
      type: 'relative_time',
      value: minutes,
      unit: 'minute',
      time: timeString
    };
  }
  
  // Check for relative hours
  const hoursMatch = lowerText.match(hoursRegex);
  if (hoursMatch) {
    const hours = parseInt(hoursMatch[1]);
    return {
      type: 'relative_time',
      value: hours,
      unit: 'hour',
      time: timeString
    };
  }
  
  // Check for relative days
  const daysMatch = lowerText.match(daysRegex);
  if (daysMatch) {
    const days = parseInt(daysMatch[1]);
    return {
      type: 'relative_time',
      value: days,
      unit: 'day',
      time: timeString
    };
  }
  
  // Check for tomorrow
  if (tomorrowRegex.test(lowerText)) {
    return {
      type: 'relative_day',
      value: 'tomorrow',
      time: timeString
    };
  }
  
  // Check for today
  if (todayRegex.test(lowerText)) {
    return {
      type: 'relative_day',
      value: 'today',
      time: timeString
    };
  }
  
  // Check for day of week
  const dayOfWeekMatch = lowerText.match(dayOfWeekRegex);
  if (dayOfWeekMatch) {
    const dayName = dayOfWeekMatch[1].toLowerCase();
    const dayMap: Record<string, number> = {
      'sunday': 0,
      'monday': 1,
      'tuesday': 2,
      'wednesday': 3,
      'thursday': 4,
      'friday': 5,
      'saturday': 6
    };
    
    return {
      type: 'day_of_week',
      value: dayName,
      dayOfWeek: dayMap[dayName],
      time: timeString
    };
  }
  
  // Check for daily recurrence
  if (dailyRegex.test(lowerText)) {
    return {
      type: 'recurring',
      value: 'daily',
      time: timeString,
      recurrence: {
        type: 'daily'
      }
    };
  }
  
  // Check for weekly recurrence
  const weeklyMatch = lowerText.match(weeklyRegex);
  if (weeklyMatch) {
    const dayName = weeklyMatch[1].toLowerCase();
    const dayMap: Record<string, number> = {
      'sunday': 0,
      'monday': 1,
      'tuesday': 2,
      'wednesday': 3,
      'thursday': 4,
      'friday': 5,
      'saturday': 6
    };
    
    return {
      type: 'recurring',
      value: 'weekly',
      time: timeString,
      recurrence: {
        type: 'weekly',
        days: [dayMap[dayName]]
      }
    };
  }
  
  // If no match found
  return null;
}

/**
 * Format a date in a human-readable format
 * @param date The date to format
 * @param timezone The timezone to use for formatting
 * @returns A human-readable date string
 */
export function formatDateForDisplay(date: Date, timezone: string = 'UTC'): string {
  if (!isValidTimezone(timezone)) {
    console.warn(`Invalid timezone in formatDateForDisplay: ${timezone}, falling back to UTC`);
    timezone = 'UTC';
  }
  
  // Convert to local timezone for display
  const localDate = fromUTC(date, timezone);
  // Use the date-fns format function which respects the actual date components
  return format(localDate, 'EEEE, MMMM d, yyyy h:mm a');
}

/**
 * Format a recurrence pattern in a human-readable format
 * @param recurrenceType The type of recurrence
 * @param recurrenceDays The days of recurrence (for weekly)
 * @param recurrenceTime The time of recurrence
 * @returns A human-readable description
 */
export function formatRecurrenceForDisplay(
  recurrenceType: 'daily' | 'weekly' | 'monthly' | 'yearly',
  recurrenceDays: number[],
  recurrenceTime: string
): string {
  // Format the time for display
  const [hours, minutes] = recurrenceTime.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  const timeStr = `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
  
  switch (recurrenceType) {
    case 'daily':
      return `Daily at ${timeStr}`;
    
    case 'weekly':
      if (recurrenceDays.length === 0) {
        return `Weekly at ${timeStr}`;
      } else {
        const dayNames = recurrenceDays.map(day => {
          const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          return days[day];
        });
        
        if (dayNames.length === 1) {
          return `Every ${dayNames[0]} at ${timeStr}`;
        } else if (dayNames.length === 2) {
          return `Every ${dayNames[0]} and ${dayNames[1]} at ${timeStr}`;
        } else {
          const lastDay = dayNames.pop();
          return `Every ${dayNames.join(', ')}, and ${lastDay} at ${timeStr}`;
        }
      }
    
    case 'monthly':
      return `Monthly at ${timeStr}`;
    
    case 'yearly':
      return `Yearly at ${timeStr}`;
    
    default:
      return `Unknown recurrence pattern`;
  }
}
