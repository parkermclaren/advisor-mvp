import OpenAI from 'openai';
import { GEN_ED_COURSES } from './genEdCourses';
import { maxProgress } from './studentData';
import { RecommendationContext } from './types';

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

// Add interface for AI response
interface AIRecommendation {
  course: string;
  reason: string;
  priority: number;
}

const openai = new OpenAI();

interface RecommendationRequest {
  student_data: {
    student_summary: {
      career_goals: string[];
      academic_interests: string[];
      academic_standing: string;
      completed_credits: number;
      remaining_credits: number;
    };
  };
  incomplete_requirements: {
    genEdCategoriesMissing: string[];
    financeElectivesNeeded: number;
  };
}

const SYSTEM_PROMPT = `You are an academic advisor AI recommending a balanced course load for next semester ONLY. 

STRICT RULES:
- You can ONLY recommend courses from the lists that will be provided
- You must ONLY use course IDs that exist in these lists
- Your recommendations must be either type "gen_ed" or "elective"
- Priority values MUST be between 1 and 5 (1 = highest priority, 5 = lowest)
- DO NOT make up or generate course IDs
- DO NOT recommend core courses
- DO NOT recommend courses the student has already completed
- CONSIDER the total credit load including required core courses

Your response must be a valid JSON object with this structure:
{
  "recommendations": [
    {
      "course_id": string (MUST exist in the provided course lists),
      "recommendation_type": string (ONLY "gen_ed" or "elective"),
      "priority": number (MUST be 1-5, where 1 is highest priority),
      "reason": string (explain why this specific course fits their interests/goals AND why it makes sense for next semester),
      "metadata": {
        "category": string (must match the exact category name from the lists)
      }
    }
  ]
}

IMPORTANT GUIDELINES FOR NEXT SEMESTER:
1. Consider that the student MUST take their core courses (no need to explain why, as these are mandatory)
2. Only recommend 1-2 additional courses that would create a balanced schedule
3. Total credits (including core courses) should not exceed 15-16 for a manageable load
4. If recommending a finance elective, pick the ONE that best aligns with their specific career goals and interests
5. If recommending a gen ed, consider courses that:
   - Directly complement their stated career goals
   - Build relevant skills for their field of interest
   - Offer strategic value beyond just fulfilling requirements
   - Provide unique perspectives valuable in their chosen career path
6. For each elective or gen ed recommendation, explain:
   - Why this specific course is strategically valuable for their career goals
   - How it builds relevant skills for their intended career path
   - Why it makes sense to take it next semester specifically
7. Prioritize courses that offer compound value (e.g., a gen-ed that also builds relevant industry knowledge)

Remember: The goal is not just to fulfill requirements, but to choose courses that maximize value for their career path/general interests.`;

export async function generateAIRecommendations(request: RecommendationRequest) {
  const { student_data, incomplete_requirements } = request;
  
  // Get core courses to exclude from recommendations
  const coreCourseIds = new Set(
    maxProgress.requirements
      .filter(req => req.type === 'finance_core')
      .map(req => req.id)
  );
  
  // Get finance electives from student data
  const financeElectiveReq = maxProgress.requirements.find(req => req.id === 'FINANCE_ELECTIVES');
  const completedFinanceElectives = new Set(
    financeElectiveReq?.student_status.courses_completed?.map(c => c.id) || []
  );
  
  // Fix: Ensure we're properly getting the available courses from the requirement
  const availableFinanceElectives = financeElectiveReq?.student_status.available_courses || 
                                  financeElectiveReq?.available_courses || [];
  
  // Filter out completed courses AND core courses
  const filteredFinanceElectives = availableFinanceElectives.filter(
    course => !completedFinanceElectives.has(course.id) && !coreCourseIds.has(course.id)
  );

  console.log('Finance Electives Debug:');
  console.log('- Needed:', incomplete_requirements.financeElectivesNeeded);
  console.log('- Raw Available:', availableFinanceElectives.length);
  console.log('- Filtered Available:', filteredFinanceElectives.length);
  console.log('- Completed:', Array.from(completedFinanceElectives));
  console.log('- Core Courses (excluded):', Array.from(coreCourseIds));

  // Build context about available gen ed courses
  const availableGenEdCourses = Object.entries(GEN_ED_COURSES)
    .filter(([category]) => {
      // Convert category to match the format in genEdCategoriesMissing
      const normalizedCategory = category.toLowerCase().replace(/_/g, ' ');
      
      // Check if this category matches any of our missing requirements
      return incomplete_requirements.genEdCategoriesMissing.some(missingCat => {
        const normalizedMissingCat = missingCat.toLowerCase().replace(/[^a-z ]/g, '');
        return normalizedCategory.includes(normalizedMissingCat) || 
               normalizedMissingCat.includes(normalizedCategory);
      });
    })
    .map(([category, data]) => ({
      category,
      title: data.title,
      credits_required: data.credits_required,
      notes: data.notes,
      // Filter out core courses from gen ed options
      courses: data.courses.filter(course => !coreCourseIds.has(course.id))
    }));

  // Log what categories we found for debugging
  console.log('Available Gen Ed Categories:', availableGenEdCourses.map(c => c.title));

  // Construct the prompt
  const prompt = `
STUDENT CONTEXT:
- Academic Standing: ${student_data.student_summary.academic_standing}
- Completed Credits: ${student_data.student_summary.completed_credits}
- Remaining Credits: ${student_data.student_summary.remaining_credits}
- Current Term: ${maxProgress.current_term.term}
- Next Registration Term: ${maxProgress.current_term.next_registration_term}

REQUIRED CORE COURSES (Student MUST take these - no explanation needed as they are mandatory):
${maxProgress.requirements
  .filter(req => req.type === 'finance_core' && req.student_status.status === 'not_started')
  .map(req => `- ${req.id}: ${req.title} (${req.credits_required} credits)${req.year_level ? ` - Year ${req.year_level} requirement` : ''}`)
  .join('\n')}

STUDENT NEEDS:
${incomplete_requirements.financeElectivesNeeded > 0 ? 
  `1. Finance Electives (${incomplete_requirements.financeElectivesNeeded} credits needed) - You MUST recommend 2-3 finance elective courses that align with the student's career goals AND academic interests.` 
  : ''}
