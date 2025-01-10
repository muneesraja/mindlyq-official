# MindlyQ - WhatsApp Reminder System

MindlyQ is an intelligent WhatsApp-based reminder system that uses natural language processing to help users set and manage reminders effortlessly.

## 🌟 Features

### Reminder Management
- **Natural Language Processing**: Set reminders using everyday language
  - "Remind me to call John in 5 minutes"
  - "Set a reminder at 4:30 PM"
  - "Daily reminder at 9am to take medicine"

### Supported Time Formats
- Relative time: "in X minutes", "after X hours"
- Specific time: "at 2:30 PM"
- Tomorrow: "tomorrow at 9 AM"
- Recurring: Daily/Weekly reminders

### Smart Features
- Automatic time zone handling
- Flexible reminder parsing
- Recurring reminder support
- Real-time notifications via WhatsApp

## 🛠️ Technology Stack

- **Backend**: Next.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **AI**: Google Gemini for natural language processing
- **Messaging**: Twilio WhatsApp API
- **Scheduling**: Custom CRON service

## 🚀 Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   ```env
   DATABASE_URL=
   GOOGLE_GEMINI_API_KEY=
   TWILIO_ACCOUNT_SID=
   TWILIO_AUTH_TOKEN=
   TWILIO_PHONE_NUMBER=
   ```
4. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

## 📝 TODO List

### High Priority
- [ ] Add support for reminder editing and deletion
- [ ] Implement reminder snoozing functionality
- [ ] Add support for timezone configuration
- [ ] Enhance error handling for failed WhatsApp messages

### Features
- [ ] Add support for reminder categories/tags
- [ ] Implement reminder sharing between users
- [ ] Add support for attachments in reminders
- [ ] Create a web dashboard for reminder management

### Technical Improvements
- [ ] Add comprehensive test coverage
- [ ] Implement rate limiting for WhatsApp messages
- [ ] Add monitoring and alerting for the CRON service
- [ ] Optimize database queries for better performance

### Documentation
- [ ] Add API documentation
- [ ] Create user guide with common use cases
- [ ] Document deployment process
- [ ] Add contribution guidelines

## 📄 License

MIT License - See LICENSE file for details
