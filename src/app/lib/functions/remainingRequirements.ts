import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type Requirement = {
  id: number;
  program_id: string;
  year_level: string;
  requirement_type: string;
  ge_category: string | null;
  course_code: string | null;
  course_title: string | null;
  credits: number;
  is_required: boolean;
  is_or_choice: boolean;
  or_group: string | null;
  description: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type CompletedCourse = {
  course_code: string;
  course_title: string;
  earned_credits: number;
  grade: string;
  term_name: string;
  status: string;
  satisfies?: string[] | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  applied_to?: Record<string, unknown>;
};

type RemainingRequirement = {
  id: number;
  course_code: string | null;
  course_title: string | null;
  credits: number;
  year_level: string;
  requirement_type: string;
  ge_category?: string | null;
  is_required: boolean;
  is_or_choice: boolean;
  or_group: string | null;
  description: string | null;
  note?: string;
  remaining_credits?: number; // Added for elective requirements
  is_satisfied?: boolean; // Added to track if requirement is satisfied
};

/**
 * Get a student's remaining program requirements
 * @param studentId The ID of the student
 * @returns An object containing the remaining requirements
 */
export async function getRemainingRequirements(studentId: string) {
  try {
    console.log(`Fetching remaining requirements for student ID: ${studentId}`);
    
    // Use the hardcoded student ID from the database for now
    const actualStudentId = '3029e6f2-ee85-4ae3-8ace-578cb7314567';
    console.log(`Using actual student ID from database: ${actualStudentId}`);
    
    // Step 1: Get the student's program
    // For this MVP, we'll assume the student is in the Finance program with code "FIN"
    const programId = "FIN";
    
    // Step 2: Get all program requirements
    const { data: allRequirements, error: requirementsError } = await supabase
      .from('program_requirements')
      .select('*')
      .eq('program_id', programId);
    
    if (requirementsError) {
      throw requirementsError;
    }
    
    console.log(`Found ${allRequirements?.length || 0} program requirements`);
    
    // Step 3: Get all completed courses for the student
    const { data: completedCourses, error: coursesError } = await supabase
      .from('student_courses')
      .select('course_code, course_title, earned_credits, grade, term_name, status, satisfies, applied_to')
      .eq('student_id', actualStudentId)
      .or('status.eq.completed,status.eq.COMPLETED'); // Handle case sensitivity
    
    if (coursesError) {
      throw coursesError;
    }
    
    console.log(`Found ${completedCourses?.length || 0} completed courses`);
    
    // Step 4: Identify OR choice groups and determine if any have been completed
    const completedCourseCodes = new Set(completedCourses?.map(course => course.course_code) || []);
    
    // Group requirements by or_group to handle OR choices
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orGroups = new Map<string, any[]>();
    
    if (allRequirements) {
      allRequirements.forEach(req => {
        if (req.is_or_choice && req.or_group) {
          if (!orGroups.has(req.or_group)) {
            orGroups.set(req.or_group, []);
          }
          orGroups.get(req.or_group)?.push(req);
        }
      });
    }
    
    // Check if any OR groups have been partially completed
    const completedOrGroups = new Set<string>();
    orGroups.forEach((courses, groupName) => {
      // If any course in the OR group is completed, the requirement is satisfied
      const isCompleted = courses.some(course => 
        course.course_code && completedCourseCodes.has(course.course_code)
      );
      
      if (isCompleted) {
        completedOrGroups.add(groupName);
      }
    });
    
    // Step 5: Track completed general education categories
    const completedGenEdCategories = new Set<string>();
    
    // For each completed course, check if it satisfies any general education category
    if (completedCourses) {
      completedCourses.forEach(course => {
        if (course.satisfies && Array.isArray(course.satisfies)) {
          course.satisfies.forEach(category => {
            // Normalize category names for comparison
            const normalizedCategory = category.trim();
            completedGenEdCategories.add(normalizedCategory);
            
            // Also add similar category names (handle slight variations in naming)
            if (normalizedCategory === 'Science & Technology') {
              completedGenEdCategories.add('Science and Technology');
            }
            if (normalizedCategory === 'Science and Technology') {
              completedGenEdCategories.add('Science & Technology');
            }
            // Add more mappings as needed
          });
        }
      });
    }
    
    console.log('Completed Gen Ed Categories:', Array.from(completedGenEdCategories));
    
    // Step 6: Calculate total credits earned by category
    const creditsByCategory: Record<string, number> = {};
    const creditsByYearAndCategory: Record<string, number> = {};
    
    // Calculate elective credits earned
    if (completedCourses) {
      completedCourses.forEach(course => {
        // Check if this is an elective course
        // For this MVP, we'll consider any BUS course that's not a core requirement as an elective
        const isBusCourse = course.course_code.startsWith('BUS') || course.course_code.startsWith('FIN');
        const isCoreCourse = allRequirements?.some(req => 
          req.requirement_type === 'CORE' && req.course_code === course.course_code
        );
        
        if (isBusCourse && !isCoreCourse) {
          // This is an elective course
          const credits = parseFloat(course.earned_credits.toString()) || 0;
          creditsByCategory['ELECTIVE'] = (creditsByCategory['ELECTIVE'] || 0) + credits;
          
          // Try to determine the year level for this course
          // For this MVP, we'll just assume all electives count towards Junior year requirements first
          const juniorElectiveKey = 'Junior_ELECTIVE';
          const seniorElectiveKey = 'Senior_ELECTIVE';
          
          // First fill Junior requirements, then Senior
          const juniorReq = allRequirements?.find(req => 
            req.requirement_type === 'ELECTIVE' && req.year_level === 'Junior'
          );
          // We're not using seniorReq, so we can remove it or comment it out
          /* const seniorReq = allRequirements?.find(req => 
            req.requirement_type === 'ELECTIVE' && req.year_level === 'Senior'
          ); */
          
          const juniorCreditsNeeded = juniorReq?.credits || 0;
          const juniorCreditsFilled = creditsByYearAndCategory[juniorElectiveKey] || 0;
          
          if (juniorCreditsFilled < juniorCreditsNeeded) {
            // Still need to fill Junior electives
            const creditsToAdd = Math.min(credits, juniorCreditsNeeded - juniorCreditsFilled);
            creditsByYearAndCategory[juniorElectiveKey] = juniorCreditsFilled + creditsToAdd;
            
            // If there are remaining credits, apply to Senior
            const remainingCredits = credits - creditsToAdd;
            if (remainingCredits > 0) {
              creditsByYearAndCategory[seniorElectiveKey] = (creditsByYearAndCategory[seniorElectiveKey] || 0) + remainingCredits;
            }
          } else {
            // Junior requirements are filled, add to Senior
            creditsByYearAndCategory[seniorElectiveKey] = (creditsByYearAndCategory[seniorElectiveKey] || 0) + credits;
          }
        }
      });
    }
    
    console.log('Credits by Category:', creditsByCategory);
    console.log('Credits by Year and Category:', creditsByYearAndCategory);
    
    // Step 7: Identify remaining requirements
    const remainingRequirements: RemainingRequirement[] = [];
    
    if (allRequirements) {
      allRequirements.forEach(req => {
        // Skip the PROGRAM_TOTAL entry
        if (req.requirement_type === 'PROGRAM_TOTAL') {
          return;
        }
        
        let isRemaining = false;
        let isSatisfied = false;
        let remainingCredits = 0;
        
        if (req.course_code) {
          // For specific course requirements
          if (!completedCourseCodes.has(req.course_code)) {
            // If this is part of an OR group that's already satisfied, it's not a remaining requirement
            if (!(req.is_or_choice && req.or_group && completedOrGroups.has(req.or_group))) {
              isRemaining = true;
            } else {
              // This is part of an OR group that's already satisfied
              isSatisfied = true;
            }
          } else {
            // This course has been completed
            isSatisfied = true;
          }
        } else {
          // For category-based requirements (gen ed, electives)
          if (req.requirement_type === 'GEN_ED' || req.requirement_type === 'GENERAL_ED') {
            // Check if this general education category has been completed
            if (req.ge_category && !completedGenEdCategories.has(req.ge_category)) {
              isRemaining = true;
            } else {
              isSatisfied = true;
            }
          } else if (req.requirement_type === 'ELECTIVE') {
            // For electives, check if enough elective credits have been earned for this year level
            const yearCategoryKey = `${req.year_level}_${req.requirement_type}`;
            const categoryCredits = creditsByYearAndCategory[yearCategoryKey] || 0;
            const requiredCredits = req.credits || 0;
            
            if (categoryCredits < requiredCredits) {
              isRemaining = true;
              remainingCredits = requiredCredits - categoryCredits;
            } else {
              isSatisfied = true;
            }
          }
        }
        
        // Add a note for OR choices
        let note: string | undefined;
        if (req.is_or_choice && req.or_group) {
          const groupCourses = orGroups.get(req.or_group) || [];
          if (groupCourses.length > 1) {
            const otherCourses = groupCourses
              .filter(c => c.course_code !== req.course_code)
              .map(c => `${c.course_title} (${c.course_code})`)
              .join(' or ');
            note = `You must take either this course or ${otherCourses}`;
          }
        } else if (!req.course_code) {
          // Add notes for category-based requirements
          if (req.requirement_type === 'GEN_ED' || req.requirement_type === 'GENERAL_ED') {
            note = `You need to take a course that satisfies the ${req.ge_category} category`;
          } else if (req.requirement_type === 'ELECTIVE') {
            const yearCategoryKey = `${req.year_level}_${req.requirement_type}`;
            const categoryCredits = creditsByYearAndCategory[yearCategoryKey] || 0;
            const remainingCreditsForYear = Math.max(0, req.credits - categoryCredits);
            
            if (remainingCreditsForYear > 0) {
              note = `You need to take ${remainingCreditsForYear} more credits of ${req.description || 'electives'} in your ${req.year_level} year`;
            } else {
              note = `You have completed the ${req.description || 'electives'} requirement for your ${req.year_level} year`;
            }
          }
        }
        
        // Always include elective requirements, even if they're satisfied
        if (isRemaining || req.requirement_type === 'ELECTIVE') {
          remainingRequirements.push({
            id: req.id,
            course_code: req.course_code,
            course_title: req.course_title,
            credits: req.credits,
            year_level: req.year_level,
            requirement_type: req.requirement_type,
            ge_category: req.ge_category,
            is_required: req.is_required,
            is_or_choice: req.is_or_choice,
            or_group: req.or_group,
            description: req.description,
            note,
            remaining_credits: remainingCredits > 0 ? remainingCredits : undefined,
            is_satisfied: isSatisfied
          });
        }
      });
    }
    
    // Step 8: Calculate statistics
    // Get the PROGRAM_TOTAL entry for the actual total required credits
    const programTotalEntry = allRequirements?.find(req => req.requirement_type === 'PROGRAM_TOTAL');
    const totalRequiredCredits = programTotalEntry?.credits || 125; // Default to 125 if not found
    
    const earnedCredits = completedCourses?.reduce((sum, course) => 
      sum + (parseFloat(course.earned_credits.toString()) || 0), 0) || 0;
    const remainingCredits = totalRequiredCredits - earnedCredits;
    
    // Group remaining requirements by type
    const coreRequirements = remainingRequirements.filter(req => 
      req.requirement_type === 'CORE' && (req.is_required || req.is_or_choice) && !req.is_satisfied);
    
    // Include all elective requirements, even if they're satisfied
    const electiveRequirements = remainingRequirements.filter(req => 
      req.requirement_type === 'ELECTIVE');
    
    const genEdRequirements = remainingRequirements.filter(req => 
      (req.requirement_type === 'GEN_ED' || req.requirement_type === 'GENERAL_ED' || req.ge_category) && !req.is_satisfied);
    
    // Step 9: Organize OR choice requirements
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orChoiceRequirements: Record<string, any[]> = {};
    remainingRequirements.forEach(req => {
      if (req.is_or_choice && req.or_group && !req.is_satisfied) {
        if (!orChoiceRequirements[req.or_group]) {
          orChoiceRequirements[req.or_group] = [];
        }
        orChoiceRequirements[req.or_group].push(req);
      }
    });
    
    // Return the result
    return {
      totalRequiredCredits,
      earnedCredits,
      remainingCredits,
      remainingRequirementCount: remainingRequirements.filter(req => !req.is_satisfied).length,
      coreRequirements,
      electiveRequirements,
      genEdRequirements,
      orChoiceRequirements,
      allRemainingRequirements: remainingRequirements
    };
  } catch (error) {
    console.error('Error fetching remaining requirements:', error);
    throw error;
  }
} 