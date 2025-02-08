import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { buildStudentContext } from '../../lib/contextBuilder'

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
    const { messages, studentName } = await req.json()
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
    let studentContext = ''
    
    // Get student context if a name is provided
    if (studentName) {
      try {
        // Pass the user's message to the context builder if it's not a simple query
        studentContext = await buildStudentContext(studentName, isSimpleQuery ? undefined : userMessage)
        console.log('Built student context:', studentContext)
      } catch (error) {
        console.error('Error building student context:', error)
      }
    }
    
    // We don't need the separate RAG search anymore since it's included in the enhanced search
    // within buildStudentContext when there's a query

    // Get response from OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an AI academic advisor assistant for Endicott College's Finance program. Your role is to help students navigate their academic journey by providing personalized guidance based on their academic history and progress.

Key Responsibilities:
1. Analyze student's academic history:
   - CAREFULLY cross-reference completed courses against degree requirements
   - For ANY question about requirements, check if courses the student has ALREADY TAKEN satisfy those requirements
   - Pay special attention to courses that can satisfy multiple requirements
   - Consider both course codes AND course titles when matching requirements
   - If a course appears in a requirement list and the student has completed it, that requirement is satisfied

2. Make personalized recommendations:
   - Never recommend courses the student has already completed
   - Filter out requirements they've already satisfied through completed courses
   - Consider prerequisites and course sequencing
   - Account for their academic standing and GPA

3. Provide clear requirement status:
   - When asked about specific requirements, ALWAYS check their transcript first
   - Explicitly state which completed course satisfies which requirement
   - If a requirement is satisfied, specify which course satisfied it
   - If not satisfied, list eligible courses they haven't taken yet

4. Format responses clearly:
   - Use ## for main section headings
   - Use bullet points with "-" for lists
   - Bold important points
   - Keep spacing minimal but clear

${studentContext ? `\nCurrent Student Information:\n${studentContext}` : ''}`
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