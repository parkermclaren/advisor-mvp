import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import OpenAI from 'openai';
import { GEN_ED_COURSES } from '../src/app/lib/genEdCourses';
import { findIncompleteRequirements } from '../src/app/lib/progressAnalyzer';
import { maxProgress } from '../src/app/lib/studentData';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Verify environment variables are loaded
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set in .env.local');
}
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  throw new Error('SUPABASE_URL or SUPABASE_KEY is not set in .env.local');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

interface CourseAlignment {
  course_id: string;
  title: string;
  alignment_score: number;
  reason: string;
  recommendation_type: 'gen_ed' | 'elective';
  priority: number;
  category: string;
  credits: number;
}

const ALIGNMENT_PROMPT = `You are an academic advisor AI analyzing how well a course aligns with a student's interests and career goals.

STUDENT PROFILE:
Career Goals: ${maxProgress.student_summary.career_goals}
Academic Interests: ${maxProgress.student_summary.academic_interests.join(', ')}
Academic Standing: ${maxProgress.student_summary.academic_standing}

For the following course, analyze its alignment and respond with ONLY a raw JSON object (no markdown, no code blocks) in this format:
{
  "alignment_score": number between 0 and 1 (higher = better alignment),
  "reason": detailed explanation of the alignment score and strategic value,
  "priority": number 1-5 (1 = highest priority for next semester)
}

Consider these factors when determining alignment and priority:
1. Direct relevance to venture capital/finance career path
2. Technology and programming skill development
3. Business analysis and decision-making skills
4. Strategic value beyond basic requirements
5. Timing in academic journey
6. Workload balance with core courses

IMPORTANT: Respond with ONLY the raw JSON object, no markdown formatting or code blocks.

COURSE TO ANALYZE:
`;

async function analyzeCourse(course: { id: string; title: string; credits: number }, type: 'gen_ed' | 'elective', category: string): Promise<CourseAlignment> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: ALIGNMENT_PROMPT + `${course.id}: ${course.title} (${course.credits} credits)\nType: ${type}\nCategory: ${category}`
        }
      ],
      temperature: 0.3
    });

    const content = response.choices[0].message.content || '';
    
    // Clean up the response by removing markdown code blocks
    const cleanContent = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    try {
      const analysis = JSON.parse(cleanContent);
      
      return {
        course_id: course.id,
        title: course.title,
        alignment_score: analysis.alignment_score,
        reason: analysis.reason,
        recommendation_type: type,
        priority: analysis.priority,
        category,
        credits: course.credits
      };
    } catch (parseError) {
      console.error(`Error parsing response for ${course.id}:`, parseError);
      console.error('Raw content:', content);
      console.error('Cleaned content:', cleanContent);
      throw parseError;
    }
  } catch (error) {
    console.error(`Error analyzing course ${course.id}:`, error);
    return {
      course_id: course.id,
      title: course.title,
      alignment_score: 0,
      reason: "Error generating alignment score",
      recommendation_type: type,
      priority: 5,
      category,
      credits: course.credits
    };
  }
}

async function generateAllAlignmentScores() {
  const incompleteReqs = findIncompleteRequirements(maxProgress);
  const alignments: CourseAlignment[] = [];
  
  // Get finance electives
  const financeElectiveReq = maxProgress.requirements.find(req => req.id === 'FINANCE_ELECTIVES');
  const completedElectives = new Set(
    financeElectiveReq?.student_status.courses_completed?.map(c => c.id) || []
  );
  
  if (incompleteReqs.financeElectivesNeeded > 0) {
    const availableElectives = financeElectiveReq?.available_courses || [];
    console.log(`Analyzing ${availableElectives.length} finance electives...`);
    
    for (const course of availableElectives) {
      if (!completedElectives.has(course.id)) {
        const alignment = await analyzeCourse(course, 'elective', 'Finance Electives');
        alignments.push(alignment);
        console.log(`Analyzed ${course.id}: ${alignment.alignment_score.toFixed(2)}`);
      }
    }
  }

  // Get gen ed courses
  for (const category of incompleteReqs.genEdCategoriesMissing) {
    const genEdCategory = Object.entries(GEN_ED_COURSES).find(([_, data]) => 
      data.title.toLowerCase().includes(category.toLowerCase())
    );
    
    if (genEdCategory) {
      const [_, data] = genEdCategory;
      console.log(`Analyzing ${data.courses.length} courses for ${data.title}...`);
      
      for (const course of data.courses) {
        const alignment = await analyzeCourse(course, 'gen_ed', data.title);
        alignments.push(alignment);
        console.log(`Analyzed ${course.id}: ${alignment.alignment_score.toFixed(2)}`);
      }
    }
  }

  // Store in Supabase
  const { error } = await supabase
    .from('course_alignments')
    .upsert(
      alignments.map(alignment => ({
        ...alignment,
        student_id: maxProgress.student_summary.id,
        generated_at: new Date().toISOString()
      })),
      { onConflict: 'student_id,course_id' }
    );

  if (error) {
    console.error('Error storing alignments:', error);
  } else {
    console.log(`Successfully stored ${alignments.length} course alignments`);
  }

  return alignments;
}

// Run the script
generateAllAlignmentScores().catch(console.error); 