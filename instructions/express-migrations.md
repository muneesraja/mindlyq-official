# MindlyQ Express Migration Plan

## Overview

This document outlines the detailed plan for migrating the current MindlyQ implementation to an Express.js-based architecture using Bun as the runtime environment. This migration aims to improve scalability, maintainability, and performance while preserving all existing functionality.

## Core Migration Principles

1. **New Repository Structure**: Create a new repository called `mindlyq-core` for this implementation.
2. **Bun as Runtime**: Utilize Bun for its superior performance and native TypeScript support.
3. **Express.js Framework**: Implement a RESTful API architecture using Express.js.
4. **UTC Date Handling**: Maintain and enhance the existing UTC-based date handling approach.
5. **Separation of Concerns**: Clearly separate business logic, data access, and API layers.
6. **Improved Type System**: Implement a comprehensive type system to support future scalability.
7. **Enhanced Recurrence Support**: Support for minutely and hourly recurring reminders.
8. **Messaging Platform Abstraction**: Design for easy integration with multiple messaging platforms.

## Repository Structure

```
mindlyq-core/
├── src/
│   ├── api/                  # API routes and controllers
│   │   ├── routes/           # Express route definitions
│   │   ├── controllers/      # Request handlers
│   │   ├── middleware/       # Express middleware
│   │   └── validators/       # Request validation
│   ├── services/             # Business logic layer
│   │   ├── reminder/         # Reminder-related services
│   │   ├── user/             # User-related services
│   │   ├── ai/               # AI integration services
│   │   └── messaging/        # Messaging platform services
│   ├── models/               # Domain models
│   │   ├── reminder.ts       # Reminder domain model
│   │   ├── recurrence.ts     # Recurrence pattern model
│   │   └── user.ts           # User model
│   ├── data/                 # Data access layer
│   │   ├── repositories/     # Repository pattern implementations
│   │   └── prisma/           # Prisma ORM configuration
│   ├── utils/                # Utility functions
│   │   ├── date/             # Date handling utilities
│   │   ├── ai/               # AI utilities
│   │   └── validation/       # Validation utilities
│   ├── config/               # Application configuration
│   ├── types/                # TypeScript type definitions
│   └── jobs/                 # Background jobs (including cron)
├── prisma/                   # Prisma schema and migrations
├── tests/                    # Test files
├── scripts/                  # Utility scripts
└── docs/                     # Documentation
```

## Type System Design

The type system should be designed for maximum scalability and reusability:

```typescript
// Base types for domain entities
interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// Reminder types
interface ReminderBase extends BaseEntity {
  title: string;
  description?: string;
  userId: string;
  status: ReminderStatus;
}

interface OneTimeReminder extends ReminderBase {
  type: 'one-time';
  dueDate: Date;
}

interface RecurringReminder extends ReminderBase {
  type: 'recurring';
  startDate: Date;
  endDate?: Date;
  recurrencePattern: RecurrencePattern;
}

type Reminder = OneTimeReminder | RecurringReminder;

// Recurrence pattern types
interface RecurrencePattern {
  type: RecurrenceType;
  timeInMinutes: number; // Minutes since midnight UTC
  days?: number[];       // For weekly recurrence
  interval?: number;     // For every X days/weeks/etc.
}

type RecurrenceType = 'minutely' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
type ReminderStatus = 'active' | 'completed' | 'cancelled' | 'pending';

// Service interfaces
interface ReminderService {
  create(data: CreateReminderDto): Promise<Reminder>;
  update(id: string, data: UpdateReminderDto): Promise<Reminder>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<Reminder | null>;
  findDue(date: Date): Promise<Reminder[]>;
  markAsComplete(id: string): Promise<Reminder>;
  createBulk(data: CreateReminderDto[]): Promise<Reminder[]>;
  deleteBulk(ids: string[]): Promise<void>;
}
```

## Database Schema Changes

Enhance the Prisma schema to support the new architecture:

