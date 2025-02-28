# MindlyQ Project Overview

MindlyQ is an AI-powered WhatsApp assistant designed to enhance productivity through intelligent reminder management and integration with Google services. The system utilizes advanced natural language understanding to allow users to create, manage, and receive reminders through conversational interactions, with plans to expand to Telegram as an additional messaging platform.

## Vision & Goals

1. Create a seamless, intuitive reminder experience through natural conversation
2. Eliminate friction in personal productivity management
3. Build an extensible platform that grows with user needs
4. Integrate with Google ecosystem for comprehensive productivity enhancement
5. Establish a foundation for cross-platform messaging support (WhatsApp and Telegram)

## Core Functionalities

## 1. Messaging Platform Integration

### WhatsApp Integration (Priority 1)
- **Twilio API Integration**: Implementation of webhook handlers for incoming messages
- **Message Processing Pipeline**: Standardized flow from receipt to response
- **Platform-Specific Formatters**: WhatsApp-compatible message formatting
- **Media Handling**: Processing and storage of media attachments
- **24-Hour Window Management**: Compliance with WhatsApp Business API rules

### Platform Adapter Layer (Priority 2)
- **Abstract Interface**: Platform-agnostic messaging operations
- **WhatsApp Adapter**: Initial implementation for WhatsApp
- **Message Queue**: Asynchronous message processing
- **Rate Limiting**: Platform-specific throughput management
- **Analytics Tracking**: Cross-platform usage metrics

### Future Platform Support (Priority 3)
- **Telegram Integration**: 
  - Rich interactive features (inline keyboards, buttons)
  - Bot command system implementation
  - Group chat support
  - File and media handling
  - Webhook and polling mode support

## 2. Natural Language Understanding

### Input Parsing (Priority 1)
- **Intent Classification**: Identifying user goals (set reminder, query reminder, etc.)
- **Entity Extraction**: Recognizing dates, times, people, and tasks
- **Contextual Understanding**: Maintaining conversation state
- **Query Reformulation**: Transforming natural language to structured queries
- **Error Recovery**: Graceful handling of ambiguous inputs

### LLM Integration (Priority 1)
- **Prompt Engineering**: Crafting effective instruction sets
- **Model API Integration**: Connectivity with Gemini or other LLMs
- **Response Generation**: Natural language output formation
- **Fallback Mechanisms**: Handling model unavailability

### Memory Management (Priority 2)
- **Short-term Context**: Current conversation tracking
- **Medium-term Memory**: Recent user interactions
- **Long-term Knowledge**: User preferences and patterns
- **Vector Database**: Storage of embeddings for semantic retrieval
- **Retrieval Mechanisms**: Relevance-based information access

## 3. Reminder System

### Reminder Management (Priority 1)
- **Creation Flow**: Natural language to structured reminder
- **Time/Date Parsing**: Robust handling of time expressions
- **Recurrence Patterns**: Support for repeating reminders
- **Modification Interface**: Update, reschedule, cancel functionality
- **Query Interface**: Retrieval by time, topic, or context
- **Timezone Management**: User-specific time handling

### Notification System (Priority 1)
- **Scheduled Triggers**: Time-based notification dispatch
- **Delivery Confirmation**: Tracking of notification receipt
- **Response Handling**: Processing of reminder responses
- **Escalation Logic**: Follow-up for missed notifications
- **Batching Strategy**: Grouping notifications when appropriate

### Database Storage (Priority 1)
- **Schema Design**: Optimized for quick reminder retrieval
- **Query Optimization**: Fast access patterns for time-based lookup
- **Backup Strategy**: Ensuring reminder data durability
- **Data Migration Path**: Schema evolution approach
- **Multi-user Support**: Isolation between user data

## 4. Web Dashboard

### User Authentication (Priority 2)
- **Reverse OTP System**: WhatsApp-based verification
- **Session Management**: Secure user sessions
- **Account Linking**: Multiple platform association
- **Password-less Authentication**: Simplified security model

### Reminder Management UI (Priority 2)
- **Timeline View**: Chronological reminder display
- **List Management**: Categorization and filtering
- **Batch Operations**: Multi-reminder actions
- **Rich Formatting**: Enhanced content display
- **Calendar Visualization**: Time-based organization

