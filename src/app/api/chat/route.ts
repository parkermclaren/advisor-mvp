import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { generateEmbedding } from '../../lib/enhancedSearch'
import { maxProgress } from '../../lib/studentData'

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Initialize Supabase
import { createClient } from '@supabase/supabase-js'
const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Add type definitions for semantic search results
interface SearchChunk {
  content: string;
  similarity: number;
  metadata?: Record<string, unknown>;
}

interface QueryChunks {
  [key: string]: SearchChunk[];
}

export async function POST(req: Request) {
  try {
    console.log('\n=== Starting Chat Request ===')
    const { messages } = await req.json()
    const latestMessage = messages[messages.length - 1].content
    console.log('User Query:', latestMessage)

    // Generate base student context with full academic record
    console.log('\n=== Generating Student Context ===')
    const studentContext = `
Student Profile:
- Name: ${maxProgress.student_summary.name}
- Major: ${maxProgress.student_summary.major}
- Academic Standing: ${maxProgress.student_summary.academic_standing}
- Completed Credits: ${maxProgress.student_summary.completed_credits}
- GPA: ${maxProgress.student_summary.gpa}
- Career Goals: ${maxProgress.student_summary.career_goals.join(', ')}
- Academic Interests: ${maxProgress.student_summary.academic_interests.join(', ')}
- Current Term: ${maxProgress.current_term.term}
- Next Registration Term: ${maxProgress.current_term.next_registration_term}

Academic Progress:

First Year Core Requirements (Completed):
${maxProgress.requirements
  .filter(req => req.year_level === 1)
  .map(req => `- ${req.id}: ${req.title} (${req.credits_required || req.student_status.credits_completed} credits) - ${req.student_status.status.toUpperCase()}${req.student_status.grade ? ` - Grade: ${req.student_status.grade}` : ''}`)
  .join('\n')}

Sophomore Year Core Requirements:
${maxProgress.requirements
  .filter(req => req.year_level === 2)
  .map(req => `- ${req.id}: ${req.title} (${req.credits_required || req.student_status.credits_completed} credits) - ${req.student_status.status.toUpperCase()}${req.student_status.grade ? ` - Grade: ${req.student_status.grade}` : ''}`)
  .join('\n')}

Junior Year Core Requirements:
${maxProgress.requirements
  .filter(req => req.year_level === 3)
  .map(req => `- ${req.id}: ${req.title} (${req.credits_required || req.student_status.credits_completed} credits) - ${req.student_status.status.toUpperCase()}${req.student_status.grade ? ` - Grade: ${req.student_status.grade}` : ''}`)
  .join('\n')}

Senior Year Core Requirements:
${maxProgress.requirements
  .filter(req => req.year_level === 4)
  .map(req => `- ${req.id}: ${req.title} (${req.credits_required || req.student_status.credits_completed} credits) - ${req.student_status.status.toUpperCase()}${req.student_status.grade ? ` - Grade: ${req.student_status.grade}` : ''}`)
  .join('\n')}

Finance Electives Progress:
- Required Credits: 12
- Completed Credits: ${maxProgress.requirements.find(r => r.id === 'FINANCE_ELECTIVES')?.student_status.credits_completed || 0}
- Completed Courses:
${maxProgress.requirements
  .find(r => r.id === 'FINANCE_ELECTIVES')
  ?.student_status.courses_completed
  ?.map(course => `  * ${course.id} - Grade: ${course.grade} (${course.term})`)
  .join('\n') || 'None'}

General Education Requirements:
${maxProgress.requirements
  .filter(req => req.id.startsWith('GENED_'))
  .map(req => `- ${req.title} (${req.credits_required} credits) - ${req.student_status.status.toUpperCase()}
  ${req.student_status.course ? `Completed with: ${req.student_status.course.id} - Grade: ${req.student_status.course.grade}` : ''}`)
  .join('\n')}

Writing Designated Requirements:
- Required Credits: 12
- Completed Credits: ${maxProgress.requirements.find(r => r.id === 'WRITING_DESIGNATED')?.student_status.credits_completed || 0}
- Completed Courses:
${maxProgress.requirements
  .find(r => r.id === 'WRITING_DESIGNATED')
  ?.student_status.courses_completed
  ?.map(course => `  * ${course.id} - Grade: ${course.grade} (${course.term})`)
  .join('\n') || 'None'}
- Needs 200+ Level Course: ${maxProgress.requirements.find(r => r.id === 'WRITING_DESIGNATED')?.student_status.needs_200_level ? 'Yes' : 'No'}
    `.trim()
    console.log('Student Context Generated')

    // Analyze query against base context to determine needed RAG information
    console.log('\n=== Analyzing Query Against Context ===')
    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an AI analyzing a student query and comparing it to the student's base context and conversation history to determine what additional information is needed.
          
The knowledge base contains the following types of information:
1. Pre-generated recommended course schedules for next term
2. Complete lists of available courses for each General Education category
3. Detailed course descriptions for every course in the catalog
4. Program requirements (but this is already in the base context)

Given the student's context and their query, determine what specific information we need to retrieve from the knowledge base to provide a complete answer.

NOTE: if a students query involves recommending courses or academic planning, always include a query for Course Recommendations for 2025 Spring Term, in addition to any other queries needed to answer the student's question.

When analyzing follow-up questions:
1. Look at the previous messages to understand the context
2. If the question refers to specific courses or topics from previous messages, prioritize searching for information about those
3. Only search for new topics if they weren't covered in previous messages

Base Context:
${studentContext}

Respond with ONLY a JSON object containing a "queries" array of search queries that will retrieve the necessary information. For example:
{
  "queries": ["courses available for Values and Ethics requirement", "course description for BUS331", "recommended schedule for next term"]
}

Focus on retrieving information about requirements the student hasn't completed yet.
DO NOT include general analysis or explanation in your response.`
        },
        // Include previous messages
        ...messages.slice(-3), // Include last few messages for context
        {
          role: "user",
          content: latestMessage
        }
      ],
      temperature: 0,
      response_format: { type: "json_object" }
    })

    // Parse the response and ensure we have a queries array
    const parsedResponse = JSON.parse(analysisResponse.choices[0].message.content || '{"queries": []}')
    let searchQueries = parsedResponse.queries || []

    // Ensure searchQueries is always an array
    if (!Array.isArray(searchQueries)) {
      console.warn('Search queries is not an array, defaulting to empty array')
      searchQueries = []
    }

    // Perform semantic search for each identified information need
    console.log('\n=== Performing Semantic Search ===')
    const chunksByQuery: QueryChunks = {}
    
    for (const query of searchQueries) {
      console.log('Searching for:', query)
      const embedding = await generateEmbedding(query)
      console.log('Embedding generated successfully')
      
      const { data: chunks, error } = await supabase
        .rpc('match_chunks', {
          query_embedding: embedding,
          match_threshold: 0.7, // Increased threshold for better relevance
          match_count: 3 // Reduced chunks per query
        })

      if (error) {
        console.error('Error performing semantic search:', error)
        continue
      }

      if (chunks && chunks.length > 0) {
        chunksByQuery[query] = chunks
          .sort((a: SearchChunk, b: SearchChunk) => b.similarity - a.similarity)
          .slice(0, 3) // Keep top 3 most relevant chunks per query
      }
    }

    // Get the top 5 most relevant chunks across all queries
    const allChunks = Object.values(chunksByQuery)
      .flat()
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5)

    // Format retrieved chunks grouped by their originating query
    console.log('\n=== Processing Retrieved Chunks ===')
    console.log('Number of chunks retrieved:', allChunks.length)
    
    const ragResults = Object.entries(chunksByQuery)
      .map(([query, chunks]) => {
        const relevantChunks = chunks.filter(chunk => 
          allChunks.some(topChunk => topChunk.content === chunk.content)
        )
        if (relevantChunks.length === 0) return null

        return `Search Query: "${query}"\n${'-'.repeat(query.length + 15)}\n${
          relevantChunks
            .map(chunk => 
              `[Relevance: ${(chunk.similarity * 100).toFixed(1)}%]\n${chunk.content}`
            )
            .join('\n\n')
        }`
      })
      .filter(Boolean)
      .join('\n\n' + '='.repeat(50) + '\n\n')

    // Get completion from OpenAI
    console.log('\n=== Calling OpenAI ===')
    console.log('Total context length:', studentContext.length + ragResults.length)
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are Max's friendly AI academic advisor at Endicott College. Be conversational and natural, like a real advisor would be.

Key Behaviors:
1. Be Personal and Engaging:
   - Always refer to the student by their first name (extracted from their full name)
   - Use a friendly, conversational tone while maintaining professionalism
   - Ask clarifying questions when the student's request is vague or could have multiple interpretations
   - Show genuine interest in the student's academic journey

2. Chain of Thought Analysis:
   First, analyze the student's current progress from the base context:
   - Look at the "General Education Requirements" section
   - Identify which requirements are marked as NOT_STARTED or IN_PROGRESS
   - Note any requirements marked as COMPLETED (to avoid recommending those)

Then, examine the retrieved course lists:
   - Look at ONLY the course lists provided in the "Retrieved Information" section below
   - Each section starts with "Search Query:" followed by relevant information
   - Pay attention to the relevance scores to prioritize more relevant information
   - Match these available courses to the incomplete requirements identified above
   - Think of what courses would be the best fit for the student given their goals and interests
   - Do NOT recommend any courses that aren't explicitly listed in the retrieved chunks

3. Make Smart Recommendations:
   - Never recommend courses the student has already completed
   - Filter out requirements they've already satisfied
   - For EACH recommended course, explain:
     * Why it's valuable for their specific career goals/interests
     * How it builds relevant skills for their field
     * Why it makes sense to take it next semester specifically
   - When suggesting electives, prioritize alignment with:
     * Stated career goals (e.g., venture capital, technology)
     * Academic interests
     * Skill development needs for their target career

4. Format Responses Clearly:
   - Use ## for main section headings
   - Use bullet points with "-" for lists
   - Bold important points
   - Keep spacing minimal but clear
   - Use a conversational tone while maintaining structure

Remember: 
- Ground ALL recommendations in the retrieved information
- Always recommend the most relevant courses according to the student's goals and interests
- NEVER make up information or make assumptions
- Focus on answering the specific question asked
- If critical information is missing from the RAG results, say so
- Pay attention to the relevance scores when choosing between different options

Base Context:
${studentContext}

Retrieved Information:
${ragResults}`
        },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 1000
    })

    console.log('\n=== Response Generated ===')
    console.log('Response length:', response.choices[0].message.content?.length || 0)
    console.log('Response preview:', response.choices[0].message.content?.substring(0, 100) + '...')

    return NextResponse.json(response.choices[0].message)
  } catch (error) {
    console.error('\n=== Error in Chat Endpoint ===')
    console.error('Full error:', error)
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    )
  }
} 