${incomplete_requirements.genEdCategoriesMissing.map((cat, i) => 
  `${incomplete_requirements.financeElectivesNeeded > 0 ? i + 2 : i + 1}. ${cat} (3 credits) - Choose from ${cat} courses below`
).join('\n')}

Student Profile:
- Career Goal: ${student_data.student_summary.career_goals.join(', ')}
- Interests: ${student_data.student_summary.academic_interests.join(', ')}

AVAILABLE COURSES YOU CAN RECOMMEND FROM:
${incomplete_requirements.financeElectivesNeeded > 0 ? `
=== Finance Electives (TOP PRIORITY) ===
Already completed: ${Array.from(completedFinanceElectives).join(', ')}
Available Courses (MUST recommend 2-3 from these):
${filteredFinanceElectives.map(course => 
  `- ${course.id}: ${course.title} (${course.credits} credits)`
).join('\n')}

` : ''}
${availableGenEdCourses.map(cat => `
=== ${cat.title} ===
Available Courses (ONLY recommend from these):
${cat.courses.map(course => `- ${course.id}: ${course.title} (${course.credits} credits)`).join('\n')}
`).join('\n')}

REQUIREMENTS FOR YOUR RESPONSE:
1. First, acknowledge the required core courses (no need to explain why, as these are mandatory)
2. Then recommend 2-3 finance elective courses FIRST, with a balanced mix of courses that align with:
   - The student's career goals
   - The student's academic interests
   - Some courses should satisfy BOTH career goals and interests when possible
3. Then recommend 2-3 courses for each remaining gen ed requirement
4. You can ONLY recommend courses listed above
5. You cannot recommend any already completed courses
6. Total credits should not exceed 18 (including required core courses)
7. For ALL elective and gen ed recommendations (NOT core courses), provide explanations that consider BOTH career goals AND academic interests
   - Some recommendations should primarily align with career goals
   - Some recommendations should primarily align with academic interests
   - Some recommendations should align with both when possible

