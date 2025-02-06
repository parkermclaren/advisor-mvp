# Product Requirements Document (PRD) for AI Advisor App MVP

## Overview
The AI Advisor App is an AI-powered academic advising tool designed to enhance the student experience by providing personalized, real-time guidance on course recommendations, degree audits, and academic planning. Developed by current students for a student audience, the app simulates the role of a human advisor through a sleek chat interface. The long-term vision includes deep integration with Workday's Student Information System (SIS) and the ability for the AI advisor to take agentic actions (e.g., enrolling students in courses, crafting schedules).

## Goals & Objectives
- **Enhance Student Experience:** Deliver a modern, intuitive, and engaging user interface where students can easily chat with an AI advisor.
- **Proof-of-Concept for Pitch:** Validate the concept with a robust MVP that demonstrates the core user journey and gathers feedback.
- **Future Integration Roadmap:** Lay the foundation for future integration with Workday APIs and implementation of agentic features that enable transactional actions.

## MVP Scope
For the MVP, the core feature is a chat interface where students can ask academic advising questions. The system will:
- Accept natural language queries from students.
- Retrieve relevant context from a curated knowledge base using a Retrieval-Augmented Generation (RAG) system.
- Provide accurate and helpful responses based on simulated academic data.
- Use the GPT-4o model for generating responses.
- The LLM should be able to answer questions such as:
    - What classes should I take next semester?
    - What are the prerequisites for BUS 311 - Corporate Finance?
    - Can you give me a degree audit?
    - How many credits do I have left to complete my major?
    - I am interested in taking an art class, what are my options?

### Data Sources (Mock Data)
- **Course Catalogs & Descriptions:** Scraped from the Endicott website, including course codes, titles, credits, prerequisites, and descriptions.
- **Program Requirements:** Program outlines for the Finance Major (and potentially others) including credit requirements, required courses, and elective options for each year.
- **Student Transcripts/Course Data:** Sample data from Max’s Stellic account to simulate individual degree progress.

### RAG System Implementation
- **Data Collection & Preparation:** 
  - Scrape and/or manually compile course catalogs, program requirements, and transcript data.
  - Clean, structure, and convert this data into natural language "chunks" that provide clear context.
- **Storage in Supabase:** 
  - Store these chunks in a Supabase PostgreSQL database, organized by logical sections (e.g., "First Year Requirements", "Sophomore Year Requirements", etc.).
- **Vectorization & Retrieval:**
  - Use an embedding model to convert each chunk into vector representations.
  - Integrate with a vector database (or use Supabase with appropriate extensions) to support similarity searches.
  - When a student asks a question, embed the query, retrieve the most relevant chunks, and pass this contextual information along with the query to the LLM.
- **Prompt Construction:**
  - Dynamically assemble an augmented prompt that includes student query context and relevant academic information.
  - Feed the prompt into an LLM (e.g., GPT-4) to generate an informed, natural language response.

## Core Features

### 1. Chat Interface
- **User Interaction:**
  - A modern, sleek chat UI where students can type their academic advising questions.
  - Immediate greeting (e.g., "Welcome, Parker") and clear instructions.
- **UI Elements:**
  - Prominent degree progress visualization (initially a horizontal progress bar, with plans for interactive enhancements in future iterations).
  - Chat input box modeled after ChatGPT’s UI.
  - Responsive design with a primarily white background, accented by gradients of green and blue, using an academic-inspired font.

### 2. RAG System Integration
- **Retrieval Component:**
  - Upon receiving a student query, the system performs similarity searches over the stored academic data.
  - Returns context-rich chunks (e.g., course descriptions, year-specific requirements) relevant to the query.
- **LLM Augmentation:**
  - The augmented prompt, containing both the student’s question and the relevant academic context, is processed by the LLM to generate a detailed response.
- **Demonstration:**
  - Although real-time Workday data is not yet available, the system will simulate the full data retrieval and response process using mock data.

## Future Roadmap

### Workday API Integration
- **Direct Data Access:**
  - Once Workday is integrated with the institution and API credentials are available, transition from using mock data to real-time queries against Workday’s API.
  - Structure the data and retrieval process to match Workday’s API schema, ensuring a seamless transition.
- **Enhanced Features:**
  - Integrate transactional endpoints for agentic features (e.g., course enrollment, schedule management).
  - Allow the AI advisor to perform actions on behalf of students after confirmation, updating their degree progress in real time.
  
### Agentic Capabilities
- **Automated Actions:**
  - Implement functionality where the AI advisor can suggest courses, then (with user confirmation) trigger actions to enroll the student in selected classes.
- **Enhanced Visualization:**
  - Expand the degree progress UI into an interactive roadmap or timeline that provides detailed insights and gamification elements.
  
## User Journey Example
1. **Login & Welcome:**
   - Student logs in and is greeted with "Welcome, Parker".
   - The degree progress bar is immediately visible, showing overall progress.
2. **Chat Interaction:**
   - The student types: "Which classes should I take next semester?"
   - The system uses the RAG module to retrieve relevant chunks (e.g., first-year requirements) and constructs a prompt.
   - The LLM generates a response with course recommendations based on simulated academic data.
3. **Simulated Enrollment:**
   - (Future enhancement) The student can click a button to "Enroll" in a recommended course.
   - The UI updates to reflect the change in degree progress, simulating an enrollment action.

## Technical Stack & Considerations
- **Frontend:** Next.js with React for building the sleek, responsive UI.
- **Backend & Storage:** Supabase for managing structured academic data (stored in JSON format) and potentially handling vector data or linking to a dedicated vector database.
- **LLM Integration:** Integration with an LLM (e.g., GPT-4o) for generating dynamic responses.
- **Embedding & Vector Search:** Use an embedding model (such as OpenAI’s embeddings or Sentence Transformers) and integrate with a vector database (e.g., Pinecone or FAISS) for the retrieval component.
- **Mock Data Strategy:** Initially use scraped and manually compiled data from the Endicott website and Max’s Stellic data as mock data for all academic content.

## Conclusion
The MVP of the AI Advisor App focuses on delivering a seamless chat experience where students receive personalized, context-rich academic advice. The RAG system, built using mock data, will simulate the retrieval of detailed academic information to augment the LLM’s responses. While the current scope centers on a conversational interface and enhanced user experience, the roadmap includes full integration with Workday’s API and agentic features for course enrollment, ultimately transforming academic advising through advanced AI capabilities.

