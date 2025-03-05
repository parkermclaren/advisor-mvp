import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
)

export async function POST(request: Request) {
  try {
    const { chat_id, suggestions } = await request.json()

    if (!chat_id || !suggestions || !Array.isArray(suggestions)) {
      return NextResponse.json(
        { error: 'Invalid request. chat_id and suggestions array are required.' },
        { status: 400 }
      )
    }

    // Check if a record already exists for this chat
    const { data: existingData, error: checkError } = await supabase
      .from('suggested_follow_ups')
      .select('id')
      .eq('chat_id', chat_id)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking for existing suggestions:', checkError)
      throw checkError
    }

    let result
    
    if (existingData) {
      // Update existing record
      result = await supabase
        .from('suggested_follow_ups')
        .update({ 
          prompts: suggestions,
          updated_at: new Date().toISOString()
        })
        .eq('chat_id', chat_id)
    } else {
      // Insert new record
      result = await supabase
        .from('suggested_follow_ups')
        .insert({
          chat_id,
          prompts: suggestions,
          created_at: new Date().toISOString()
        })
    }

    if (result.error) throw result.error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving suggestions:', error)
    return NextResponse.json(
      { error: 'Failed to save suggestions' },
      { status: 500 }
    )
  }
} 