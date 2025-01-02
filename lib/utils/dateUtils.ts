import { parse, parseISO, add, isAfter, startOfDay, setHours, setMinutes, format } from 'date-fns';

export interface ReminderTime {
  due_date: Date | null;
  recurrence_type: 'none' | 'daily' | 'weekly' | 'monthly';
  recurrence_days?: number[];
  recurrence_time?: string;
  needs_time_clarification?: boolean;
  error_message?: string;
}

function parseTimeString(timeStr: string): { hours: number; minutes: number } | null {
  // Try various time formats
  const formats = [
    'h:mm a',
    'ha',
    'H:mm',
    'h a',
    'H'
  ];

  for (const formatStr of formats) {
    try {
      const date = parse(timeStr, formatStr, new Date());
      if (!isNaN(date.getTime())) {
        return {
          hours: date.getHours(),
          minutes: date.getMinutes()
        };
      }
    } catch (e) {
      continue;
    }
  }

  return null;
}

export function parseReminderTime(message: string): ReminderTime {
  message = message.toLowerCase();
  const now = new Date();
  const result: ReminderTime = {
    due_date: null,
    recurrence_type: 'none'
  };

  // Check for recurring patterns
  if (message.includes('everyday') || message.includes('every day')) {
    result.recurrence_type = 'daily';
    const timeMatch = message.match(/(at|@)?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
    if (timeMatch) {
      const timeStr = timeMatch[2];
      const parsedTime = parseTimeString(timeStr);
      if (parsedTime) {
        result.recurrence_time = `${parsedTime.hours.toString().padStart(2, '0')}:${parsedTime.minutes.toString().padStart(2, '0')}`;
        result.due_date = setMinutes(setHours(startOfDay(now), parsedTime.hours), parsedTime.minutes);
      }
    } else {
      result.needs_time_clarification = true;
      return result;
    }
  }

  // Check for weekly patterns
  else if (message.includes('every week') || message.includes('weekly')) {
    result.recurrence_type = 'weekly';
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const foundDays = days.filter(day => message.includes(day));
    
    if (foundDays.length > 0) {
      result.recurrence_days = foundDays.map(day => days.indexOf(day));
      const timeMatch = message.match(/(at|@)?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
      if (timeMatch) {
        const timeStr = timeMatch[2];
        const parsedTime = parseTimeString(timeStr);
        if (parsedTime) {
          result.recurrence_time = `${parsedTime.hours.toString().padStart(2, '0')}:${parsedTime.minutes.toString().padStart(2, '0')}`;
          // Set first occurrence
          let dueDate = startOfDay(now);
          while (!result.recurrence_days.includes(dueDate.getDay())) {
            dueDate = add(dueDate, { days: 1 });
          }
          result.due_date = setMinutes(setHours(dueDate, parsedTime.hours), parsedTime.minutes);
        } else {
          result.needs_time_clarification = true;
          return result;
        }
      } else {
        result.needs_time_clarification = true;
        return result;
      }
    } else {
      result.error_message = "Please specify which day of the week.";
      return result;
    }
  }

  // Handle one-time reminders
  else {
    // Check for relative time patterns with more flexible matching
    const minutePattern = /(?:(\d+)\s*min(?:ute)?s?|(?:a|one)\s*min(?:ute)?)/i;
    const hourPattern = /(?:(\d+)\s*hour?s?|(?:a|one)\s*hour)/i;
    
    const minuteMatch = message.match(minutePattern);
    const hourMatch = message.match(hourPattern);
    
    if (minuteMatch) {
      const minutes = minuteMatch[1] ? parseInt(minuteMatch[1]) : 1;
      result.due_date = add(now, { minutes });
    } else if (hourMatch) {
      const hours = hourMatch[1] ? parseInt(hourMatch[1]) : 1;
      result.due_date = add(now, { hours });
    }
    // Check for "tomorrow"
    else if (message.includes('tomorrow')) {
      const timeMatch = message.match(/(at|@)?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
      if (timeMatch) {
        const timeStr = timeMatch[2];
        const parsedTime = parseTimeString(timeStr);
        if (parsedTime) {
          result.due_date = setMinutes(
            setHours(add(startOfDay(now), { days: 1 }), parsedTime.hours),
            parsedTime.minutes
          );
        }
      } else {
        result.needs_time_clarification = true;
        return result;
      }
    }
    // If no time specified
    else if (!message.match(/\d{1,2}(?::\d{2})?\s*(?:am|pm)?/i)) {
      result.needs_time_clarification = true;
      return result;
    }
  }

  // Validate the time is not in the past
  if (result.due_date && !result.recurrence_type && isAfter(now, result.due_date)) {
    result.error_message = "Sorry, I cannot set reminders in the past. Please choose a future time.";
    result.due_date = null;
  }

  return result;
}

export function parseDuration(duration: string): Date | null {
  try {
    // Handle ISO duration format (e.g., "PT1M", "PT1H", "P1D")
    if (duration.startsWith('P')) {
      const matches = duration.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (!matches) return null;

      const now = new Date();
      const [_, days, hours, minutes, seconds] = matches;

      return add(now, {
        days: parseInt(days || '0'),
        hours: parseInt(hours || '0'),
        minutes: parseInt(minutes || '0'),
        seconds: parseInt(seconds || '0'),
      });
    }

    // Try parsing as ISO date string
    if (duration.includes('T') || duration.includes('-')) {
      return parseISO(duration);
    }

    // Try parsing natural language date
    const now = new Date();
    if (duration.includes('tomorrow')) {
      return add(now, { days: 1 });
    }
    if (duration.includes('next week')) {
      return add(now, { weeks: 1 });
    }
    if (duration.includes('next month')) {
      return add(now, { months: 1 });
    }

    return null;
  } catch (error) {
    console.error('Error parsing duration:', error);
    return null;
  }
}
