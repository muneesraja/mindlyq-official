# MindlyQ Agent Architecture

This directory contains the agent-based architecture for MindlyQ, which uses a two-stage AI approach to process user messages and provide appropriate responses.

## Architecture Overview

The agent architecture follows these key principles:

1. **Intent Detection First**: We use a fast model (Gemini Flash) to quickly detect the user's intent
2. **Specialized Agents**: Each type of task is handled by a specialized agent
3. **Modular Design**: Agents are independent and follow a common interface
4. **Conversation State**: We maintain conversation history to provide context

## Components

### Agent Interface

The base interface that all agents implement, defined in `agent-interface.ts`:

- `Agent`: Interface that all agents must implement
- `AgentResponse`: Standard response format
- `IntentType`: Enumeration of possible intents
- `IntentDetectionResult`: Result of intent detection

### Intent Detection Agent

Uses Gemini Flash to quickly determine what the user wants to do:

- Analyzes the message and conversation history
- Returns an intent type and confidence score
- Extracts relevant entities when possible

### Specialized Agents

- **ReminderCreationAgent**: Handles creating new reminders
- **ReminderListingAgent**: Handles listing existing reminders
- **ReminderModificationAgent**: Handles modifying existing reminders
- **ReminderDeletionAgent**: Handles deleting reminders
- **ChatAgent**: Handles general conversation

### Agent Manager

Orchestrates the entire process:

1. Receives the user message
2. Uses the IntentDetectionAgent to determine intent
3. Routes the message to the appropriate specialized agent
4. Returns the response to the user
5. Handles message splitting for long responses

## Flow Diagram

```
User Message
    │
    ▼
Intent Detection (Gemini Flash)
    │
    ▼
Agent Manager ─────┬─────────┬─────────┬─────────┬─────────┐
    │             │         │         │         │         │
    ▼             ▼         ▼         ▼         ▼         ▼
Creation     Listing    Modification  Deletion   Chat     Other
Agent        Agent      Agent         Agent      Agent    Agents
    │             │         │         │         │         │
    └─────────────┴─────────┴─────────┴─────────┴─────────┘
                  │
                  ▼
            User Response
```

## Benefits of this Architecture

1. **Modularity**: Easy to add new capabilities by adding new agents
2. **Specialization**: Each agent can be optimized for its specific task
3. **Performance**: Fast intent detection followed by more detailed processing
4. **Maintainability**: Clear separation of concerns
5. **Scalability**: Can add more agents or replace existing ones without affecting others

## Future Improvements

- Add more specialized agents for additional capabilities
- Implement agent fallbacks and error recovery
- Add support for multi-turn conversations within a single intent
- Implement more sophisticated entity extraction
- Add support for multi-modal inputs (images, audio, etc.)
