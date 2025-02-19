import { generateEmbedding } from '@/app/lib/enhancedSearch';
import { findIncompleteRequirements } from '@/app/lib/progressAnalyzer';
import { createRecommendationChunk, generateAIRecommendations } from '@/app/lib/recommendationEngine';
import { maxProgress } from '@/app/lib/studentData';
import { AcademicStanding } from '@/app/lib/types';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

interface Recommendation {
  course_id: string;
  metadata: {
    title: string;
    type: string;
    category?: string;
    explanation?: string;
  };
  credits: number;
  reason: string;
  priority: number;
  recommendation_type: 'core' | 'gen_ed' | 'elective';
  alignment_score?: number;
}

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Map academic standing to numerical year
const ACADEMIC_YEAR_MAP: Record<AcademicStanding, number> = {
  'Freshman': 1,
  'Sophomore': 2,
  'Junior': 3,
  'Senior': 4
};

export async function GET() {
  try {
    // Check if we already have recommendations for this student and term
    const { data: existingRecs, error: fetchError } = await supabase
      .from('course_recommendations')
      .select('*')
      .eq('student_id', maxProgress.student_summary.id)
      .eq('term_recommended', maxProgress.current_term.next_registration_term);

    if (fetchError) {
      console.error('Error fetching existing recommendations:', fetchError);
      throw new Error('Failed to fetch existing recommendations');
    }

    let recommendations;
    let context;
    let shouldRegenerateChunk = false;

    // If we have existing recommendations and student hasn't updated their profile, use them
    if (existingRecs && existingRecs.length > 0) {
      console.log('Found existing recommendations:', existingRecs.length);
      recommendations = existingRecs;
      context = {
        core_credits: existingRecs.filter(r => r.recommendation_type === 'core')
          .reduce((sum, r) => sum + r.credits, 0),
        remaining_credits: 18 - existingRecs.filter(r => r.recommendation_type === 'core')
          .reduce((sum, r) => sum + r.credits, 0),
        incomplete_requirements: findIncompleteRequirements(maxProgress)
      };
    } else {
      // If no existing recommendations, generate new ones
      shouldRegenerateChunk = true;
      const studentYear = ACADEMIC_YEAR_MAP[maxProgress.student_summary.academic_standing];

      // Get core course recommendations
      const coreCourses = maxProgress.requirements
        .filter(req => {
          if (req.type !== 'finance_core' || req.student_status.status !== 'not_started') {
            return false;
          }
          const courseYear = req.year_level;
          return courseYear && courseYear <= studentYear;
        })
        .sort((a, b) => {
          const yearDiff = (a.year_level || 0) - (b.year_level || 0);
          if (yearDiff !== 0) return yearDiff;
          return parseInt(a.id.substring(3)) - parseInt(b.id.substring(3));
        })
        .map(course => ({
          course_id: course.id,
          title: course.title,
          credits: course.credits_required,
          recommendation_type: 'core' as const,
          category: 'Core Requirements',
          reason: course.year_level! < studentYear 
            ? `Required finance core course from year ${course.year_level} that should have been completed already`
            : `Required finance core course for your current academic year`,
          priority: 1,
          alignment_score: 1.0, // Core courses always have 100% alignment
          metadata: {
            title: course.title,
            type: 'finance_core',
            year_level: course.year_level
          }
        }));

      // Calculate core credits
      const coreCredits = coreCourses.reduce((sum, course) => sum + course.credits, 0);

      // Get incomplete requirements for AI recommendations
      const incompleteReqs = findIncompleteRequirements(maxProgress);

      // Generate AI-powered recommendations for gen eds and electives
      const aiRecommendations = await generateAIRecommendations({
        student_data: maxProgress,
        incomplete_requirements: {
          genEdCategoriesMissing: incompleteReqs.genEdCategoriesMissing,
          financeElectivesNeeded: typeof incompleteReqs.financeElectivesNeeded === 'number' 
            ? incompleteReqs.financeElectivesNeeded 
            : 0
        }
      });

      console.log('\nAI Recommendations Debug:');
      console.log('Raw AI Recommendations:', JSON.stringify(aiRecommendations, null, 2));

      // Add alignment scores to AI recommendations based on priority
      const aiRecsWithScores = aiRecommendations.map((rec: Recommendation) => ({
        ...rec,
        alignment_score: 1 - ((rec.priority - 1) * 0.15) // Convert priority 1-5 to score 1.0-0.4
      }));

      // Debug logging
      console.log('\nRecommendations Debug:');
      console.log('Core Courses:', coreCourses.length);
      console.log('AI Recommendations:', aiRecsWithScores.length);
      console.log('AI Rec Types:', aiRecsWithScores.map((r: Recommendation) => r.recommendation_type));

      // Combine all recommendations - core courses first, then AI recommendations
      const allRecommendations = [...coreCourses, ...aiRecsWithScores];

      // More debug logging
      console.log('Combined Recommendations:', allRecommendations.length);
      console.log('Types:', allRecommendations.map(r => r.recommendation_type));
      console.log('Course IDs:', allRecommendations.map(r => r.course_id));

      // Store in Supabase
      if (allRecommendations.length > 0) {
        // Clear existing recommendations
        const { error: deleteError } = await supabase
          .from('course_recommendations')
          .delete()
          .eq('student_id', maxProgress.student_summary.id)
          .eq('term_recommended', maxProgress.current_term.next_registration_term);

        if (deleteError) {
          console.error('Error deleting existing recommendations:', deleteError);
        }

        // Prepare recommendations for insertion
        const recsToInsert = allRecommendations.map(rec => ({
          student_id: maxProgress.student_summary.id,
          course_id: rec.course_id,
          title: rec.metadata.title,
          credits: rec.credits,
          recommendation_type: rec.recommendation_type,
          category: rec.metadata.category,
          reason: rec.reason,
          priority: rec.priority,
          alignment_score: rec.alignment_score || 1.0,
          term_recommended: maxProgress.current_term.next_registration_term,
          metadata: rec.metadata
        }));

        console.log('Inserting recommendations:', JSON.stringify(recsToInsert, null, 2));

        // Insert new recommendations
        const { error: insertError } = await supabase
          .from('course_recommendations')
          .insert(recsToInsert);

        if (insertError) {
          console.error('Error inserting recommendations:', insertError);
          throw new Error(`Error inserting recommendations: ${insertError.message}`);
        }
      }

      recommendations = allRecommendations;
      context = {
        core_credits: coreCredits,
        remaining_credits: 18 - coreCredits,
        incomplete_requirements: incompleteReqs
      };
    }

    // Only regenerate the chunk if we generated new recommendations
    if (shouldRegenerateChunk) {
      // Create the recommendation chunk
      const chunk = await createRecommendationChunk(recommendations, context);
      
      // Generate embedding for the chunk
      const embedding = await generateEmbedding(chunk.content);
      
      // First, delete any existing recommendation chunk for this student and term
      const { error: deleteError } = await supabase
        .from('academic_chunks')
        .delete()
        .eq('metadata->>type', 'course_recommendations')
        .eq('metadata->>student_id', maxProgress.student_summary.id)
        .eq('metadata->>term', maxProgress.current_term.next_registration_term);

      if (deleteError) {
        console.error('Error deleting existing recommendation chunk:', deleteError);
      }
      
      // Insert the new chunk
      const { error: insertError } = await supabase
        .from('academic_chunks')
        .insert({
          title: chunk.title,
          content: chunk.content,
          metadata: chunk.metadata,
          embedding
        });

      if (insertError) {
        console.error('Error inserting recommendation chunk:', insertError);
      }
    }

    // Return recommendations with context
    return NextResponse.json({
      recommendations,
      context
    });
  } catch (error) {
    console.error('Error in recommendations endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
} 