### Service Connection Panel (Priority 2)
- **Google Service Authorization**: OAuth connection interface
- **Connection Status**: Service health indicators
- **Permission Management**: Granular access control
- **Disconnection Flow**: Clean service separation

### User Preferences (Priority 2)
- **Notification Settings**: Channel and frequency preferences
- **Time Format Control**: 12/24-hour display options
- **Timezone Configuration**: Location-based time handling
- **Language Settings**: Internationalization support
- **Theme Customization**: Visual preference management


## 5. Google Service Integration

### Authentication System (Priority 2)
- **OAuth Implementation**: Secure authorization flow
- **Token Management**: Storage and refresh handling
- **Permission Scopes**: Granular access control
- **Revocation Handling**: Clean disconnection process
- **Multi-service Authentication**: Unified Google access

### Google Calendar Integration (Priority 2)
- **Event Synchronization**: Two-way sync between reminders and calendar
- **Availability Checking**: Conflict detection for new reminders
- **Meeting Creation**: Calendar event generation
- **View Optimization**: Relevant calendar data retrieval

### Google Tasks Integration (Priority 3)
- **Task Synchronization**: Mapping between reminders and tasks
- **List Management**: Organization within Google Tasks
- **Priority Handling**: Task importance levels
- **Subtask Support**: Hierarchical task structures

### Additional Google Services (Priority 3-4)
- **Google Keep**: Note creation and retrieval
- **Google Drive**: Document access and search
- **Google Photos**: Image retrieval and sharing
- **Google Sheets**: Data access and manipulation


## 6. Agent Architecture

### Hybrid Agentic RAG System (Priority 2)
- **Router Component**: Request classification and routing
- **Tool Library**: Extensible function collection
- **Vector Database**: Semantic knowledge storage
- **Memory Manager**: Context preservation system
- **Response Generator**: Natural language output formation

### Agent Communication Protocol (Priority 2)
- **Message Format**: Standardized internal communication
- **Error Handling**: Fail-safe operations
- **State Tracking**: Request progress monitoring
- **Analytics Hooks**: Performance measurement points
- **Debugging Interface**: Visibility into agent operations

### Specialized Agents (Priority 3)
- **Reminder Agent**: Core reminder functionality
- **Calendar Agent**: Google Calendar operations
- **Search Agent**: Information retrieval operations
- **Media Agent**: File and image handling
- **Small Talk Agent**: Conversational engagement

### Dual-LLM Preparation (Priority 4)
- **Request Classifier**: Complexity and type determination
- **Model Selection Logic**: Appropriate model routing
- **Response Merging**: Unified user experience
- **Performance Monitoring**: Model efficiency tracking
- **Cost Optimization**: Usage pattern analysis

# Implementation Strategy

## Phase 1: Core Reminder System (Weeks 1-4)

### Week 1: Foundation - COMPLETED
- Set up Next.js project structure
- Implement basic WhatsApp API integration
- Create reminder database schema
- Build simple message processing pipeline

### Week 2: Basic Reminder Functionality - COMPLETED
- Implement natural language parsing for reminders
- Create reminder creation, retrieval, and deletion flows
- Build notification scheduling system
- Develop basic error handling

### Week 3: Enhanced Understanding
- Integrate LLM for improved natural language processing
- Implement context tracking for multi-turn conversations
- Create more robust date/time parsing
- Add support for reminder modifications and deletion

### Week 4: Testing & Refinement
- Develop automated testing for reminder flows
- Implement logging and monitoring
- Create admin tools for system management
- User testing and feedback collection

## Phase 2: Platform Architecture (Weeks 5-8)

### Week 5: Agentic Foundation
- Design agent communication protocols
- Implement router component
- Create tool library infrastructure
- Build memory management system

### Week 6: Web Dashboard Basics
- Develop user authentication flow
- Create reverse OTP system
- Build basic reminder management UI
- Implement session handling

### Week 7: Google Authentication
- Implement OAuth flow for Google services
- Create token management system
- Build service connection UI
- Develop permission handling

### Week 8: Platform Abstractions & Telegram Integration
- Create messaging adapter interfaces
- Refactor WhatsApp-specific code
- Implement message queue system
- Build analytics tracking
- Begin Telegram bot implementation
  - Set up Telegram bot using BotFather
  - Implement basic command structure
  - Create platform-specific message formatters
  - Test core reminder functionality

## Phase 3: Google Integration (Weeks 9-12)

