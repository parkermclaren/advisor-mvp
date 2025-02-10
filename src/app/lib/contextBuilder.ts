import { createClient } from '@supabase/supabase-js';
import { formatSearchResults, performEnhancedSearch } from './enhancedSearch';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface Course {
    course_code: string;
    course_title: string;
    grade: string;
    credits: number;
    term_name: string;
}

interface TranscriptTerm {
    term_name: string;
    term_gpa: number;
    courses: Course[];
}

export async function buildStudentContext(studentName: string, userQuery?: string): Promise<string> {
    try {
        // Get the most recent transcript for this student
        const { data: transcriptData, error: transcriptError } = await supabase
            .from('student_transcripts')
            .select('*')
            .eq('student_name', studentName)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (transcriptError) throw transcriptError;

        // Get all terms for this transcript
        const { data: termsData, error: termsError } = await supabase
            .from('transcript_terms')
            .select('*')
            .eq('transcript_id', transcriptData.transcript_id)
            .order('term_order', { ascending: true });

        if (termsError) throw termsError;

        // Get student profile data
        const { data: profileData, error: profileError } = await supabase
            .from('student_profiles')
            .select('*')
            .eq('student_id', transcriptData.transcript_id)
            .single();

        // Type assertion to ensure termsData is TranscriptTerm[]
        const typedTermsData = termsData as unknown as TranscriptTerm[];

        // Build a comprehensive context string
        let context = `STUDENT CONTEXT\n\n`;

        // Add profile information if available
        if (profileData && !profileError) {
            context += `STUDENT PROFILE:\n`;
            context += `- Career Goals: ${profileData.goals}\n`;
            context += `- Academic Interests: ${profileData.interests.join(', ')}\n\n`;
        }

        // Add summary information
        context += `ACADEMIC SUMMARY:\n`;
        context += `- Student: ${transcriptData.student_name}\n`;
        context += `- Program: ${transcriptData.program}\n`;
        context += `- Cumulative GPA: ${transcriptData.cumulative_gpa}\n`;
        context += `- Total Credits Earned: ${transcriptData.earned_credits_cumulative}\n`;
        context += `- Credits Attempted: ${transcriptData.attempted_credits_cumulative}\n\n`;

        // Calculate academic standing based on credits
        const academicStanding = getAcademicStanding(transcriptData.earned_credits_cumulative);
        context += `ACADEMIC STANDING: ${academicStanding}\n\n`;

        // Add course history organized by term
        context += `COURSE HISTORY:\n`;
        typedTermsData.forEach((term) => {
            context += `\n${term.term_name}:\n`;
            context += `Term GPA: ${term.term_gpa}\n`;
            term.courses.forEach((course: Course) => {
                context += `- ${course.course_code} (${course.grade}): ${course.course_title}\n`;
            });
        });

        // If there's a user query, perform enhanced search for relevant courses and requirements
        if (userQuery) {
            const completedCourses = typedTermsData.flatMap(term => 
                term.courses.map((course: Course) => ({
                    course_code: course.course_code,
                    grade: course.grade
                }))
            );

            const searchResults = await performEnhancedSearch(userQuery, {
                completedCourses,
                standing: academicStanding,
                gpa: transcriptData.cumulative_gpa,
                program: transcriptData.program
            });

            if (searchResults.length > 0) {
                context += `\nRELEVANT COURSES AND REQUIREMENTS:\n`;
                context += formatSearchResults(searchResults);
            }
        }

        return context;
    } catch (error) {
        console.error('Error building student context:', error);
        throw error;
    }
}

function getAcademicStanding(earnedCredits: number): string {
    if (earnedCredits < 30) return 'Freshman';
    if (earnedCredits < 60) return 'Sophomore';
    if (earnedCredits < 90) return 'Junior';
    return 'Senior';
} 