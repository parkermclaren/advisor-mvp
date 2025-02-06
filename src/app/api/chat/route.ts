import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()
    const userMessage = messages[messages.length - 1].content
    console.log('User message:', userMessage)

    // Simple greeting patterns
    const simplePatterns = [
      /^hi\b/i,
      /^hello\b/i,
      /^hey\b/i,
      /^help\b/i,
      /advise me$/i,
      /help me$/i
    ]

    // Check if this is a simple query that doesn't need RAG
    const isSimpleQuery = simplePatterns.some(pattern => pattern.test(userMessage.trim()))

    let context = ''
    
    if (!isSimpleQuery) {
      // Generate embeddings for the user's question
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: userMessage,
      })
      const embedding = embeddingResponse.data[0].embedding
      console.log('Generated embedding length:', embedding.length)

      // Search for relevant chunks in Supabase
      const { data: chunks, error: matchError } = await supabase
        .rpc('match_chunks', {
          query_embedding: embedding,
          match_threshold: 0.5,
          match_count: 5
        })
      console.log('Matched chunks:', chunks)
      if (matchError) console.error('Error matching chunks:', matchError)

      // Organize chunks by category
      const categoryMap = new Map()
      
      chunks?.forEach((chunk: any) => {
        const category = chunk.metadata?.category || 'Uncategorized'
        if (!categoryMap.has(category)) {
          categoryMap.set(category, [])
        }
        categoryMap.get(category).push({
          content: chunk.content,
          title: chunk.title,
          similarity: chunk.similarity
        })
      })

      // Format context with clear category boundaries
      context = Array.from(categoryMap.entries())
        .map(([category, chunks]) => {
          const categoryContent = chunks
            .map((chunk: any) => chunk.content)
            .join('\n')
          
          return `CATEGORY: ${category}\n${categoryContent}`
        })
        .join('\n\n---\n\n')

      console.log('Organized context being sent to GPT:', context)
    }

    // Get response from OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an AI academic advisor assistant for Endicott College's Finance program. Your role is to help students navigate their academic journey in a conversational and supportive way.

Key Behaviors:
1. For vague or general queries:
   - Ask clarifying questions first
   - Don't dump all program information at once
   - Example questions:
     • "Are you looking for information about a specific year's requirements?"
     • "Would you like to know about core courses, electives, or prerequisites?"
     • "Are you planning your upcoming semester?"

2. Keep initial responses concise and focused:
   - Don't overwhelm with too much information at once
   - Break down complex information into digestible parts
   - Wait for student to specify what they need

3. RESPONSE FORMATTING:
   - Use ## for main section headings with only one line break before them
   - Use bullet points with "-" for lists
   - Format course codes consistently (e.g., "- ART 101 - Course Name")
   - Keep spacing minimal but clear - use single line breaks between sections
   - Use bold for emphasis on important points
   - Avoid excessive line breaks between sections

4. CONTENT ORGANIZATION:
   - Start with a brief introduction
   - Group similar courses together under clear headings
   - End with any relevant notes or recommendations
   - Keep formatting compact while maintaining readability

5. ACCURACY GUIDELINES:
   - Only include information that's explicitly in the provided context
   - Be precise with course codes and names
   - Pay careful attention to which category/requirement each course fulfills
   - When recommending courses, ONLY suggest courses that are explicitly listed under the requested requirement category
   - If a course appears in multiple categories, specify which requirements it fulfills
   - If something is unclear, say so and recommend consulting an advisor

6. STUDENT-FRIENDLY LANGUAGE:
   - Use a friendly, encouraging tone
   - Acknowledge student questions
   - Offer relevant follow-up suggestions
   - Break down complex requirements into digestible parts

${context ? `Use this information to provide guidance:\n\n${context}` : 'For this general query, focus on understanding the student\'s needs before providing specific program information.'}`
        },
        ...messages
      ],
      temperature: 0.7,
    })

    return NextResponse.json({ message: completion.choices[0].message.content })
  } catch (error) {
    console.error('Error in chat endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to process your request' },
      { status: 500 }
    )
  }
} 