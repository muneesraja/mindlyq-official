# MindlyQ Express Migration Project Prompt

I need your assistance in migrating my MindlyQ application to a new Express.js-based architecture using Bun as the runtime. I've prepared a detailed migration plan that outlines the architecture, requirements, and implementation approach.

## Project Context

MindlyQ is a reminder application that currently uses WhatsApp for communication. The application allows users to create, modify, and delete reminders through natural language processing. It supports one-time and recurring reminders with various recurrence patterns.

## Migration Goals

1. Create a new repository called `mindlyq-core` with a clean, modular architecture
2. Implement a RESTful API using Express.js and Bun
3. Maintain all existing functionality while improving scalability and maintainability
4. Add support for minutely and hourly recurring reminders
5. Create an abstraction layer for messaging platforms to support future integrations

## Your Task

Please help me implement this migration following the detailed plan in the `express-migrations.md` file. I'd like to start with:

1. Setting up the project structure
2. Defining the core types and interfaces
3. Implementing the basic Express server with middleware
4. Creating the data access layer with Prisma

For each step, please:
- Explain your approach
- Generate the necessary code files
- Provide instructions for testing
- Highlight any design decisions or trade-offs

## Technical Requirements

- Use TypeScript for all code
- Use Bun as the package manager and runtime
- Implement proper error handling and logging
- Follow a clean architecture approach with clear separation of concerns
- Use date-fns for all date handling
- Integrate with Gemini models for AI functionality (not OpenAI)
- Store all dates in UTC format in the database

## Migration Plan Reference

I've created a detailed migration plan in the `express-migrations.md` file. Please refer to this document for the complete architecture, type system design, API endpoints, and implementation guidelines.

Let's start by setting up the basic project structure and implementing the core infrastructure.