Remember: ONLY use course IDs that are explicitly listed above. DO NOT make up course IDs.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ],
      temperature: 0.5,
      max_tokens: 4000
    });

    // Parse and structure the AI's recommendations
    let recommendations = [];
    let explanation = '';
    
    try {
      const content = response.choices[0].message.content || '{"recommendations": [], "explanation": ""}';
      
      // More robust cleanup of markdown and JSON formatting
      const cleanContent = content
        .replace(/^```json\n|\n```$/g, '') // Remove outer JSON code block
        .replace(/```/g, '') // Remove any remaining code block markers
        .replace(/\n\s*\n/g, '\n') // Remove multiple newlines
        .trim(); // Clean up any extra whitespace
      
      console.log('\nAI Response Debug:');
      console.log('Raw Response:', content);
      console.log('Cleaned Response:', cleanContent);
      
      try {
        const parsed = JSON.parse(cleanContent);
        
        // Validate recommendations array
        if (Array.isArray(parsed.recommendations)) {
          recommendations = parsed.recommendations;
          console.log('Found recommendations array:', recommendations.length);
        } else if (typeof parsed.recommendations === 'object') {
          recommendations = [parsed.recommendations];
          console.log('Found single recommendation object');
        } else {
          console.error('No valid recommendations found in response');
          recommendations = [];
        }

        // Get explanation from either field
        explanation = parsed.acknowledgment || parsed.explanation || '';
        console.log('Explanation found:', !!explanation);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        console.error('Failed to parse content:', cleanContent);
        recommendations = [];
        explanation = '';
      }
    } catch (error) {
      console.error('Error processing AI response:', error);
      return [];
    }
    
    // Create a lookup map for faster course validation
    const courseLookup = new Map();
    
    // Add gen ed courses to lookup
    Object.values(GEN_ED_COURSES).forEach(category => {
      category.courses.forEach(course => {
        courseLookup.set(course.id, {
          ...course,
          category: category.title,
          type: 'gen_ed'
        });
      });
    });

    // Add finance electives to lookup
    filteredFinanceElectives.forEach(course => {
      courseLookup.set(course.id, {
        ...course,
        category: 'Finance Electives',
        type: 'elective'
      });
    });

    // Format and validate recommendations
    const formattedRecommendations = recommendations
      .filter((rec: AIRecommendation) => {
        const courseExists = courseLookup.has(rec.course);
        if (!courseExists) {
          console.error(`Invalid course recommendation: ${rec.course} does not exist in our course list`);
        }
        // Validate priority is between 1-5
        if (rec.priority < 1 || rec.priority > 5) {
          console.error(`Invalid priority value ${rec.priority} for course ${rec.course}, adjusting to valid range`);
          rec.priority = Math.max(1, Math.min(5, rec.priority));
        }
        return courseExists;
      })
      .map((rec: AIRecommendation) => {
        const course = courseLookup.get(rec.course);
        return {
          course_id: rec.course,
          metadata: {
            title: course.title,
            type: course.type,
            category: course.category,
            explanation: rec.reason
          },
          credits: course.credits,
          reason: rec.reason,
          priority: rec.priority,
          recommendation_type: course.type
        };
      });

    // Debug logging for explanation and recommendations
    console.log('\nRecommendation Engine Debug:');
    console.log('- Raw Recommendations:', JSON.stringify(recommendations, null, 2));
    console.log('- Formatted Recommendations:', JSON.stringify(formattedRecommendations, null, 2));
    console.log('- Available Courses:', Array.from(courseLookup.keys()));
    console.log('- Has Explanation:', !!explanation);
    console.log('- Explanation Length:', explanation?.length || 0);
    console.log('- First Recommendation Metadata:', formattedRecommendations[0]?.metadata);
    console.log('- Total Recommendations:', formattedRecommendations.length);
    console.log('- Recommendation Types:', formattedRecommendations.map((r: { recommendation_type: string }) => r.recommendation_type));

    if (formattedRecommendations.length === 0) {
      console.error('No valid course recommendations were generated');
      console.error('Raw recommendations:', recommendations);
      console.error('Available courses:', Array.from(courseLookup.keys()));
    }

    return formattedRecommendations;
  } catch (error) {
    console.error('Error generating AI recommendations:', error);
    return [];
  }
}

export async function createRecommendationChunk(recommendations: Recommendation[], context: RecommendationContext) {
  // Group recommendations by type
  const coreRecs = recommendations.filter(r => r.recommendation_type === 'core');
  const genEdRecs = recommendations.filter(r => r.recommendation_type === 'gen_ed');
  const electiveRecs = recommendations.filter(r => r.recommendation_type === 'elective');

  // Format the content in a clear, structured way
  let content = `# Course Recommendations for ${maxProgress.current_term.next_registration_term}\n\n`;
  
  // Required Courses Section
  content += `## Required Core Courses (${context.core_credits} credits)\n`;
  content += `These courses are mandatory for your program and must be taken next semester:\n\n`;
  coreRecs.forEach(rec => {
    content += `- ${rec.course_id}: ${rec.metadata.title} (${rec.credits} credits)\n`;
  });
  content += '\n';

  // Additional Recommendations Section
  content += `## Additional Course Options (Choose 1 course from each category)\n`;

  if (electiveRecs.length > 0) {
    content += `### Finance Elective Options\n`;
    content += `Select ONE of the following finance elective courses:\n\n`;
    electiveRecs.forEach(rec => {
      content += `- ${rec.course_id}: ${rec.metadata.title} (${rec.credits} credits)\n`;
      if (rec.reason) {
        content += `  * ${rec.reason}\n`;
      }
    });
    content += '\n';
  }

  if (genEdRecs.length > 0) {
    content += `### General Education Options\n`;
    content += `Select ONE of the following general education courses:\n\n`;
    genEdRecs.forEach(rec => {
      content += `- ${rec.course_id}: ${rec.metadata.title} (${rec.credits} credits)\n`;
      content += `  * Fulfills: ${rec.metadata.category}\n`;
      if (rec.reason) {
        content += `  * ${rec.reason}\n`;
      }
    });
    content += '\n';
  }

  // Credit Guidelines
  content += `## Credit Guidelines\n`;
  content += `- Required Core Credits: ${context.core_credits}\n`;
  content += `- Target Total Credits: 15-16\n`;
  content += `- Maximum Credits: 18\n`;

  // Create the chunk object
  return {
    title: `Course Recommendations for ${maxProgress.current_term.next_registration_term}`,
    content,
    metadata: {
      type: 'course_recommendations',
      term: maxProgress.current_term.next_registration_term,
      student_id: maxProgress.student_summary.id,
      core_credits: context.core_credits,
      total_recommendations: recommendations.length,
      recommendation_types: {
        core: coreRecs.length,
        elective: electiveRecs.length,
        gen_ed: genEdRecs.length
      }
    }
  };
} 