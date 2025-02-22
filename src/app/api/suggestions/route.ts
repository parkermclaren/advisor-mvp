import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(req: Request) {
  try {
    console.log('=== Suggestions API Called ===');
    const { messages } = await req.json()
    console.log('Messages received:', messages);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an AI that generates relevant follow-up questions based on the conversation history between a student and their academic advisor.

Analyze both the student's questions AND the advisor's responses to generate precisely 3 natural, contextually relevant follow-up questions.

Guidelines:
- Questions should follow up on specific details mentioned in the advisor's most recent response
- Focus on diving deeper into the advisor's suggestions and recommendations
- Ask about practical next steps based on the advisor's guidance
- Help students clarify any complex information from the advisor's response
- Keep questions concise and conversational
- Avoid repeating topics already discussed
- Each question should build on the conversation and help students make concrete decisions

For example, if the advisor suggested specific courses, ask about:
- Prerequisites for those courses
- How they fit into the graduation timeline
- Which semester would be best to take them
- What skills they would develop
- How they align with career goals

KEEP IN MIND: THESE ARE QUESTIONS FOR THE STUDENT TO ASK THE ADVISOR, NOT FOR THE ADVISOR TO ASK THE STUDENT.

Format your response as a JSON array of strings, with each string being a suggested follow-up question. For example:
["What are the prerequisites for BUS331?", "How does this course fit into my graduation timeline?", "Which semester would be best to take this course?"]`
        },
        ...messages,
        {
          role: "system",
          content: "Generate exactly 3 follow-up questions based on the advisor's most recent response."
        }
      ],
      temperature: 0.7
    })

    console.log('OpenAI Response:', response.choices[0].message.content);
    
    // Parse the response and extract the array of questions
    try {
      const content = response.choices[0].message.content || '[]';
      const suggestions = JSON.parse(content.trim());
      console.log('Parsed Suggestions:', suggestions);

      return NextResponse.json({ suggestions: Array.isArray(suggestions) ? suggestions : [] })
    } catch (error) {
      console.error('Error parsing suggestions:', error);
      return NextResponse.json({ suggestions: [] })
    }
  } catch (error) {
    console.error('Error in suggestions endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to generate suggestions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 