```prisma
model User {
  id            String     @id @default(uuid())
  phone         String     @unique
  name          String?
  timezone      String     @default("UTC")
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
  reminders     Reminder[]
  preferences   UserPreference?
}

model Reminder {
  id              String          @id @default(uuid())
  title           String
  description     String?
  dueDate         DateTime
  status          String          @default("active")
  userId          String
  user            User            @relation(fields: [userId], references: [id])
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  lastSent        DateTime?
  recurrenceType  String?         // 'none', 'daily', 'weekly', 'monthly', 'yearly'
  recurrenceDays  Int[]           @default([])
  recurrenceTime  Int?            // Minutes since midnight UTC
  endDate         DateTime?       // New field for recurring reminders
}
```

## Date Handling Strategy

Leverage the full potential of date-fns:

1. **UTC Storage**: Continue storing all dates in UTC format in the database.
2. **Timezone Conversion**: Use date-fns-tz for timezone conversions.
3. **Date Calculations**: Use date-fns for all date calculations and manipulations.
4. **Recurrence Handling**: Implement a dedicated RecurrenceService for calculating next occurrences.

```typescript
// Example date utility functions
import { format, parseISO, addDays } from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';

export function toUTC(date: Date, timezone: string): Date {
  return zonedTimeToUtc(date, timezone);
}

export function fromUTC(date: Date, timezone: string): Date {
  return utcToZonedTime(date, timezone);
}

export function formatDateForDisplay(date: Date, timezone: string): string {
  const localDate = fromUTC(date, timezone);
  return format(localDate, 'EEEE, MMMM d, yyyy h:mm a');
}
```

## API Endpoints

Design RESTful API endpoints:

```
# Reminder Endpoints
GET    /api/reminders                - Get all reminders for the authenticated user
POST   /api/reminders                - Create a new reminder
GET    /api/reminders/:id            - Get a specific reminder
PUT    /api/reminders/:id            - Update a reminder
DELETE /api/reminders/:id            - Delete a reminder
POST   /api/reminders/bulk           - Create multiple reminders
DELETE /api/reminders/bulk           - Delete multiple reminders
PUT    /api/reminders/:id/complete   - Mark a reminder as complete

# User Endpoints
GET    /api/users/profile            - Get user profile
PUT    /api/users/profile            - Update user profile
PUT    /api/users/timezone           - Update user timezone

# AI Endpoints
POST   /api/ai/parse-date            - Parse a date from natural language
POST   /api/ai/create-reminder       - Create a reminder from natural language
POST   /api/ai/bulk-create           - Create multiple reminders from natural language
```

## Middleware Architecture

Implement middleware for common operations:

```typescript
// Authentication middleware
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Timezone middleware
export const timezoneMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  if (req.user) {
    const userPreference = await prisma.userPreference.findUnique({
      where: { userId: req.user.id }
    });
    req.timezone = userPreference?.timezone || 'UTC';
  } else {
    req.timezone = 'UTC';
  }
  next();
};

// Error handling middleware
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'An unexpected error occurred',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};
```

## AI Integration

Maintain the Gemini AI integration but refactor for better separation of concerns:

```typescript
// AI Service
export class AiService {
  private model: GenerativeModel;
  
  constructor() {
    this.model = genAI.getGenerativeModel({
      model: 'gemini-pro',
      safetySettings: DEFAULT_SAFETY_SETTINGS,
    });
  }
  
  async parseDateTime(text: string, timezone: string): Promise<DateTimeParseResult> {
    // Implementation
  }
  
  async createReminderFromText(text: string, userId: string): Promise<Reminder> {
    // Implementation
  }
  
  async createBulkRemindersFromText(text: string, userId: string): Promise<Reminder[]> {
    // Implementation
  }
}
```

## Background Jobs

Replace the current cron implementation with a more robust job scheduling system:

