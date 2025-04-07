import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { maxProgress } from '../studentData';

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

type CourseInfo = {
  code: string;
  title: string;
  credits: number;
  department: string;
  description?: string | null;
  terms_offered?: string[] | null;
  tags?: string[] | null;
  alignment_score?: number;
  alignment_reason?: string;
};

type CategoryCoursesResult = {
  category: {
    name: string;
    type: string;
    subtype: string;
    description?: string | null;
    credits_required: number;
    credits_completed: number;
    additional_credits_needed: number;
    needs_200_level: boolean;
  };
  courses: CourseInfo[];
  total_courses: number;
  has_more: boolean;
};

/**
 * Get courses by category name or type
 * This function can be used to answer questions like:
 * - "What are some finance elective courses?"
 * - "What are some aesthetic awareness courses?"
 * - "Show me courses that satisfy the literary perspectives requirement"
 * 
 * @param categoryName The name or type of the category to search for (e.g., "Finance Electives", "Aesthetic Awareness")
 * @param limit Optional limit on the number of courses to return (default: 5)
 * @param personalize Whether to personalize the results based on student goals and interests (default: true)
 * @param offset Optional offset for pagination, to skip courses already shown (default: 0)
 * @returns An object containing the category information and matching courses
 */
export async function getCoursesByCategory(
  categoryName: string, 
  limit: number = 5,
  personalize: boolean = true,
  offset: number = 0
): Promise<CategoryCoursesResult> {
  try {
    // Validate inputs
    if (!categoryName || typeof categoryName !== 'string') {
      console.error(`Invalid categoryName: ${categoryName} (${typeof categoryName})`);
      categoryName = String(categoryName || 'Finance Electives');
    }
    
    if (typeof limit !== 'number' || isNaN(limit) || limit <= 0) {
      console.error(`Invalid limit: ${limit} (${typeof limit})`);
      limit = 5;
    }
    
    if (typeof offset !== 'number' || isNaN(offset) || offset < 0) {
      console.error(`Invalid offset: ${offset} (${typeof offset})`);
      offset = 0;
    }
    
    console.log(`Searching for courses in category: "${categoryName}" (limit: ${limit}, offset: ${offset}, personalize: ${personalize})`);
    
    // Get the student's completed courses to filter them out later
    const completedCourseIds = new Set<string>();
    
    // Find the student's requirement for this category to get accurate progress information
    let studentRequirement = null;
    
    // Look through the student's requirements to find the matching one
    for (const req of maxProgress.requirements) {
      // Add all completed courses to our set
      if (req.student_status.courses_completed) {
        req.student_status.courses_completed.forEach(course => {
          completedCourseIds.add(course.id);
        });
      }
      
      // If this is a single-course requirement that's completed
      if (req.student_status.course) {
        completedCourseIds.add(req.student_status.course.id);
      }
      
      // Check if this requirement matches our category
      const reqTitle = req.title.toLowerCase();
      const searchCategory = categoryName.toLowerCase();
      
      if (reqTitle.includes(searchCategory) || searchCategory.includes(reqTitle)) {
        studentRequirement = req;
      }
    }
    
    console.log(`Found ${completedCourseIds.size} completed courses to filter out`);
    if (studentRequirement) {
      console.log(`Found matching student requirement: ${studentRequirement.title}`);
      console.log(`Status: ${studentRequirement.student_status.status}, Credits completed: ${studentRequirement.student_status.credits_completed || 0}/${studentRequirement.credits_required}`);
    }
    
    // Step 1: Find the matching requirement category
    // First try exact match on name
    let { data: categoryData, error: categoryError } = await supabase
      .from('requirement_categories')
      .select('*')
      .ilike('name', categoryName)
      .limit(1);
    
    // If no exact match, try fuzzy search on name, type, or subtype
    if ((!categoryData || categoryData.length === 0) && !categoryError) {
      const searchTerms = categoryName.toLowerCase().split(/\s+/);
      
      // First try to match the whole phrase
      const { data: phraseMatchData, error: phraseMatchError } = await supabase
        .from('requirement_categories')
        .select('*')
        .or(`name.ilike.%${categoryName.toLowerCase()}%,type.ilike.%${categoryName.toLowerCase()}%,subtype.ilike.%${categoryName.toLowerCase()}%,description.ilike.%${categoryName.toLowerCase()}%`)
        .limit(1);
      
      if (phraseMatchData && phraseMatchData.length > 0) {
        categoryData = phraseMatchData;
      } else if (!phraseMatchError) {
        // If no phrase match, try to match known categories with similar names
        // This is a more targeted approach than the previous fuzzy search
        const knownCategories = [
          'Values and Ethical Reasoning',
          'Individual and Society',
          'Global Issues',
          'Quantitative Reasoning',
          'Science and Technology',
          'World Cultures',
          'Writing Designated',
          'Aesthetic Awareness',
          'Literary Perspectives',
          'Finance Electives'
        ];
        
        // Find the best matching category based on similarity
        let bestMatch = '';
        let highestSimilarity = 0;
        
        for (const category of knownCategories) {
          // Simple similarity check: count matching words
          const categoryWords = category.toLowerCase().split(/\s+/);
          let matchCount = 0;
          
          for (const searchTerm of searchTerms) {
            if (categoryWords.some(word => word.includes(searchTerm) || searchTerm.includes(word))) {
              matchCount++;
            }
          }
          
          const similarity = matchCount / Math.max(searchTerms.length, categoryWords.length);
          
          if (similarity > highestSimilarity) {
            highestSimilarity = similarity;
            bestMatch = category;
          }
        }
        
        if (bestMatch && highestSimilarity > 0.3) { // Threshold for considering it a match
          console.log(`Fuzzy matched "${categoryName}" to known category "${bestMatch}" with similarity ${highestSimilarity}`);
          
          ({ data: categoryData, error: categoryError } = await supabase
            .from('requirement_categories')
            .select('*')
            .ilike('name', bestMatch)
            .limit(1));
        } else {
          // If still no match, try individual term matching as a last resort
          // But construct the query more carefully to avoid SQL syntax errors
          const filters = searchTerms.map(term => 
            `name.ilike.%${term}%,type.ilike.%${term}%,subtype.ilike.%${term}%,description.ilike.%${term}%`
          ).join(',');
          
          ({ data: categoryData, error: categoryError } = await supabase
            .from('requirement_categories')
            .select('*')
            .or(filters)
            .limit(1));
        }
      }
    }
    
    if (categoryError) {
      throw categoryError;
    }
    
    if (!categoryData || categoryData.length === 0) {
      throw new Error(`No category found matching "${categoryName}"`);
    }
    
    const category = categoryData[0];
    console.log(`Found category: ${category.name} (${category.type}/${category.subtype})`);
    
    // Step 2: Get courses that satisfy this requirement category
    const { data: satisfierData, error: satisfierError } = await supabase
      .from('requirement_satisfiers')
      .select(`
        course_id,
        courses:course_id (
          id, code, title, credits, description, 
          terms_offered, department, tags
        )
      `)
      .eq('requirement_category_id', category.id)
      .limit(personalize ? 50 : limit + offset); // Get more courses if we're going to personalize
    
    if (satisfierError) {
      throw satisfierError;
    }
    
    // Step 3: Format the results
    let courses: CourseInfo[] = satisfierData
      ? satisfierData
          .filter(item => item.courses) // Filter out any null courses
          .filter(item => {
            // Type assertion to help TypeScript understand the structure
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const courseData = item.courses as any;
            return !completedCourseIds.has(courseData.id); // Filter out completed courses
          })
          .map(item => {
            // Type assertion to help TypeScript understand the structure
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const courseData = item.courses as any;
            return {
              code: courseData.code,
              title: courseData.title,
              credits: courseData.credits,
              department: courseData.department,
              description: courseData.description,
              terms_offered: courseData.terms_offered,
              tags: courseData.tags
            };
          })
      : [];
      
    console.log(`Found ${courses.length} courses after filtering out completed courses`);
    
    // Add category-specific information to the result
    const categoryInfo = {
      name: category.name,
      type: category.type,
      subtype: category.subtype,
      description: category.description,
      credits_required: category.credits_required,
      credits_completed: studentRequirement?.student_status.credits_completed || 0,
      additional_credits_needed: studentRequirement?.student_status.additional_credits_needed || 0,
      needs_200_level: studentRequirement?.student_status.needs_200_level || false
    };
    
    // Step 4: If personalization is enabled, use OpenAI to rank and explain the courses
    if (personalize && courses.length > 0) {
      console.log(`Personalizing ${courses.length} courses based on student profile`);
      
      // Get student profile information
      const studentProfile = {
        career_goals: maxProgress.student_summary.career_goals,
        academic_interests: maxProgress.student_summary.academic_interests,
        academic_standing: maxProgress.student_summary.academic_standing,
        completed_credits: maxProgress.student_summary.completed_credits
      };
      
      // Add requirement-specific context to the prompt
      let requirementContext = '';
      if (studentRequirement) {
        requirementContext = `
REQUIREMENT PROGRESS:
- Credits completed: ${studentRequirement.student_status.credits_completed || 0}/${studentRequirement.credits_required}
- Credits needed: ${studentRequirement.student_status.additional_credits_needed || (studentRequirement.credits_required - (studentRequirement.student_status.credits_completed || 0))}
${studentRequirement.student_status.needs_200_level ? '- Student needs at least one course at 200-level or higher' : ''}
`;
      }
      
      // Create a prompt for OpenAI
      const prompt = `
STUDENT PROFILE:
- Career Goals: ${studentProfile.career_goals.join(', ')}
- Academic Interests: ${studentProfile.academic_interests.join(', ')}
- Academic Standing: ${studentProfile.academic_standing}
- Completed Credits: ${studentProfile.completed_credits}

CATEGORY: ${category.name}
${category.description ? `DESCRIPTION: ${category.description}` : ''}
${requirementContext}

AVAILABLE COURSES:
${courses.map(course => `- ${course.code}: ${course.title} (${course.credits} credits)
  ${course.description ? `Description: ${course.description}` : ''}
  ${course.tags ? `Tags: ${course.tags.join(', ')}` : ''}`).join('\n')}

TASK:
Analyze the courses above and rank them based on how well they align with the student's career goals AND academic interests.
For each course, provide:
1. An alignment score from 0.0 to 1.0 (where 1.0 is perfect alignment)
2. A brief explanation (1-2 sentences) of why this course would be valuable for the student

When determining alignment scores, consider:
- How well the course aligns with the student's stated career goals
- How well the course aligns with the student's academic interests
- Courses that align with BOTH career goals AND interests should receive higher scores
- Some courses may primarily align with interests rather than career goals, and these should still receive good scores if the alignment with interests is strong

Return your analysis as a JSON array of objects with the following structure:
[
  {
    "code": "COURSE_CODE",
    "alignment_score": 0.95,
    "alignment_reason": "This course directly supports the student's interest in X and career goal of Y by..."
  },
  ...
]

Sort the courses by alignment score in descending order (highest alignment first).
`;
      
      try {
        // Call OpenAI API
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are an academic advisor AI that helps students find courses that align with their goals and interests." },
            { role: "user", content: prompt }
          ],
          temperature: 0.5,
          max_tokens: 2000
        });
        
        // Parse the response
        const content = response.choices[0].message.content || '[]';
        
        // Clean up the response by removing markdown code blocks
        const cleanContent = content
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        
        try {
          // Parse the JSON response
          const courseRankings = JSON.parse(cleanContent);
          
          if (Array.isArray(courseRankings) && courseRankings.length > 0) {
            console.log(`Received rankings for ${courseRankings.length} courses`);
            
            // Create a map of course codes to their rankings
            const rankingsMap = new Map();
            courseRankings.forEach(ranking => {
              rankingsMap.set(ranking.code, {
                alignment_score: ranking.alignment_score,
                alignment_reason: ranking.alignment_reason
              });
            });
            
            // Add alignment scores and reasons to the courses
            courses = courses.map(course => ({
              ...course,
              alignment_score: rankingsMap.get(course.code)?.alignment_score || 0,
              alignment_reason: rankingsMap.get(course.code)?.alignment_reason || ''
            }));
            
            // Sort courses by alignment score (highest first)
            courses.sort((a, b) => (b.alignment_score || 0) - (a.alignment_score || 0));
            
            // After sorting by alignment score, apply the offset and limit
            courses = courses.slice(offset, offset + limit);
          } else {
            console.error('Invalid course rankings format:', courseRankings);
            // Fall back to alphabetical sorting
            courses.sort((a, b) => a.code.localeCompare(b.code));
            courses = courses.slice(offset, offset + limit);
          }
        } catch (parseError) {
          console.error('Error parsing OpenAI response:', parseError);
          console.error('Raw content:', content);
          console.error('Cleaned content:', cleanContent);
          
          // Fall back to alphabetical sorting
          courses.sort((a, b) => a.code.localeCompare(b.code));
          courses = courses.slice(offset, offset + limit);
        }
      } catch (openaiError) {
        console.error('Error calling OpenAI API:', openaiError);
        
        // Fall back to alphabetical sorting
        courses.sort((a, b) => a.code.localeCompare(b.code));
        courses = courses.slice(offset, offset + limit);
      }
    } else {
      // If not personalizing, just sort alphabetically and apply offset and limit
      courses.sort((a, b) => a.code.localeCompare(b.code));
      courses = courses.slice(offset, offset + limit);
    }
    
    // Add total_available_courses to the result
    const totalAvailable = await supabase
      .from('requirement_satisfiers')
      .select('course_id', { count: 'exact' })
      .eq('requirement_category_id', category.id);
    
    const totalCount = totalAvailable.count || courses.length;
    
    console.log(`Found ${courses.length} courses for category "${category.name}" (offset: ${offset}, total available: ${totalCount})`);
    
    // Return the results with the additional category information
    return {
      category: {
        name: category.name,
        type: category.type,
        subtype: category.subtype,
        description: category.description,
        credits_required: category.credits_required,
        credits_completed: categoryInfo.credits_completed,
        additional_credits_needed: categoryInfo.additional_credits_needed,
        needs_200_level: categoryInfo.needs_200_level
      },
      courses: courses,
      total_courses: courses.length,
      has_more: courses.length > limit
    };
  } catch (error) {
    console.error('Error fetching courses by category:', error);
    throw error;
  }
} 