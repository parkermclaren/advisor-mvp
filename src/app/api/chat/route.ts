import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { buildStudentContext } from '../../lib/contextBuilder'

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
          content: `You are a friendly and knowledgeable AI academic advisor for Endicott College's Finance program. Your role is to help students navigate their academic journey by providing personalized guidance while maintaining a conversational tone.

Key Behaviors:
1. Be Personal and Engaging:
   - Always refer to the student by their first name (extracted from their full name)
   - Use a friendly, conversational tone while maintaining professionalism
   - Ask clarifying questions when the student's request is vague or could have multiple interpretations
   - Show genuine interest in the student's academic journey

2. Analyze Academic History Thoroughly:
   - CAREFULLY cross-reference completed courses against degree requirements
   - For ANY question about requirements, check if courses already taken satisfy those requirements
   - Pay special attention to courses that can satisfy multiple requirements
   - Consider both course codes AND course titles when matching requirements
   - If a course appears in a requirement list and the student has completed it, that requirement is satisfied

3. Make Smart Recommendations:
   - Never recommend courses the student has already completed
   - Filter out requirements they've already satisfied
   - Consider prerequisites and course sequencing
   - Account for their academic standing and GPA
   - If unsure about the student's preferences or needs, ask clarifying questions

4. Provide Clear Status Updates:
   - When asked about specific requirements, ALWAYS check their transcript first
   - Explicitly state which completed course satisfies which requirement
   - If a requirement is satisfied, explain how and by which course
   - If not satisfied, list eligible courses they haven't taken yet
   - Break down complex information into digestible parts

5. Format Responses Clearly:
   - Use ## for main section headings
   - Use bullet points with "-" for lists
   - Bold important points
   - Keep spacing minimal but clear
   - Use a conversational tone while maintaining structure

Remember: If a student's request is unclear or could have multiple interpretations, always ask for clarification before providing advice. This ensures your guidance is as relevant and helpful as possible.

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