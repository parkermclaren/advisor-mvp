import { maxProgress } from '@/app/lib/studentData';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

// GET endpoint to retrieve messages for a chat session
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const chat_id = searchParams.get('chat_id');

    if (!chat_id) {
      return NextResponse.json(
        { error: 'Chat ID is required' },
        { status: 400 }
      );
    }

    // Verify the chat session belongs to the user
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('chat_id')
      .eq('chat_id', chat_id)
      .eq('user_id', maxProgress.student_summary.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Chat session not found or unauthorized' },
        { status: 404 }
      );
    }

    // Get all messages for the chat session
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('chat_id', chat_id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat messages' },
      { status: 500 }
    );
  }
}

// POST endpoint to add a new message to a chat session
export async function POST(request: Request) {
  try {
    const { chat_id, role, content } = await request.json();

    // Verify the chat session belongs to the user
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('chat_id')
      .eq('chat_id', chat_id)
      .eq('user_id', maxProgress.student_summary.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Chat session not found or unauthorized' },
        { status: 404 }
      );
    }

    // Add the new message
    const { data: newMessage, error } = await supabase
      .from('chat_messages')
      .insert({
        chat_id,
        role,
        content,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Update the chat session's updated_at timestamp
    const { error: updateError } = await supabase
      .from('chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('chat_id', chat_id);

    if (updateError) throw updateError;

    return NextResponse.json(newMessage);
  } catch (error) {
    console.error('Error creating chat message:', error);
    return NextResponse.json(
      { error: 'Failed to create chat message' },
      { status: 500 }
    );
  }
} 