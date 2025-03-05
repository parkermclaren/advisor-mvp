# Advisor MVP - Application Overview

This document provides a comprehensive overview of the current state of the Advisor MVP application, including all features, frontend and backend components, and database structure.

## Application Purpose

The Advisor MVP is an AI-powered academic advising application designed to help students navigate their academic journey. It provides personalized course recommendations, degree progress tracking, and academic guidance through a conversational interface.

## Features

### Core Features

1. **AI-Powered Chat Interface**
   - Conversational UI for students to ask academic questions
   - Persistent chat history across sessions
   - Context-aware responses based on student data
   - Suggested follow-up prompts that persist across sessions

2. **Student Profile Management**
   - Student information display
   - Academic progress tracking
   - Goals and interests storage

3. **Course Recommendations**
   - Personalized course suggestions based on:
     - Degree requirements
     - Student interests
     - Academic history
     - Career goals

4. **Degree Audit**
   - Visualization of completed requirements
   - Tracking of in-progress requirements
   - Identification of remaining requirements

5. **Onboarding Process**
   - Collection of student goals
   - Academic interests identification
   - Schedule priorities and commitments

## Frontend Components

### Pages

1. **Chat Page (`/chat`)**
   - Main interaction interface
   - Chat history display
   - Message input
   - Suggested follow-up prompts

2. **Onboarding Page**
   - Multi-step form for collecting student information
   - Goals and interests input

3. **Dashboard (Home Page)**
   - Overview of academic progress
   - Quick access to recent chats
   - Degree audit summary

### Key Components

1. **ChatInterface**
   - Handles message display and input
   - Manages chat state
   - Integrates with suggested prompts

2. **ChatSidebar**
   - Displays list of chat sessions
   - Allows navigation between chats
   - New chat creation

3. **SuggestedPrompts / ChatSuggestedPrompts**
   - Displays contextual follow-up suggestions
   - Horizontal scrolling interface
   - Persists suggestions per chat

4. **ProfileMenu**
   - User profile access
   - Settings and preferences

5. **RecentChats**
   - Quick access to recent conversations

## Backend Components

### API Routes

1. **Chat API (`/api/chat`)**
   - Processes user messages
   - Generates AI responses using OpenAI
   - Stores chat history

2. **Chat Messages API (`/api/chat-messages`)**
   - Retrieves message history for a specific chat

3. **Chat Sessions API (`/api/chat-sessions`)**
   - Creates and manages chat sessions
   - Lists available chats for a user

4. **Suggestions API (`/api/suggestions`)**
   - Generates follow-up suggestions using OpenAI
   - Retrieves stored suggestions for a chat

5. **Save Suggestions API (`/api/save-suggestions`)**
   - Stores generated follow-up suggestions in the database

6. **Onboarding API (`/api/onboarding`)**
   - Processes and stores student profile information

### RAG Pipeline

The application uses a Retrieval-Augmented Generation (RAG) pipeline to enhance AI responses with relevant academic information:

1. **Academic Content Chunking**
   - Course descriptions and requirements are split into manageable chunks

2. **Vector Embeddings**
   - Text chunks are converted to vector embeddings for semantic search

3. **Enhanced Search**
   - User queries are matched against relevant academic content
   - Results are incorporated into AI prompt context

## Database Structure

The application uses Supabase as its database provider. Here's the current database schema:

### Tables

1. **`academic_chunks`**
   - Stores academic content for RAG system
   ```
   id: bigint (PRIMARY KEY)
   title: text (NOT NULL)
   content: text (NOT NULL)
   metadata: jsonb
   embedding: vector
   created_at: timestamp with time zone (NOT NULL)
   ```

2. **`chat_sessions`**
   ```
   chat_id: uuid (PRIMARY KEY)
   user_id: uuid
   chat_name: text
   created_at: timestamp with time zone
   updated_at: timestamp with time zone
   ```

3. **`chat_messages`**
   ```
   message_id: integer (PRIMARY KEY)
   chat_id: uuid (FOREIGN KEY -> chat_sessions.chat_id)
   role: character varying
   content: text
   created_at: timestamp with time zone
   ```

4. **`student_profiles`**
   ```
   student_id: uuid (PRIMARY KEY)
   goals: jsonb
   interests: jsonb
   schedule_priorities: jsonb
   commitments: jsonb
   updated_at: timestamp with time zone
   ```

5. **`student_transcripts`**
   ```
   transcript_id: uuid (PRIMARY KEY)
   student_name: text
   completed_credits: integer
   gpa: numeric
   academic_standing: text
   ```

6. **`transcript_terms`**
   ```
   term_id: uuid (PRIMARY KEY)
   transcript_id: uuid (FOREIGN KEY -> student_transcripts.transcript_id)
   term_name: text
   courses: jsonb
   term_gpa: numeric
   credits_earned: integer
   ```

7. **`course_recommendations`**
   ```
   id: uuid (PRIMARY KEY)
   student_id: uuid (FOREIGN KEY -> student_transcripts.transcript_id)
   course_code: text
   course_name: text
   reason: text
   priority: integer
   created_at: timestamp with time zone
   ```

8. **`program_requirements`**
   ```
   id: text (PRIMARY KEY)
   title: text
   description: text
   credits_required: integer
   type: text
   ```

9. **`student_progress`**
   ```
   id: uuid (PRIMARY KEY)
   student_id: uuid (FOREIGN KEY -> student_transcripts.transcript_id)
   requirement_id: text (FOREIGN KEY -> program_requirements.id)
   status: text
   credits_completed: integer
   courses_completed: jsonb
   ```

10. **`student_requirements_status`**
    ```
    id: uuid (PRIMARY KEY)
    student_id: uuid (FOREIGN KEY -> student_transcripts.transcript_id)
    requirement_id: text (FOREIGN KEY -> program_requirements.id)
    status: text
    details: jsonb
    ```

11. **`course_alignments`**
    ```
    id: uuid (PRIMARY KEY)
    course_code: text
    requirement_id: text (FOREIGN KEY -> program_requirements.id)
    credits: integer
    ```

12. **`suggested_follow_ups`** (Recently Added)
    ```
    id: serial (PRIMARY KEY)
    chat_id: uuid (FOREIGN KEY -> chat_sessions.chat_id)
    prompts: jsonb (NOT NULL)
    created_at: timestamp with time zone (NOT NULL)
    updated_at: timestamp with time zone
    ```

## Technology Stack

- **Frontend**: Next.js, React, TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4o-mini
- **Vector Database**: Supabase pgvector extension
- **Authentication**: Supabase Auth

## Current Development Status

The application is currently in MVP (Minimum Viable Product) stage with core functionality implemented. Recent improvements include:

1. Enhanced RAG pipeline for more accurate academic advising
2. Persistent suggested follow-up prompts for improved UX
3. Streamlined chat interface with better context management

## Next Steps

Potential areas for future development:

1. Enhanced student profile customization
2. More detailed degree audit visualization
3. Integration with university registration systems
4. Mobile application development
5. Expanded analytics for student success tracking 