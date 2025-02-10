import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function calculateDegreeProgress(studentName: string): Promise<{
  progress: number;
  details: {
    totalRequiredCredits: number;
    totalCompletedCredits: number;
  };
}> {
  try {
    // Get the most recent transcript for this student
    const { data: transcriptData, error: transcriptError } = await supabase
      .from('student_transcripts')
      .select('*')
      .eq('student_name', studentName)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    console.log('Transcript Data:', transcriptData);
    if (transcriptError) {
      console.error('Transcript Error:', transcriptError);
      throw transcriptError;
    }

    if (!transcriptData.program_required_credits) {
      throw new Error('Program required credits not set for student');
    }

    const totalRequiredCredits = transcriptData.program_required_credits;
    const totalCompletedCredits = transcriptData.earned_credits_cumulative;
    const progress = Math.round((totalCompletedCredits / totalRequiredCredits) * 100);

    console.log('Progress Calculation:', {
      totalRequiredCredits,
      totalCompletedCredits,
      progress
    });

    return {
      progress,
      details: {
        totalRequiredCredits,
        totalCompletedCredits
      }
    };
  } catch (error) {
    console.error('Error calculating degree progress:', error);
    throw error;
  }
} 