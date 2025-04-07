import { createClient } from '@supabase/supabase-js';
import { getRecommendedCourses } from './recommendedCourses';

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Types
type SectionDetail = {
  section_id: string;
  course_id: string;
  course_code: string;
  course_title: string;
  section_code: string;
  day_pattern: string;
  start_time: string;
  end_time: string;
  location: string;
  instructor: string;
  credits: number;
  requirement_type: string;
  requirement_category?: string;
  score?: number;
  priority?: number;
  alignment_score?: number;
  alignment_reason?: string;
};

type TimeBlock = {
  day: string;
  start_time: string;
  end_time: string;
  is_class: boolean;
  course_code?: string;
};

type ScheduleConflict = {
  type: 'time_conflict' | 'preference_violation' | 'missing_requirement';
  description: string;
  severity: 'high' | 'medium' | 'low';
  affected_courses?: string[];
  resolution_options?: string[];
};

type StudentSchedule = {
  schedule_id: string;
  student_id: string;
  registration_term: string;
  sections: SectionDetail[];
  total_credits: number;
  schedule_conflicts?: ScheduleConflict[];
  schedule_stats: {
    early_morning_classes: number;
    back_to_back_classes: number;
    preferred_day_pattern_classes: number;
    time_blocks: TimeBlock[];
  };
  explanations?: string[];
};

type StudentPreference = {
  type: string;
  value: any;
  weight: number;
};

// Helper Functions
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

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

  // Check if times overlap
  const start1Min = timeToMinutes(start1);
  const end1Min = timeToMinutes(end1);
  const start2Min = timeToMinutes(start2);
  const end2Min = timeToMinutes(end2);

  return !(end1Min <= start2Min || end2Min <= start1Min);
}

function expandDayPattern(pattern: string): string[] {
  const days: string[] = [];
  if (pattern.includes('M')) days.push('Monday');
  if (pattern.includes('T')) days.push('Tuesday');
  if (pattern.includes('W')) days.push('Wednesday');
  if (pattern.includes('R')) days.push('Thursday');
  if (pattern.includes('F')) days.push('Friday');
  return days;
}

// Calculates a score for each course section based on:
// - How well it matches student preferences
// - Whether it creates desirable/undesirable patterns (like back-to-back classes)
// - Its alignment with student goals
function calculateSectionScore(
  section: SectionDetail,
  preferences: StudentPreference[],
  existingSchedule: SectionDetail[]
): { score: number; explanations: string[] } {
  let score = section.priority || 0;
  const explanations: string[] = [];

  // Base score from course priority and alignment
  if (section.alignment_score) {
    score += section.alignment_score;
    if (section.alignment_reason) {
      explanations.push(`Course aligns with student goals: ${section.alignment_reason}`);
    }
  }

  for (const pref of preferences) {
    switch (pref.type) {
      case 'time_of_day': {
        const startHour = parseInt(section.start_time.split(':')[0]);
        if (pref.value === 'no_early_morning' && startHour < 10) {
          score -= 30 * pref.weight;
          explanations.push('Early morning class (-30 points)');
        } else if (pref.value === 'afternoon' && startHour >= 12) {
          score += 20 * pref.weight;
          explanations.push('Preferred afternoon time slot (+20 points)');
        }
        break;
      }
      case 'day_pattern': {
        if (section.day_pattern === pref.value) {
          score += 25 * pref.weight;
          explanations.push(`Matches preferred day pattern ${pref.value} (+25 points)`);
        }
        break;
      }
      case 'back_to_back': {
        // Check if this section would create back-to-back classes
        const wouldBeBackToBack = existingSchedule.some(existing => {
          if (!hasTimeConflict(section.day_pattern, section.start_time, section.end_time,
                             existing.day_pattern, existing.start_time, existing.end_time)) {
            const gap = Math.abs(
              timeToMinutes(section.start_time) - timeToMinutes(existing.end_time)
            );
            return gap <= 15;
          }
          return false;
        });

        if (wouldBeBackToBack && pref.value === true) {
          score += 15 * pref.weight;
          explanations.push('Creates preferred back-to-back scheduling (+15 points)');
        } else if (wouldBeBackToBack && pref.value === false) {
          score -= 15 * pref.weight;
          explanations.push('Creates non-preferred back-to-back scheduling (-15 points)');
        }
        break;
      }
    }
  }

  return { score, explanations };
}

