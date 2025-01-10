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

export function parseReminderTime(message: string): Date | null {
  message = message.toLowerCase().trim();
  const now = new Date();

  // Handle "in X minutes/hours"
  const relativeMatch = message.match(/in (\d+) (minute|minutes|hour|hours)/);
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1]);
    const unit = relativeMatch[2];
    if (unit.startsWith('hour')) {
      return add(now, { hours: amount });
    } else {
      return add(now, { minutes: amount });
    }
  }

  // Handle "at HH:MM" or "at H:MM am/pm"
  const timeMatch = message.match(/at (\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
  if (timeMatch) {
    const timeStr = timeMatch[1].trim();
    const parsedTime = parseTimeString(timeStr);
    if (parsedTime) {
      const reminderDate = new Date(now);
      reminderDate.setHours(parsedTime.hours);
      reminderDate.setMinutes(parsedTime.minutes);
      reminderDate.setSeconds(0);
      reminderDate.setMilliseconds(0);

      // If the time has already passed today, set it for tomorrow
      if (reminderDate.getTime() <= now.getTime()) {
        reminderDate.setDate(reminderDate.getDate() + 1);
      }
      return reminderDate;
    }
  }

  // Handle "tomorrow at HH:MM"
  const tomorrowMatch = message.match(/tomorrow at (\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
  if (tomorrowMatch) {
    const timeStr = tomorrowMatch[1].trim();
    const parsedTime = parseTimeString(timeStr);
    if (parsedTime) {
      const reminderDate = add(now, { days: 1 });
      reminderDate.setHours(parsedTime.hours);
      reminderDate.setMinutes(parsedTime.minutes);
      reminderDate.setSeconds(0);
      reminderDate.setMilliseconds(0);
      return reminderDate;
    }
  }

  return null;
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