### Week 9: Calendar Integration
- Implement two-way sync with Google Calendar
- Build calendar-aware scheduling
- Create meeting creation flow
- Develop availability checking

### Week 10: Dashboard Enhancement
- Add calendar visualization
- Implement batch operations
- Create rich reminder formatting
- Build user preference management

### Week 11: Extended Google Services
- Implement Google Tasks integration
- Create note management with Google Keep
- Build basic Drive integration
- Develop cross-service search

### Week 12: Testing & Optimization
- Performance testing of integrations
- Security audit of authentication
- Optimization of database queries
- User experience testing

## Phase 4: Advanced Features (Weeks 13-16)

### Week 13: Vector Database
- Implement vector storage for user context
- Create embedding generation pipeline
- Build retrieval mechanisms
- Develop relevance ranking

### Week 14: Advanced NLU
- Enhance context understanding
- Implement entity relationship mapping
- Create ambiguity resolution
- Develop personalization system

### Week 15: Specialized Agents
- Implement reminder agent
- Build calendar agent
- Create search agent
- Develop media agent

### Week 16: Final Refinement
- End-to-end testing
- Performance optimization
- Documentation completion
- Launch preparation

# Technical Architecture Details

## Database Schema

### User Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  phone_number VARCHAR(15) UNIQUE NOT NULL,
  timezone VARCHAR(50) DEFAULT 'UTC',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_active TIMESTAMP,
  preferences JSONB
);
```

### Reminder Table
```sql
CREATE TABLE reminders (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  due_time TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  recurrence_pattern JSONB,
  google_calendar_id VARCHAR(255),
  google_task_id VARCHAR(255),
  tags TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Vector Store Tables
```sql
CREATE TABLE user_profiles (
  user_id UUID REFERENCES users(id),
  embedding VECTOR(1536),
  metadata JSONB
);

CREATE TABLE conversation_history (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  timestamp TIMESTAMP,
  embedding VECTOR(1536),
  content TEXT,
  metadata JSONB
);

CREATE TABLE memory_items (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  embedding VECTOR(1536),
  content TEXT,
  memory_type TEXT,
  relevance_score FLOAT,
  created_at TIMESTAMP,
  expires_at TIMESTAMP,
  metadata JSONB
);
```

## System Architecture

### API Layer
- **REST API**: Standard endpoints for web dashboard
- **GraphQL API**: Flexible queries for advanced dashboard features
- **Webhook API**: Entry points for messaging platforms
- **WebSocket API**: Real-time dashboard updates

### Microservices
- **Message Processor**: Handling incoming platform messages
- **Reminder Service**: Core reminder functionality
- **Notification Service**: Scheduled alert delivery
- **Integration Service**: Google API connectivity
- **Agent Orchestrator**: Managing agent communication

### Infrastructure
- **Database**: PostgreSQL with pgvector extension
- **Message Queue**: RabbitMQ for async processing
- **Cache Layer**: Redis for performance optimization
- **Search Engine**: Elasticsearch for text search
- **Object Storage**: S3-compatible for media files

# Documentation

## User Documentation
- WhatsApp command reference
- Dashboard user guide
- Google integration setup guide
- Common tasks walkthrough
- FAQ and troubleshooting

## Developer Documentation
- Architecture overview
- API reference
- Agent communication protocol
- Database schema
- Message format specification
- Testing guidelines

## Operations Documentation
- Deployment guides
- Monitoring setup
- Backup procedures
- Scaling strategies
- Security protocols

# Important Implementation Notes

## Security Considerations
- Encrypt user data at rest and in transit
- Implement strict OAuth scope limitations
- Regular security audits
- GDPR and data privacy compliance
- Rate limiting to prevent abuse

## Performance Optimization
- Implement database query caching
- Use read replicas for scaling
- Optimize LLM usage with caching
- Implement request batching
- Use edge caching for static assets

## Scalability Planning
- Horizontal scaling of stateless services
- Database sharding strategy
- Multi-region deployment plan
- Load balancing approach
- Failover mechanisms

## Monitoring & Analytics
- User engagement metrics
- Service health monitoring
- Error rate tracking
- Performance bottleneck identification
- Cost optimization analysis

## Future Expansion Considerations
- Voice assistant integration
- Additional messaging platform support
- Enterprise features
- Team collaboration tools
- Advanced AI capabilities with dual-LLM architecture