// Main schedule building function that uses a multi-stage approach:
// 1. Get recommendations and preferences
// 2. Score and prioritize available sections
// 3. Build conflict-free schedule starting with core requirements
// 4. Fill in gen-eds while respecting category limits
// 5. Add electives if credit space remains
export async function buildOptimizedSchedule(
  studentId: string,
  term: string
): Promise<StudentSchedule> {
  try {
    console.log(`Building optimized schedule for student ${studentId} for term ${term}`);

    // Step 1: Get course recommendations and student preferences
    const recommendations = await getRecommendedCourses(studentId);
    const { data: profileData } = await supabase
      .from('student_profiles')
      .select('schedule_priorities, commitments')
      .eq('student_id', studentId)
      .single();

    // Convert schedule priorities to weighted preferences
    const preferences: StudentPreference[] = (profileData?.schedule_priorities || [])
      .map((pref: string) => {
        if (pref.includes('Avoid classes before 10am')) {
          return { type: 'time_of_day', value: 'no_early_morning', weight: 1 };
        }
        if (pref.includes('Prefer classes on')) {
          const pattern = pref.split('on ')[1]?.trim();
          return { type: 'day_pattern', value: pattern, weight: 0.8 };
        }
        if (pref.includes('back-to-back')) {
          return { type: 'back_to_back', value: true, weight: 0.6 };
        }
        return { type: 'other', value: pref, weight: 0.5 };
      });

    // Step 2: Extract and prioritize courses
    const coursesToSchedule = new Map<string, {
      course: any,
      priority: number,
      requirement_type: string,
      requirement_category: string
    }>();

    // Add core courses first
    recommendations.categories
      .filter(cat => cat.type === 'CORE')
      .forEach(category => {
        category.recommendations.forEach(course => {
          if (course.course_code) {
            coursesToSchedule.set(course.course_code, {
              course,
              priority: 100,
              requirement_type: category.type,
              requirement_category: category.name
            });
          }
        });
      });

    // Add gen ed courses - prioritize having one from each category
    const genEdCategorySet = new Set<string>();
    recommendations.categories
      .filter(cat => cat.type === 'GEN_ED')
      .forEach(category => {
        // Track unique Gen Ed categories
        genEdCategorySet.add(category.name);
        
        category.recommendations.forEach(course => {
          if (course.course_code && !coursesToSchedule.has(course.course_code)) {
            coursesToSchedule.set(course.course_code, {
              course,
              priority: 50,
              requirement_type: category.type,
              requirement_category: category.name
            });
          }
          // Add specific course recommendations
          if (course.specific_courses) {
            course.specific_courses.forEach(specific => {
              if (!coursesToSchedule.has(specific.course_code)) {
                coursesToSchedule.set(specific.course_code, {
                  course: specific,
                  priority: 50,
                  requirement_type: category.type,
                  requirement_category: category.name
                });
              }
            });
          }
        });
      });

    // Log the number of Gen Ed categories we're trying to include
    console.log(`Found ${genEdCategorySet.size} different Gen Ed categories to include in the schedule`);

    // Step 3: Get all available sections for these courses
    const allSections: SectionDetail[] = [];
    const conflicts: ScheduleConflict[] = [];
    const explanations: string[] = [];

    for (const [courseCode, courseInfo] of coursesToSchedule) {
      const { data: sectionData } = await supabase
        .from('course_sections')
        .select('*, courses(title)')
        .eq('course_code', courseCode)
        .eq('term', term);

      if (sectionData && sectionData.length > 0) {
        sectionData.forEach(section => {
          allSections.push({
            ...section,
            course_title: courseInfo.course.course_title || section.courses?.title || '',
            credits: courseInfo.course.credits,
            requirement_type: courseInfo.requirement_type,
            requirement_category: courseInfo.requirement_category,
            priority: courseInfo.priority,
            alignment_score: courseInfo.course.alignment_score,
            alignment_reason: courseInfo.course.alignment_reason
          });
        });
      } else {
        conflicts.push({
          type: 'missing_requirement',
          description: `No available sections found for ${courseCode}`,
          severity: courseInfo.requirement_type === 'CORE' ? 'high' : 'medium',
          affected_courses: [courseCode]
        });
      }
    }

    // Step 4: Build schedule using constraint satisfaction
    const selectedSections: SectionDetail[] = [];
    const idealCreditRange = recommendations.ideal_credit_range;
    let currentCredits = 0;

    // Track which Gen Ed categories have already been included
    const includedGenEdCategories = new Set<string>();

    // Sort sections by requirement type and priority
    allSections.sort((a, b) => {
      // First prioritize core courses
      if (a.requirement_type === 'CORE' && b.requirement_type !== 'CORE') return -1;
      if (a.requirement_type !== 'CORE' && b.requirement_type === 'CORE') return 1;
      
      // Then prioritize by score
      return (b.priority || 0) - (a.priority || 0);
    });

    // Group sections by course
    const sectionsByCourse = new Map<string, SectionDetail[]>();
    allSections.forEach(section => {
      if (!sectionsByCourse.has(section.course_code)) {
        sectionsByCourse.set(section.course_code, []);
      }
      sectionsByCourse.get(section.course_code)?.push(section);
    });

    // First, process all core courses
    for (const [courseCode, sections] of sectionsByCourse) {
      // Skip non-core courses for now
      if (sections[0].requirement_type !== 'CORE') {
        continue;
      }
      
      // Skip if we've reached maximum credits
      // Exception: Always try to add 1-2 credit core courses
      const courseCredits = sections[0].credits;
      if (currentCredits + courseCredits > idealCreditRange.max &&
          !(courseCredits <= 2 && sections[0].requirement_type === 'CORE')) {
        continue;
      }

      // Score all sections based on preferences and existing schedule
      const scoredSections = sections.map(section => {
        const { score, explanations: scoreExplanations } = calculateSectionScore(
          section,
          preferences,
          selectedSections
        );
        return { ...section, score, explanations: scoreExplanations };
      });

      // Sort by score
      scoredSections.sort((a, b) => (b.score || 0) - (a.score || 0));

      // Try to add the highest scoring section that doesn't conflict
      let added = false;
      for (const section of scoredSections) {
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
          selectedSections.push(section);
          currentCredits += section.credits;
          explanations.push(...(section.explanations || []));
          added = true;
          break;
        }
      }

      if (!added) {
        conflicts.push({
          type: 'missing_requirement',
          description: `Could not schedule required course ${courseCode} due to conflicts`,
          severity: 'high',
          affected_courses: [courseCode],
          resolution_options: [
            'Consider alternative sections in a different term',
            'Review prerequisites and course sequencing',
            'Consult with academic advisor for course substitution options'
          ]
        });
      }
    }

    // Now, process Gen Ed courses - try to include one from each category
    // Group Gen Ed courses by category
    const genEdByCategory = new Map<string, SectionDetail[]>();
    for (const [courseCode, sections] of sectionsByCourse) {
      if (sections[0].requirement_type === 'GEN_ED') {
        const category = sections[0].requirement_category || '';
        if (!genEdByCategory.has(category)) {
          genEdByCategory.set(category, []);
        }
        genEdByCategory.get(category)?.push(...sections);
      }
    }

    console.log(`Found ${genEdByCategory.size} Gen Ed categories with available sections`);
    // Log each category and the number of sections
    for (const [category, sections] of genEdByCategory) {
      console.log(`Category: ${category}, Sections: ${sections.length}`);
      // Log the first section's course code as an example
      if (sections.length > 0) {
        console.log(`Example course: ${sections[0].course_code}`);
      }
    }

    // Get the list of remaining Gen Ed categories that need to be fulfilled
    // This should come from the recommendations data
    const remainingGenEdCategories = new Set<string>();
    recommendations.categories
      .filter(cat => cat.type === 'GEN_ED')
      .forEach(category => {
        remainingGenEdCategories.add(category.name);
      });

    console.log(`Remaining Gen Ed categories to fulfill: ${Array.from(remainingGenEdCategories).join(', ')}`);

    // Process each Gen Ed category, prioritizing those that need to be fulfilled
    for (const [category, sections] of genEdByCategory) {
      // Skip if we've reached maximum credits
      if (currentCredits + 3 > idealCreditRange.max) { // Assuming most Gen Ed courses are 3 credits
        console.log(`Skipping Gen Ed category ${category} due to credit limit`);
        continue;
      }

      // Skip if we already have a course from this category
      if (includedGenEdCategories.has(category)) {
        console.log(`Skipping Gen Ed category ${category} because we already have a course from this category`);
        continue;
      }

      // Check if this category is in our remaining categories to fulfill
      // If not, we'll still consider it but with lower priority
      const isRequiredCategory = remainingGenEdCategories.has(category);
      if (!isRequiredCategory) {
        console.log(`Category ${category} is not in the remaining required categories, but will still consider it`);
      }

      // Score all sections in this category
      const scoredSections = sections.map(section => {
        const { score, explanations: scoreExplanations } = calculateSectionScore(
          section,
          preferences,
          selectedSections
        );
        // Add bonus points for required categories
        const categoryBonus = isRequiredCategory ? 30 : 0;
        return { 
          ...section, 
          score: (score || 0) + categoryBonus, 
          explanations: scoreExplanations 
        };
      });

      // Sort by score
      scoredSections.sort((a, b) => (b.score || 0) - (a.score || 0));

      // Try to add the highest scoring section that doesn't conflict
      let added = false;
      for (const section of scoredSections) {
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
          selectedSections.push(section);
          currentCredits += section.credits;
          explanations.push(...(section.explanations || []));
          includedGenEdCategories.add(category);
          console.log(`Added Gen Ed course ${section.course_code} from category ${category}`);
          
          // If this is a required category, mark it as fulfilled
          if (isRequiredCategory) {
            remainingGenEdCategories.delete(category);
            console.log(`Fulfilled required Gen Ed category: ${category}`);
          }
          
          added = true;
          break;
        }
      }

      if (!added) {
        console.log(`Could not add any courses from Gen Ed category ${category} due to conflicts`);
      }
    }

    // Log how many required categories are still unfulfilled
    if (remainingGenEdCategories.size > 0) {
      console.log(`Still need to fulfill ${remainingGenEdCategories.size} Gen Ed categories: ${Array.from(remainingGenEdCategories).join(', ')}`);
    }

    // Finally, process any remaining courses (electives, etc.)
    for (const [courseCode, sections] of sectionsByCourse) {
      // Skip core and Gen Ed courses as we've already processed them
      if (sections[0].requirement_type === 'CORE' || sections[0].requirement_type === 'GEN_ED') {
        continue;
      }
      
      // Skip if we've reached maximum credits
      const courseCredits = sections[0].credits;
      if (currentCredits + courseCredits > idealCreditRange.max) {
        continue;
      }

      // Score all sections based on preferences and existing schedule
      const scoredSections = sections.map(section => {
        const { score, explanations: scoreExplanations } = calculateSectionScore(
          section,
          preferences,
          selectedSections
        );
        return { ...section, score, explanations: scoreExplanations };
      });

      // Sort by score
      scoredSections.sort((a, b) => (b.score || 0) - (a.score || 0));

      // Try to add the highest scoring section that doesn't conflict
      let added = false;
      for (const section of scoredSections) {
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
          selectedSections.push(section);
          currentCredits += section.credits;
          explanations.push(...(section.explanations || []));
          added = true;
          break;
        }
      }
    }

    // Step 5: Calculate schedule statistics
    const scheduleStats = {
      early_morning_classes: 0,
      back_to_back_classes: 0,
      preferred_day_pattern_classes: 0,
      time_blocks: [] as TimeBlock[]
    };

    // Count early morning classes
    scheduleStats.early_morning_classes = selectedSections.filter(section => {
      const startHour = parseInt(section.start_time.split(':')[0]);
      return startHour < 10;
    }).length;

    // Build time blocks and count other stats
    const dayMap: Record<string, TimeBlock[]> = {};
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].forEach(day => {
      dayMap[day] = [];
    });

    selectedSections.forEach(section => {
      const days = expandDayPattern(section.day_pattern);
      days.forEach(day => {
        dayMap[day].push({
          day,
          start_time: section.start_time,
          end_time: section.end_time,
          is_class: true,
          course_code: section.course_code
        });
      });
    });

    Object.keys(dayMap).forEach(day => {
      dayMap[day].sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
      
      // Count back-to-back classes
      for (let i = 0; i < dayMap[day].length - 1; i++) {
        const currentClass = dayMap[day][i];
        const nextClass = dayMap[day][i + 1];
        
        const currentEndMin = timeToMinutes(currentClass.end_time);
        const nextStartMin = timeToMinutes(nextClass.start_time);
        
        if (nextStartMin - currentEndMin <= 15) {
          scheduleStats.back_to_back_classes++;
        }
      }
      
      scheduleStats.time_blocks.push(...dayMap[day]);
    });

    // Count preferred day pattern classes
    const preferredPattern = preferences.find(p => p.type === 'day_pattern')?.value;
    if (preferredPattern) {
      scheduleStats.preferred_day_pattern_classes = selectedSections.filter(section => 
        section.day_pattern === preferredPattern
      ).length;
    }

    // Create the final schedule
    const schedule: StudentSchedule = {
      schedule_id: crypto.randomUUID(),
      student_id: studentId,
      registration_term: term,
      sections: selectedSections,
      total_credits: currentCredits,
      schedule_conflicts: conflicts.length > 0 ? conflicts : undefined,
      schedule_stats: scheduleStats,
      explanations
    };

    // Final validation: Ensure we don't have duplicate Gen Ed categories
    const genEdCategories = new Map<string, SectionDetail[]>();
    selectedSections.forEach(section => {
      if (section.requirement_type === 'GEN_ED' && section.requirement_category) {
        if (!genEdCategories.has(section.requirement_category)) {
          genEdCategories.set(section.requirement_category, []);
        }
        genEdCategories.get(section.requirement_category)?.push(section);
      }
    });

    // Check for and handle any categories with multiple courses
    let finalSections = [...selectedSections];
    let adjustedCredits = currentCredits;

    for (const [category, sections] of genEdCategories.entries()) {
      if (sections.length > 1) {
        console.log(`Found ${sections.length} courses in Gen Ed category ${category}. Keeping only the highest scored one.`);
        
        // Sort by score and keep only the highest scored one
        sections.sort((a, b) => (b.score || 0) - (a.score || 0));
        const keepSection = sections[0];
        
        // Remove all other sections from this category
        const removeSections = sections.slice(1);
        finalSections = finalSections.filter(section => !removeSections.includes(section));
        
        // Adjust credits
        removeSections.forEach(section => {
          adjustedCredits -= section.credits;
        });
        
        // Add a conflict explaining the removal
        conflicts.push({
          type: 'preference_violation',
          description: `Multiple courses found for Gen Ed category "${category}". Kept ${keepSection.course_code} and removed ${removeSections.map(s => s.course_code).join(', ')}`,
          severity: 'low',
          affected_courses: removeSections.map(s => s.course_code),
          resolution_options: [
            'Only one course per Gen Ed category is recommended',
            'Consider taking the removed courses in a future term'
          ]
        });
      }
    }

    // Update the schedule with the final sections and adjusted credits
    schedule.sections = finalSections;
    schedule.total_credits = adjustedCredits;
    schedule.schedule_conflicts = conflicts.length > 0 ? conflicts : undefined;

    // Save the schedule
    await supabase
      .from('student_schedules')
      .insert({
        schedule_id: schedule.schedule_id,
        student_id: studentId,
        registration_term: term,
        sections: finalSections,
        total_credits: adjustedCredits,
        conflicts: conflicts.length > 0 ? conflicts : null,
        stats: scheduleStats,
        explanations
      });

    return schedule;
  } catch (error) {
    console.error('Error building optimized schedule:', error);
    throw error;
  }
} 