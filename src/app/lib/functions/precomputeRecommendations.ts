import { createClient } from '@supabase/supabase-js';
import { getCoursesByCategory } from './getCoursesByCategory';
import { getRemainingRequirements } from './remainingRequirements';

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Define types for course recommendations
type SpecificCourse = {
  code: string;
  title: string;
  credits: number;
  alignment_score?: number;
  alignment_reason?: string;
};

/**
 * Precomputes and stores course recommendations for a student
 * This function takes the same logic as getRecommendedCourses but stores the results
 * in the course_recommendations table instead of returning them
 * @param studentId The ID of the student
 */
export async function precomputeRecommendations(studentId: string): Promise<void> {
  try {
    if (!studentId) {
      throw new Error('Student ID is required');
    }

    console.log(`Precomputing course recommendations for transcript ID: ${studentId}`);
    
    // Get the student_id from student_transcripts using the transcript_id
    const { data: transcriptData, error: transcriptError } = await supabase
      .from('student_transcripts')
      .select('student_id')
      .eq('transcript_id', studentId)
      .single();
    
    if (transcriptError || !transcriptData) {
      console.error('Transcript not found:', transcriptError || 'No transcript data');
      throw new Error('Transcript not found');
    }
    
    const actualStudentId = transcriptData.student_id;
    console.log(`Found student ID: ${actualStudentId} from transcript ID: ${studentId}`);
    
    // Step 1: Get the student's remaining requirements
    const remainingRequirements = await getRemainingRequirements(actualStudentId);
    
    // Step 2: Determine the student's current term and next term
    const { data: termData, error: termError } = await supabase
      .from('student_courses')
      .select('term_name, year')
      .eq('student_id', actualStudentId)
      .order('year', { ascending: false });
    
    if (termError) {
      throw termError;
    }
    
    // Define term priority (Fall > Summer > Spring)
    const termPriority: Record<string, number> = {
      'Fall': 3,
      'Summer': 2,
      'Spring': 1
    };
    
    // Find the latest term based on year and term priority
    let latestTerm = { term_name: '2024 Fall Term', year: 2024 }; // Default fallback
    
    if (termData && termData.length > 0) {
      // Group terms by year
      const termsByYear = termData.reduce((acc, term) => {
        if (!acc[term.year]) {
          acc[term.year] = [];
        }
        acc[term.year].push(term);
        return acc;
      }, {} as Record<number, typeof termData>);
      
      // Get the latest year
      const latestYear = Math.max(...Object.keys(termsByYear).map(Number));
      
      // Find the term with highest priority in the latest year
      latestTerm = termsByYear[latestYear].reduce((latest, current) => {
        const currentTermPart = Object.keys(termPriority).find(term => 
          current.term_name.includes(term)
        ) || '';
        
        const latestTermPart = Object.keys(termPriority).find(term => 
          latest.term_name.includes(term)
        ) || '';
        
        if ((termPriority[currentTermPart] || 0) > (termPriority[latestTermPart] || 0)) {
          return current;
        }
        return latest;
      }, termsByYear[latestYear][0]);
    }
    
    // Determine next term based on current term
    let nextTerm = '';
    let nextTermYear = latestTerm.year;
    
    if (latestTerm.term_name.includes('Spring')) {
      nextTerm = `${nextTermYear} Fall Term`;
    } else if (latestTerm.term_name.includes('Fall')) {
      nextTermYear = nextTermYear + 1;
      nextTerm = `${nextTermYear} Spring Term`;
    } else if (latestTerm.term_name.includes('Summer')) {
      nextTerm = `${nextTermYear} Fall Term`;
    }
    
    // Step 3: Determine academic year level
    const { earnedCredits } = remainingRequirements;
    let yearLevel = 'First Year';
    
    if (earnedCredits >= 90) {
      yearLevel = 'Senior';
    } else if (earnedCredits >= 60) {
      yearLevel = 'Junior';
    } else if (earnedCredits >= 30) {
      yearLevel = 'Sophomore';
    }
    
    // Step 4: Process and store recommendations
    
    // First, delete existing recommendations for this student and term
    const { error: deleteError } = await supabase
      .from('course_recommendations')
      .delete()
      .eq('student_id', actualStudentId)
      .eq('term_recommended', nextTerm);
    
    if (deleteError) {
      throw deleteError;
    }
    
    // 4.1: Process and store core requirements
    const allCoreRequirements = remainingRequirements.coreRequirements
      .filter(req => !req.is_satisfied);
    
    // Remove duplicates and sort core requirements
    const uniqueCoreRequirements = allCoreRequirements.reduce((unique, req) => {
      const existingIndex = unique.findIndex(item => item.course_code === req.course_code);
      if (existingIndex === -1) {
        unique.push(req);
      }
      return unique;
    }, [] as typeof allCoreRequirements);
    
    const sortedCoreRequirements = uniqueCoreRequirements.sort((a, b) => {
      const yearLevelOrder: Record<string, number> = {
        'First Year': 1,
        'Sophomore': 2,
        'Junior': 3,
        'Senior': 4
      };
      const yearDiff = (yearLevelOrder[a.year_level] || 5) - (yearLevelOrder[b.year_level] || 5);
      if (yearDiff !== 0) return yearDiff;
      
      if (a.is_required && !b.is_required) return -1;
      if (!a.is_required && b.is_required) return 1;
      
      return b.credits - a.credits;
    });
    
    // Calculate recommended core courses
    let runningCredits = 0;
    const maxCoreCredits = 12;
    const coreRecommendations = [];
    
    for (const req of sortedCoreRequirements) {
      if (req.is_required && req.credits <= 2) {
        coreRecommendations.push(req);
        runningCredits += req.credits;
        continue;
      }
      
      if (runningCredits + req.credits <= maxCoreCredits) {
        coreRecommendations.push(req);
        runningCredits += req.credits;
      }
    }
    
    // Store core recommendations
    for (const [index, req] of coreRecommendations.entries()) {
      const { error: insertError } = await supabase
        .from('course_recommendations')
        .insert({
          student_id: actualStudentId,
          course_id: req.course_code,
          title: req.course_title,
          credits: req.credits,
          recommendation_type: 'CORE',
          category: null,
          reason: req.note || 'Core requirement for your program',
          priority: index + 1,
          alignment_score: 1.0, // Core requirements have highest alignment
          term_recommended: nextTerm,
          metadata: {
            is_required: req.is_required,
            year_level: req.year_level,
            description: req.description
          }
        });
      
      if (insertError) {
        console.error('Error inserting core recommendation:', insertError);
      }
    }
    
    // 4.2: Process and store gen ed recommendations
    const genEdRecommendations = remainingRequirements.genEdRequirements
      .filter(req => !req.is_satisfied)
      .slice(0, 2); // Limit to 2 gen ed courses per term
    
    // Create a set of core course codes to avoid duplicates
    const coreCourseCodeSet = new Set(coreRecommendations.map(course => course.course_code));
    
    // Store gen ed recommendations
    for (const [index, req] of genEdRecommendations.entries()) {
      let specificCourses: SpecificCourse[] = [];
      
      if (req.ge_category) {
        try {
          const categoryResults = await getCoursesByCategory(req.ge_category, 5, true, 0);
          if (categoryResults.courses) {
            specificCourses = categoryResults.courses.filter(course => 
              !coreCourseCodeSet.has(course.code)
            ).map(course => ({
              code: course.code,
              title: course.title,
              credits: course.credits,
              alignment_score: course.alignment_score,
              alignment_reason: course.alignment_reason
            }));
          }
        } catch (error) {
          console.error(`Error getting specific courses for ${req.ge_category}:`, error);
        }
      }
      
      // FIXED: Ensure we always have a non-null course_id by using a placeholder if needed
      // Use the first specific course's code if available, otherwise use a placeholder
      const courseId = (specificCourses.length > 0) 
        ? specificCourses[0].code 
        : (req.course_code || `${req.ge_category?.replace(/\s+/g, '_')}_PLACEHOLDER`);
      
      const { error: insertError } = await supabase
        .from('course_recommendations')
        .insert({
          student_id: actualStudentId,
          course_id: courseId, // Use the non-null course_id here
          title: req.course_title || req.ge_category || `${req.requirement_type} Requirement`,
          credits: req.credits,
          recommendation_type: 'GEN_ED',
          category: req.ge_category,
          reason: req.note || `Satisfies ${req.ge_category || 'General Education'} requirement`,
          priority: coreRecommendations.length + index + 1,
          alignment_score: 0.8, // Gen Ed requirements have high alignment
          term_recommended: nextTerm,
          metadata: {
            is_required: req.is_required,
            year_level: req.year_level,
            description: req.description,
            specific_courses: specificCourses
          }
        });
      
      if (insertError) {
        console.error('Error inserting gen ed recommendation:', insertError);
      }
    }
    
    // 4.3: Process and store elective recommendations
    const electivesBySubtype = new Map<string, typeof remainingRequirements.electiveRequirements[0][]>();
    
    remainingRequirements.electiveRequirements
      .filter(req => req.remaining_credits && req.remaining_credits > 0)
      .forEach(req => {
        const subtype = req.description || 'General Electives';
        if (!electivesBySubtype.has(subtype)) {
          electivesBySubtype.set(subtype, []);
        }
        electivesBySubtype.get(subtype)?.push(req);
      });
    
    let electiveIndex = 0;
    for (const [subtype, requirements] of electivesBySubtype.entries()) {
      // For each subtype, recommend at most 1 course (3 credits) per term
      const limitedRequirements = requirements.slice(0, 1);
      
      for (const req of limitedRequirements) {
        let specificCourses: SpecificCourse[] = [];
        
        if (subtype.toLowerCase().includes('finance')) {
          try {
            const categoryResults = await getCoursesByCategory('Finance Electives', 5, true, 0);
            if (categoryResults.courses) {
              specificCourses = categoryResults.courses.filter(course => 
                !coreCourseCodeSet.has(course.code)
              ).map(course => ({
                code: course.code,
                title: course.title,
                credits: course.credits,
                alignment_score: course.alignment_score,
                alignment_reason: course.alignment_reason
              }));
            }
          } catch (error) {
            console.error(`Error getting specific courses for ${subtype}:`, error);
          }
        }
        
        // FIXED: Ensure we always have a non-null course_id by using a placeholder if needed
        const courseId = (specificCourses.length > 0) 
          ? specificCourses[0].code 
          : `${subtype.replace(/\s+/g, '_')}_PLACEHOLDER`;
        
        const { error: insertError } = await supabase
          .from('course_recommendations')
          .insert({
            student_id: actualStudentId,
            course_id: courseId,  // Use the non-null course_id here
            title: subtype,
            credits: Math.min(req.remaining_credits || 3, 3),
            recommendation_type: 'ELECTIVE',
            category: subtype,
            reason: `You need ${req.remaining_credits} more credits of ${subtype}`,
            priority: coreRecommendations.length + genEdRecommendations.length + electiveIndex + 1,
            alignment_score: 0.6, // Electives have moderate alignment
            term_recommended: nextTerm,
            metadata: {
              is_required: req.is_required,
              year_level: req.year_level,
              description: req.description,
              remaining_credits: req.remaining_credits,
              specific_courses: specificCourses
            }
          });
        
        if (insertError) {
          console.error('Error inserting elective recommendation:', insertError);
        }
        
        electiveIndex++;
      }
    }
    
    console.log(`Successfully precomputed recommendations for student ${actualStudentId} for ${nextTerm}`);
    
  } catch (error) {
    console.error('Error precomputing course recommendations:', error);
    throw error;
  }
} 