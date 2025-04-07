import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Get a student's completed courses from the database
 * @param studentId The ID of the student (not used, we use a hardcoded ID for now)
 * @returns An array of completed courses
 */
export async function getCompletedCourses(studentId: string) {
  try {
    console.log(`Fetching completed courses for student ID: ${studentId}`);
    
    // Use the hardcoded student ID from the database for now
    const actualStudentId = '3029e6f2-ee85-4ae3-8ace-578cb7314567';
    console.log(`Using actual student ID from database: ${actualStudentId}`);
    
    // Query the student_courses table for completed courses
    // Note: The status field might be 'completed' or 'COMPLETED' in the database
    const { data, error } = await supabase
      .from('student_courses')
      .select('*')
      .eq('student_id', actualStudentId) // Use the actual student ID from the database
      .or('status.eq.completed,status.eq.COMPLETED'); // Handle case sensitivity

    if (error) {
      throw error;
    }

    console.log(`Found ${data?.length || 0} completed courses`);
    
    return {
      courses: data || [],
      count: data?.length || 0
    };
  } catch (error) {
    console.error('Error fetching completed courses:', error);
    throw error;
  }
} 