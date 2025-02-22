import { maxProgress } from '@/app/lib/studentData';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI for chat name generation
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

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

// GET endpoint to retrieve chat sessions
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get the 10 most recent chat sessions for the current user
    const { data: sessions, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat sessions' },
      { status: 500 }
    );
  }
}

// POST endpoint to create a new chat session
export async function POST(request: Request) {
  try {
    const { firstMessage } = await request.json();

    // Generate chat name using GPT-4o-mini
    const chatName = await generateChatName(firstMessage);

    // Check if user already has 10 chat sessions
    const { data: existingSessions, error: countError } = await supabase
      .from('chat_sessions')
      .select('chat_id')
      .eq('user_id', maxProgress.student_summary.id)
      .order('updated_at', { ascending: true });

    if (countError) throw countError;

    // If user has 10 or more sessions, delete the oldest one
    if (existingSessions && existingSessions.length >= 10) {
      const oldestSessionId = existingSessions[0].chat_id;
      const { error: deleteError } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('chat_id', oldestSessionId);

      if (deleteError) throw deleteError;
    }

    // Create new chat session
    const { data: newSession, error: insertError } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: maxProgress.student_summary.id,
        chat_name: chatName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json(newSession);
  } catch (error) {
    console.error('Error creating chat session:', error);
    return NextResponse.json(
      { error: 'Failed to create chat session' },
      { status: 500 }
    );
  }
}

// PATCH endpoint to update a chat session
export async function PATCH(request: Request) {
  try {
    const { chat_id, chat_name } = await request.json();

    const { data: updatedSession, error } = await supabase
      .from('chat_sessions')
      .update({
        chat_name,
        updated_at: new Date().toISOString()
      })
      .eq('chat_id', chat_id)
      .eq('user_id', maxProgress.student_summary.id) // Ensure user owns the session
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error('Error updating chat session:', error);
    return NextResponse.json(
      { error: 'Failed to update chat session' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete a chat session
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const chat_id = searchParams.get('chat_id');
    const user_id = searchParams.get('user_id');

    if (!chat_id || !user_id) {
      return NextResponse.json(
        { error: 'Chat ID and User ID are required' },
        { status: 400 }
      );
    }

    console.log('Deleting chat:', chat_id);
    console.log('User ID:', user_id);

    // First, verify the chat exists and belongs to the user
    const { data: chatSession, error: verifyError } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('chat_id', chat_id)
      .eq('user_id', user_id)
      .single();

    console.log('Found chat session:', chatSession);
    
    if (verifyError || !chatSession) {
      console.log('Verification error or chat not found:', verifyError);
      return NextResponse.json(
        { error: 'Chat session not found or unauthorized' },
        { status: 404 }
      );
    }

    // First, delete all messages associated with this chat
    const { data: deletedMessages, error: messagesError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('chat_id', chat_id)
      .select();

    console.log('Deleted messages:', deletedMessages);
    if (messagesError) {
      console.log('Error deleting messages:', messagesError);
      throw messagesError;
    }

    // Then delete the chat session
    const { data: deletedSession, error: sessionError } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('chat_id', chat_id)
      .eq('user_id', user_id)
      .select();

    console.log('Deleted session:', deletedSession);
    if (sessionError) {
      console.log('Error deleting session:', sessionError);
      throw sessionError;
    }

    return NextResponse.json({ success: true, deletedSession, deletedMessages });
  } catch (error) {
    console.error('Error deleting chat session:', error);
    return NextResponse.json(
      { error: 'Failed to delete chat session', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 