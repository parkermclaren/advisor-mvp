import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
)

export async function POST(request: Request) {
  try {
    const { goals, interests, schedule_priorities, commitments } = await request.json()

    // For MVP: Get Max's transcript data
    const { data: transcriptData, error: transcriptError } = await supabase
      .from('student_transcripts')
      .select('transcript_id')
      .eq('student_name', 'Grenert, Max')
      .single()

    if (transcriptError) throw transcriptError
    if (!transcriptData) throw new Error('Student transcript not found')

    const { error } = await supabase
      .from('student_profiles')
      .upsert({
        student_id: transcriptData.transcript_id,
        goals,
        interests,
        schedule_priorities,
        commitments,
        updated_at: new Date().toISOString()
      })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving onboarding data:', error)
    return NextResponse.json(
      { error: 'Failed to save onboarding data' },
      { status: 500 }
    )
  }
} 