```typescript
// Job scheduler
import { CronJob } from 'cron';
import { ReminderService } from '../services/reminder/reminder.service';

export class JobScheduler {
  private reminderService: ReminderService;
  private jobs: CronJob[] = [];
  
  constructor(reminderService: ReminderService) {
    this.reminderService = reminderService;
  }
  
  start() {
    // Check for due reminders every minute
    const reminderJob = new CronJob('* * * * *', async () => {
      await this.processDueReminders();
    });
    
    reminderJob.start();
    this.jobs.push(reminderJob);
    
    console.log('Job scheduler started');
  }
  
  async processDueReminders() {
    const now = new Date();
    const dueReminders = await this.reminderService.findDue(now);
    
    for (const reminder of dueReminders) {
      await this.sendNotification(reminder);
      await this.updateReminderStatus(reminder);
    }
  }
  
  // Other methods
}
```

## Migration Steps

1. **Setup Project**:
   - Initialize new repository with Bun
   - Configure TypeScript
   - Set up Express.js
   - Configure Prisma with existing database schema

2. **Core Infrastructure**:
   - Implement base types and interfaces
   - Set up middleware architecture
   - Create utility functions
   - Implement authentication system

3. **Data Layer**:
   - Migrate Prisma schema with enhancements
   - Implement repository pattern
   - Add end_date support for recurring reminders

4. **Service Layer**:
   - Implement ReminderService
   - Implement UserService
   - Implement AiService
   - Implement RecurrenceService

5. **API Layer**:
   - Implement REST endpoints
   - Set up validation
   - Implement controllers

6. **Background Jobs**:
   - Implement job scheduler
   - Migrate cron functionality
   - Implement notification system

7. **Testing**:
   - Write unit tests
   - Write integration tests
   - Perform end-to-end testing

8. **Deployment**:
   - Set up CI/CD pipeline
   - Configure production environment
   - Deploy to staging

## Implementation Guidelines for LLM

When implementing this migration with Claude 3.7 Sonnet in Windsurf IDE, follow these guidelines:

1. **Incremental Implementation**:
   - Start with core infrastructure and data layer
   - Implement one feature at a time
   - Test thoroughly before moving to the next feature

2. **Type-First Approach**:
   - Define all types and interfaces before implementation
   - Use TypeScript's discriminated unions for complex types
   - Leverage generics for reusable components

3. **Code Organization**:
   - Follow the repository structure outlined above
   - Maintain clear separation between layers
   - Use barrel exports (index.ts files) for clean imports

4. **Error Handling**:
   - Implement comprehensive error handling
   - Use custom error classes
   - Provide meaningful error messages

5. **Documentation**:
   - Document all public APIs
   - Include JSDoc comments for functions
   - Create usage examples

6. **Testing Strategy**:
   - Write tests for all business logic
   - Mock external dependencies
   - Test edge cases thoroughly

## Feature Migration Checklist

Ensure all existing features are migrated:

- [ ] User authentication and management
- [ ] Timezone detection and handling
- [ ] One-time reminder creation
- [ ] Recurring reminder creation (including minutely and hourly)
- [ ] Reminder modification
- [ ] Reminder deletion
- [ ] Bulk reminder creation
- [ ] Natural language date parsing
- [ ] Reminder notifications
- [ ] User preferences
- [ ] WhatsApp integration
- [ ] Messaging platform abstraction layer

## Additional Enhancements

Once the core migration is complete, consider these enhancements:

1. **End Date Support**: Add proper end date support for recurring reminders
2. **Bulk Operations**: Implement bulk modification and deletion
3. **Complex Recurrence Patterns**: Support for more complex recurrence patterns
4. **Notification Preferences**: Allow users to customize notification timing
5. **API Documentation**: Add Swagger/OpenAPI documentation
6. **Performance Monitoring**: Implement monitoring and logging
7. **Rate Limiting**: Add rate limiting for API endpoints
8. **Fine-grained Recurrence Control**: Support for custom recurrence intervals

## Conclusion

This migration plan provides a comprehensive roadmap for transitioning the MindlyQ application to an Express.js architecture with Bun. By following this plan, you'll create a more maintainable, scalable, and performant application while preserving all existing functionality.

The new architecture will make it easier to add new features, improve code organization, and enhance the overall user experience. The type-first approach will ensure that the codebase remains maintainable as it grows.