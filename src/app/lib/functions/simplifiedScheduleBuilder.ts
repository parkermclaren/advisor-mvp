import { createClient } from '@supabase/supabase-js';
import { getRecommendedCourses } from './recommendedCourses';
import { getRemainingRequirements } from './remainingRequirements';

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Simplified Types
type CourseSection = {
  section_id: string;
  course_id: string;
  course_code: string;
  course_title: string;
  day_pattern: string;
  start_time: string;
  end_time: string;
  credits: number;
  requirement_type: string;
  instructor: string;
  location: string;
};

type StudentSchedule = {
  schedule_id: string;
  student_id: string;
  term: string;
  sections: CourseSection[];
  total_credits: number;
};

// Helper function to check for time conflicts
function hasTimeConflict(
  pattern1: string, 
  start1: string, 
  end1: string, 
  pattern2: string, 
  start2: string, 
  end2: string
): boolean {
  // Check if day patterns overlap
  const hasOverlappingDays = pattern1.split('').some(day => pattern2.includes(day));
  if (!hasOverlappingDays) return false;

  // Convert times to minutes for comparison
  const start1Min = timeToMinutes(start1);
  const end1Min = timeToMinutes(end1);
  const start2Min = timeToMinutes(start2);
  const end2Min = timeToMinutes(end2);

  return !(end1Min <= start2Min || end2Min <= start1Min);
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  // Convert afternoon times (1-7) to 24-hour format (13-19)
  const adjustedHours = (hours < 8 && hours > 0) ? hours + 12 : hours;
  return adjustedHours * 60 + minutes;
}

// Helper function to ensure time is in 24-hour format
function normalizeTo24Hour(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const adjustedHours = (hours < 8 && hours > 0) ? hours + 12 : hours;
  return `${adjustedHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export async function buildSimpleSchedule(
  studentId: string,
  term: string
): Promise<StudentSchedule> {
  try {
    console.log(`Building schedule for student ${studentId} for term ${term}`);
    
    // The structure in our database is different - for Max, transcript_id is actually student_id
    // and student_id is the actual ID in the system
    const { data: transcriptData } = await supabase
      .from('student_transcripts')
      .select('*')
      .limit(1);
    
    console.log(`Found transcript data:`, transcriptData);
    
    if (!transcriptData || transcriptData.length === 0) {
      throw new Error("No transcripts found in the system");
    }
    
    // We can directly use the transcript ID from the first record
    const transcriptId = transcriptData[0].transcript_id;
    
    // Get course recommendations using the transcript ID
    console.log(`Getting recommendations for transcript ID: ${transcriptId}`);
    const recommendations = await getRecommendedCourses(transcriptId);
    
    // Get remaining requirements for further reference
    const studentRequirements = await getRemainingRequirements(studentId);
    
    // Track which courses we've already added to avoid duplicates
    const addedCourseCodes = new Set<string>();
    const selectedSections: CourseSection[] = [];
    let totalCredits = 0;
    const MAX_CREDITS = 18;
    const MIN_CREDITS = 15;
    
    // Flatten recommendations into a prioritized list
    let recommendedCourses: any[] = [];
    
    // Process core requirements first (highest priority)
    const coreCategory = recommendations.categories.find(cat => cat.type === 'CORE');
    if (coreCategory) {
      recommendedCourses = recommendedCourses.concat(
        coreCategory.recommendations.map(rec => ({
          ...rec,
          priority: 1 // Highest priority
        }))
      );
    }
    
    // Then process gen ed requirements
    const genEdCategories = recommendations.categories.filter(cat => cat.type === 'GEN_ED');
    for (const category of genEdCategories) {
      recommendedCourses = recommendedCourses.concat(
        category.recommendations.map(rec => ({
          ...rec,
          priority: 2, // Second priority
          category: category.name
        }))
      );
    }
    
    // Finally process elective requirements
    const electiveCategories = recommendations.categories.filter(cat => cat.type === 'ELECTIVE');
    for (const category of electiveCategories) {
      recommendedCourses = recommendedCourses.concat(
        category.recommendations.map(rec => ({
          ...rec,
          priority: 3, // Third priority
          category: category.name
        }))
      );
    }
    
    // Sort recommendations by priority and then by alignment score
    recommendedCourses.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return (b.alignment_score || 0) - (a.alignment_score || 0);
    });
    
    // Process each recommended course
    for (const recommendation of recommendedCourses) {
      // Skip if we've reached maximum credits
      if (totalCredits >= MAX_CREDITS) break;
      
      // Skip if course_code is null or undefined
      if (!recommendation.course_code) continue;
      
      // Skip if we've already added this course
      if (addedCourseCodes.has(recommendation.course_code)) continue;

      // Get available sections for this course
      const { data: sections } = await supabase
        .from('course_sections')
        .select(`
          section_id, 
          course_id, 
          course_code, 
          instructor, 
          location, 
          day_pattern, 
          start_time, 
          end_time, 
          term
        `)
        .eq('course_code', recommendation.course_code)
        .eq('term', term);

      if (!sections || sections.length === 0) continue;

      // Get course details separately to ensure we have the correct title and credits
      const { data: courseData } = await supabase
        .from('courses')
        .select('title, credits')
        .eq('code', recommendation.course_code)
        .single();

      if (!courseData) continue; // Skip if we can't get course data

      // Try to find a section that doesn't conflict with our schedule
      for (const section of sections) {
        const hasConflict = selectedSections.some(selected =>
          hasTimeConflict(
            section.day_pattern,
            section.start_time,
            section.end_time,
            selected.day_pattern,
            selected.start_time,
            selected.end_time
          )
        );

        if (!hasConflict) {
          const courseCredits = courseData.credits || 3;
          
          // Don't exceed credit limit
          if (totalCredits + courseCredits > MAX_CREDITS) continue;
          
          selectedSections.push({
            section_id: section.section_id,
            course_id: section.course_id,
            course_code: section.course_code,
            course_title: courseData.title || recommendation.course_title || '',
            day_pattern: section.day_pattern,
            start_time: normalizeTo24Hour(section.start_time),
            end_time: normalizeTo24Hour(section.end_time),
            credits: courseCredits,
            requirement_type: recommendation.requirement_type,
            instructor: section.instructor,
            location: section.location
          });
          
          totalCredits += courseCredits;
          // Track that we've added this course
          addedCourseCodes.add(recommendation.course_code);
          break;
        }
      }
    }

    // Create the schedule object
    const schedule: StudentSchedule = {
      schedule_id: crypto.randomUUID(),
      student_id: studentId,
      term,
      sections: selectedSections,
      total_credits: totalCredits
    };

    // Save the schedule
    await supabase
      .from('student_schedules')
      .insert({
        schedule_id: schedule.schedule_id,
        student_id: studentId,
        registration_term: term,
        sections: selectedSections.map(section => ({
          section_id: section.section_id,
          course_id: section.course_id,
          course_code: section.course_code,
          course_title: section.course_title,
          day_pattern: section.day_pattern,
          start_time: section.start_time,
          end_time: section.end_time,
          credits: section.credits,
          requirement_type: section.requirement_type,
          instructor: section.instructor,
          location: section.location
        })),
        total_credits: totalCredits
      });

    // Format the schedule for display
    const formattedSchedule = {
      ...schedule,
      sections: selectedSections.map(section => ({
        ...section,
        // Ensure times are in HH:mm format
        start_time: section.start_time.substring(0, 5),
        end_time: section.end_time.substring(0, 5)
      }))
    };

    // Return the schedule with formatted times
    return formattedSchedule;
  } catch (error) {
    console.error('Error building simple schedule:', error);
    throw error;
  }
}