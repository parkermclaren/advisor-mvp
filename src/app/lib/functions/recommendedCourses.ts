import { createClient } from '@supabase/supabase-js';
import { precomputeRecommendations } from './precomputeRecommendations';

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Define types for our recommendation structure
type CourseRecommendation = {
  course_code: string | null;
  course_title: string | null;
  credits: number;
  requirement_type: string;
  category?: string | null;
  year_level: string;
  is_required: boolean;
  description?: string | null;
  note?: string;
  alignment_score?: number;
  alignment_reason?: string;
  specific_courses?: {
    course_code: string;
    course_title: string;
    credits: number;
    alignment_score?: number;
    alignment_reason?: string;
  }[];
};

type RecommendationCategory = {
  name: string;
  type: string;
  subtype?: string | null;
  recommendations: CourseRecommendation[];
  credits_required: number;
  credits_recommended: number;
};

type CourseRecommendations = {
  total_credits_recommended: number;
  ideal_credit_range: {
    min: number;
    max: number;
  };
  categories: RecommendationCategory[];
  next_term: string;
};

/**
 * Get recommended courses for a student's next term
 * @param transcriptId The ID of the student's transcript
 * @returns An object containing the recommended courses structured by category
 */
export async function getRecommendedCourses(transcriptId: string): Promise<CourseRecommendations> {
  try {
    console.log(`Getting course recommendations for transcript ID: ${transcriptId}`);
    
    // Get the student_id from student_transcripts using the transcript_id
    const { data: transcriptData, error: transcriptError } = await supabase
      .from('student_transcripts')
      .select('student_id')
      .eq('transcript_id', transcriptId)
      .single();
    
    if (transcriptError || !transcriptData) {
      console.error('Transcript not found:', transcriptError || 'No transcript data');
      throw new Error('Transcript not found');
    }
    
    const studentId = transcriptData.student_id;
    console.log(`Found student ID: ${studentId} from transcript ID: ${transcriptId}`);
    
    // Get the precomputed recommendations from the database
    let { data: recommendations, error } = await supabase
      .from('course_recommendations')
      .select('*')
      .eq('student_id', studentId)
      .order('priority');
    
    if (error || !recommendations || recommendations.length === 0) {
      console.log('No precomputed recommendations found, generating new ones...');
      
      // If there's an error or no recommendations, try to compute them
      try {
        await precomputeRecommendations(transcriptId);
        console.log('Successfully precomputed recommendations, fetching them now...');
        
        // Try fetching again
        const { data: retryData, error: retryError } = await supabase
          .from('course_recommendations')
          .select('*')
          .eq('student_id', studentId)
          .order('priority');
        
        if (retryError) {
          console.error('Error fetching newly computed recommendations:', retryError);
          throw retryError;
        }
        
        if (!retryData || retryData.length === 0) {
          console.error('No recommendations were generated during precomputation');
          throw new Error('Failed to generate course recommendations');
        }
        
        recommendations = retryData;
      } catch (precomputeError) {
        console.error('Error during recommendation precomputation:', precomputeError);
        throw new Error('Failed to generate course recommendations');
      }
    }
    
    // At this point we should definitely have recommendations
    console.log(`Found ${recommendations.length} recommendations for student`);
    
    // Group recommendations by type
    const recommendationsByType = new Map<string, typeof recommendations>();
    recommendations.forEach(rec => {
      const type = rec.recommendation_type;
      if (!recommendationsByType.has(type)) {
        recommendationsByType.set(type, []);
      }
      recommendationsByType.get(type)?.push(rec);
    });
    
    // Convert database recommendations to our return format
    const categories: RecommendationCategory[] = [];
    let totalCreditsRecommended = 0;
    
    // Process core recommendations
    const coreRecs = recommendationsByType.get('CORE') || [];
    if (coreRecs.length > 0) {
      const coreCredits = coreRecs.reduce((sum, rec) => sum + rec.credits, 0);
      categories.push({
        name: 'Core Requirements',
        type: 'CORE',
        recommendations: coreRecs.map(rec => ({
          course_code: rec.course_id,
          course_title: rec.title,
          credits: rec.credits,
          requirement_type: rec.recommendation_type,
          year_level: rec.metadata?.year_level || 'Unknown',
          is_required: rec.metadata?.is_required || false,
          description: rec.metadata?.description,
          note: rec.reason,
          alignment_score: rec.alignment_score
        })),
        credits_required: coreCredits,
        credits_recommended: coreCredits
      });
      totalCreditsRecommended += coreCredits;
    }
    
    // Process gen ed recommendations
    const genEdRecs = recommendationsByType.get('GEN_ED') || [];
    if (genEdRecs.length > 0) {
      // Group gen ed recommendations by category
      const genEdByCategory = new Map<string, typeof genEdRecs>();
      genEdRecs.forEach(rec => {
        const category = rec.category || 'General Education';
        if (!genEdByCategory.has(category)) {
          genEdByCategory.set(category, []);
        }
        genEdByCategory.get(category)?.push(rec);
      });
      
      for (const [category, recs] of genEdByCategory.entries()) {
        const categoryCredits = recs.reduce((sum, rec) => sum + rec.credits, 0);
        categories.push({
          name: category,
          type: 'GEN_ED',
          recommendations: recs.map(rec => ({
            course_code: rec.course_id,
            course_title: rec.title,
            credits: rec.credits,
            requirement_type: rec.recommendation_type,
            category: rec.category,
            year_level: rec.metadata?.year_level || 'Unknown',
            is_required: rec.metadata?.is_required || false,
            description: rec.metadata?.description,
            note: rec.reason,
            alignment_score: rec.alignment_score,
            specific_courses: rec.metadata?.specific_courses
          })),
          credits_required: categoryCredits,
          credits_recommended: categoryCredits
        });
        totalCreditsRecommended += categoryCredits;
      }
    }
    
    // Process elective recommendations
    const electiveRecs = recommendationsByType.get('ELECTIVE') || [];
    if (electiveRecs.length > 0) {
    // Group electives by subtype
      const electivesBySubtype = new Map<string, typeof electiveRecs>();
      electiveRecs.forEach(rec => {
        const subtype = rec.category || 'General Electives';
        if (!electivesBySubtype.has(subtype)) {
          electivesBySubtype.set(subtype, []);
        }
        electivesBySubtype.get(subtype)?.push(rec);
      });
      
      for (const [subtype, recs] of electivesBySubtype.entries()) {
        const subtypeCredits = recs.reduce((sum, rec) => sum + rec.credits, 0);
        const firstRec = recs[0]; // Get the first recommendation for metadata
        categories.push({
          name: subtype,
          type: 'ELECTIVE',
          subtype: subtype,
          recommendations: recs.map(rec => ({
            course_code: rec.course_id,
            course_title: rec.title,
            credits: rec.credits,
            requirement_type: rec.recommendation_type,
            category: rec.category,
            year_level: rec.metadata?.year_level || 'Unknown',
            is_required: rec.metadata?.is_required || false,
            description: rec.metadata?.description,
            note: rec.reason,
            alignment_score: rec.alignment_score,
            specific_courses: rec.metadata?.specific_courses
          })),
          credits_required: firstRec.metadata?.remaining_credits || subtypeCredits,
          credits_recommended: subtypeCredits
        });
        totalCreditsRecommended += subtypeCredits;
      }
    }
    
    return {
      total_credits_recommended: totalCreditsRecommended,
      ideal_credit_range: {
        min: 15,
        max: 20
      },
      categories: categories,
      next_term: recommendations[0].term_recommended
    };
    
  } catch (error) {
    console.error('Error getting course recommendations:', error);
    throw error;
  }
} 