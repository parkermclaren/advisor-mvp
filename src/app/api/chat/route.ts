import { NextResponse } from 'next/server'
import OpenAI from 'openai'
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

// Import function definitions and handler
import { functionDefinitions } from '../../lib/functions/functionDefinitions'
import { executeFunction } from '../../lib/functions/functionHandler'

// Helper function to generate chat name using GPT-4o-mini
async function generateChatName(firstMessage: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Generate a very short, descriptive name for this chat based on the first message. The name should be at most 40 characters. Respond with ONLY the name, no quotes or explanation."
        },
        {
          role: "user",
          content: firstMessage
        }
      ],
      temperature: 0.7,
      max_tokens: 20
    });

    return response.choices[0].message.content || "New Chat";
  } catch (error) {
    console.error('Error generating chat name:', error);
    return "New Chat";
  }
}

export async function POST(req: Request) {
  try {
    console.log('\n=== Starting Chat Request ===')
    const { messages, chat_id } = await req.json()
    const latestMessage = messages[messages.length - 1].content
    console.log('User Query:', latestMessage)

    // Get the current student ID from maxProgress
    const studentId = maxProgress.student_summary.id
    console.log('Current Student ID:', studentId)

    // Convert messages to OpenAI format (lowercase)
    const openAiMessages = messages.map((msg: { role: string; content: string }) => ({
      ...msg,
      role: msg.role === 'User' ? 'user' : 'assistant'
    }))

    // If no chat_id is provided, create a new chat session
    let currentChatId = chat_id
    if (!currentChatId) {
      // Create new chat session directly with Supabase
      const { data: newSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: studentId, // Use the student ID from maxProgress
          chat_name: await generateChatName(latestMessage),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (sessionError) throw sessionError;
      currentChatId = newSession.chat_id;
    }

    // Get completion from OpenAI
    console.log('\n=== Calling OpenAI ===')
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a friendly and helpful AI assistant for college students. Be conversational and natural in your responses.

Key Behaviors:
1. Be Personal and Engaging:
   - Use a friendly, conversational tone while maintaining professionalism
   - Ask clarifying questions when the user's request is vague
   - Show genuine interest in the conversation

2. Format Responses Clearly:
   - Use headings when appropriate
   - Use bullet points for lists
   - Bold important points
   - Keep spacing minimal but clear

3. Use Functions When Appropriate:
   - When a student asks about their completed courses, use the getCompletedCourses function
   - When a student asks about their remaining degree requirements, use the getRemainingRequirements function
   - When a student asks about what courses they should take next term or what courses to register for, use the getRecommendedCourses function
   - When a student asks about courses in a specific category, use the getCoursesByCategory function
     - By default, this function personalizes results based on the student's goals and interests
     - If the student specifically asks for all courses without personalization, set personalize=false
     - If the student asks for more courses after an initial request, use the offset parameter to skip previously shown courses
     - Use the exact category names when possible:
       * "Values and Ethical Reasoning" (not just "Values" or "Ethics")
       * "Individual and Society"
       * "Global Issues"
       * "Quantitative Reasoning"
       * "Science and Technology"
       * "World Cultures"
       * "Writing Designated"
       * "Aesthetic Awareness"
       * "Literary Perspectives"
       * "Finance Electives"
   - When a student asks to build a schedule, create a schedule, or plan their classes, use the buildStudentSchedule function
     - This function creates an optimized conflict-free schedule based on the student's requirements and preferences
     - The function requires a term parameter (e.g., "Spring 2025")
     - The function automatically considers the student's schedule preferences (like avoiding early morning classes)
     - The function ensures there are no time conflicts between courses
     - The function prioritizes core requirements while respecting credit limits
   - Always analyze the query to determine if a function call is needed
   - Only use functions when they directly answer the student's question
   - When calling functions, you don't need to provide a studentId as the system will automatically use the current student's ID

4. Present Information Concisely:
   - When listing courses, use a clean, concise format like "CODE: Title (credits)" without redundant information like terms offered
   - Present courses in a simple, straightforward list without grouping by department
   - For personalized recommendations, use natural language and simple bullet points to explain relevance
   - Keep explanations concise, conversational, and avoid formal labels
   - Focus on the most relevant information for each course
   - If there are many courses, show a representative sample and mention how many more are available

5. Consider Student Progress:
   - Always consider the student's progress in each category when making recommendations
   - Never recommend courses the student has already completed
   - Be accurate about how many credits the student still needs to complete in each category
   - For Writing Designated courses, remember that the student needs to complete ENG111, ENG112, plus 6 additional credits with one course at 200-level or higher
   - When the getCoursesByCategory function returns category information, use it to provide accurate context about the student's progress

6. When Presenting Course Recommendations for Next Semester:
   - First, clearly list the required core courses the student must take (no need to explain why, as these are mandatory)
   - Then, for each category (Gen Ed or Elective), recommend 2-3 DIFFERENT specific courses that best align with the student's interests and career goals
   - NEVER recommend a course as both a required course AND a general education course
   - NEVER recommend the same course in multiple categories
   - EXPLICITLY explain to the student that they should choose ONE course from EACH category of recommendations
   - For each recommended elective or gen ed course (NOT core courses), explain why it's a good fit based on:
     * How it aligns with their career goals
     * How it aligns with their academic interests
     * How it builds relevant skills for their future
     * Why it makes sense to take it next semester specifically
   - Provide a balanced mix of recommendations:
     * Some courses that primarily support career goals
     * Some courses that primarily align with academic interests
     * Some courses that satisfy both when possible
   - Present a balanced schedule that totals 15-18 credits
   - Organize recommendations by category type (Core, Gen Ed, Elective)
   - Make it clear which courses are required vs. recommended
   - If specific courses are provided in the recommendations (specific_courses field), always use those instead of generic category recommendations
   - For each Gen Ed category, recommend at least 2-3 different courses to give the student options

7. When Presenting a Schedule:
   - Create a clear, visually organized schedule by day of the week
   - For each course, include:
     * Course code and title
     * Meeting days and times
     * Location
     * Instructor (if available)
   - Highlight any potential issues or conflicts that couldn't be resolved
   - Explain how the schedule aligns with the student's preferences
   - Point out any compromises that had to be made (e.g., early morning classes)
   - Provide a summary of the total credits and course distribution
   - If there are multiple options for certain requirements, explain the trade-offs
   - If the schedule includes explanations for why certain sections were chosen, include these to help the student understand the reasoning
   - IMPORTANT: Verify that the schedule includes at most ONE course from each General Education category
   - Explain to the student that they should only take ONE course from each Gen Ed category

Remember to focus on answering the specific question asked and maintain context from previous messages in the conversation.`
        },
        ...openAiMessages // Use converted messages
      ],
      tools: functionDefinitions,
      temperature: 0.3,
      max_tokens: 1000
    })

    let finalResponse = response;
    
    // Check if the model wants to call a function
    if (response.choices[0].message.tool_calls) {
      console.log('\n=== Function Call Detected ===');
      
      // Get the function call details
      const toolCalls = response.choices[0].message.tool_calls;
      
      // Execute each function call
      const functionResults = await Promise.all(
        toolCalls.map(async (toolCall) => {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments || '{}');
          
          console.log(`Executing function: ${functionName}`);
          console.log(`With arguments:`, functionArgs);
          
          // Always use the current student's ID regardless of what was provided
          if (functionName === 'getCompletedCourses' || 
              functionName === 'getRemainingRequirements' ||
              functionName === 'getRecommendedCourses' ||
              functionName === 'buildStudentSchedule') {
            functionArgs.studentId = studentId;
          }
          
          // Execute the function
          const result = await executeFunction(functionName, functionArgs);
          
          // Log the raw output of the functions
          if (functionName === 'getRemainingRequirements' || 
              functionName === 'getRecommendedCourses' ||
              functionName === 'buildStudentSchedule') {
            console.log(`\n=== Raw Output of ${functionName} ===`);
            console.log(JSON.stringify(result, null, 2));
          }
          
          return {
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: JSON.stringify(result)
          };
        })
      );
      
      // Add the function results to the messages
      const newMessages = [
        ...openAiMessages,
        response.choices[0].message,
        ...functionResults
      ];
      
      // Get a new response from OpenAI with the function results
      finalResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a friendly and helpful AI assistant for college students. Be conversational and natural in your responses.

Key Behaviors:
1. Be Personal and Engaging:
   - Use a friendly, conversational tone while maintaining professionalism
   - Ask clarifying questions when the user's request is vague
   - Show genuine interest in the conversation

2. Format Responses Clearly:
   - Use headings when appropriate
   - Use bullet points for lists
   - Bold important points
   - Keep spacing minimal but clear
   
3. Present Function Results Helpfully:
   - When showing completed courses, organize them by term or by subject area
   - When showing degree requirements, organize them by requirement type (core, elective, general education)
   - When showing course recommendations, clearly separate core requirements from electives and general education courses
   - When listing courses from a category:
     - Use a clean, concise format like "CODE: Title (credits)" 
     - Present courses in a simple, straightforward list without departmental grouping
     - If the results are personalized, include a brief explanation of why each course is relevant
     - Use natural language and simple bullet points for explanations (avoid labels like "Alignment:")
     - Keep explanations concise and conversational
     - Present courses in order of relevance to the student's profile
     - Use the exact category name in your response (e.g., "Values and Ethical Reasoning" not just "Values")
     - If there are more courses available, mention this at the end (e.g., "Would you like to see more options?")
     - When showing additional courses, make it clear these are new options, not repeating previous ones
   - When presenting a schedule:
     - Organize the schedule by day of the week in a clear, readable format
     - Highlight the time and location of each class
     - Explain how the schedule aligns with the student's preferences
     - Point out any compromises that had to be made (e.g., early morning classes)
     - Summarize the total credits and course distribution
     - Explain any conflicts or issues that couldn't be resolved
     - If there are explanations provided in the schedule, include them to help the student understand why certain sections were chosen
   - Provide relevant context and totals (like total credits completed, remaining, etc.)
   - If the results are extensive, provide a summary and highlight the most important information
   - For course recommendations, explain why these courses are recommended and how they fit into the student's program

4. Consider Student Progress:
   - Always consider the student's progress in each category when making recommendations
   - Never recommend courses the student has already completed
   - Be accurate about how many credits the student still needs to complete in each category
   - For Writing Designated courses, remember that the student needs to complete ENG111, ENG112, plus 6 additional credits with one course at 200-level or higher
   - When the getCoursesByCategory function returns category information, use it to provide accurate context about the student's progress

5. When Presenting Course Recommendations for Next Semester:
   - First, clearly list the required core courses the student must take (no need to explain why, as these are mandatory)
   - Then, for each category (Gen Ed or Elective), recommend 2-3 DIFFERENT specific courses that best align with the student's interests and career goals
   - NEVER recommend a course as both a required course AND a general education course
   - NEVER recommend the same course in multiple categories
   - EXPLICITLY explain to the student that they should choose ONE course from EACH category of recommendations
   - For each recommended elective or gen ed course (NOT core courses), explain why it's a good fit based on:
     * How it aligns with their career goals
     * How it aligns with their academic interests
     * How it builds relevant skills for their future
     * Why it makes sense to take it next semester specifically
   - Provide a balanced mix of recommendations:
     * Some courses that primarily support career goals
     * Some courses that primarily align with academic interests
     * Some courses that satisfy both when possible
   - Present a balanced schedule that totals 15-18 credits
   - Organize recommendations by category type (Core, Gen Ed, Elective)
   - Make it clear which courses are required vs. recommended
   - If specific courses are provided in the recommendations (specific_courses field), always use those instead of generic category recommendations
   - For each Gen Ed category, recommend at least 2-3 different courses to give the student options

6. When Presenting a Schedule:
   - Create a clear, visually organized schedule by day of the week
   - For each course, include:
     * Course code and title
     * Meeting days and times
     * Location
     * Instructor (if available)
   - Highlight any potential issues or conflicts that couldn't be resolved
   - Explain how the schedule aligns with the student's preferences
   - Point out any compromises that had to be made (e.g., early morning classes)
   - Provide a summary of the total credits and course distribution
   - If there are multiple options for certain requirements, explain the trade-offs
   - If the schedule includes explanations for why certain sections were chosen, include these to help the student understand the reasoning
   - IMPORTANT: Verify that the schedule includes at most ONE course from each General Education category
   - Explain to the student that they should only take ONE course from each Gen Ed category

Remember to focus on answering the specific question asked and maintain context from previous messages in the conversation.`
          },
          ...newMessages
        ],
        temperature: 0.3,
        max_tokens: 1000
      });
      
      console.log('\n=== Second Response Generated After Function Call ===');
    }

    // Save messages directly with Supabase
    const { error: userMessageError } = await supabase
      .from('chat_messages')
      .insert({
        chat_id: currentChatId,
        role: 'User',
        content: latestMessage,
        created_at: new Date().toISOString()
      });

    if (userMessageError) throw userMessageError;

    const { error: aiMessageError } = await supabase
      .from('chat_messages')
      .insert({
        chat_id: currentChatId,
        role: 'AI',
        content: finalResponse.choices[0].message.content,
        created_at: new Date().toISOString()
      });

    if (aiMessageError) throw aiMessageError;

    // Update chat session's updated_at timestamp
    const { error: updateError } = await supabase
      .from('chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('chat_id', currentChatId);

    if (updateError) throw updateError;

    console.log('\n=== Response Generated ===')
    console.log('Response length:', finalResponse.choices[0].message.content?.length || 0)
    console.log('Response preview:', finalResponse.choices[0].message.content?.substring(0, 100) + '...')

    return NextResponse.json({
      ...finalResponse.choices[0].message,
      chat_id: currentChatId
    })
  } catch (error) {
    console.error('\n=== Error in Chat Endpoint ===')
    console.error('Full error:', error)
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    )
  }
} 