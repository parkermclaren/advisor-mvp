export type AcademicStanding = 'Freshman' | 'Sophomore' | 'Junior' | 'Senior';

export interface CompletedCourse {
  id: string;
  title?: string;
  term: string;
  grade: string;
  level?: number;
}

export interface AvailableCourse {
  id: string;
  title: string;
  credits: number;
}

export interface StudentStatus {
  status: 'not_started' | 'in_progress' | 'completed';
  credits_completed?: number;
  grade?: string;
  courses_completed?: CompletedCourse[];
  available_courses?: AvailableCourse[];
  course?: CompletedCourse;  // For gen ed requirements that are completed with a single course
  needs_200_level?: boolean; // For writing designated requirements
  additional_credits_needed?: number;
}

export interface Requirement {
  id: string;
  title: string;
  type: 'finance_core' | 'gen_ed' | 'finance_elective';
  credits_required: number;
  category?: string;
  year_level?: number;
  student_status: StudentStatus;
  available_courses?: AvailableCourse[];
}

export interface StudentSummary {
  id: string;
  name: string;
  major: string;
  career_goals: string[];
  academic_interests: string[];
  completed_credits: number;
  gpa: number;
  remaining_credits: number;
  academic_standing: AcademicStanding;
}

export interface Term {
  term: string;
  next_registration_term: string;
}

export interface IncompleteRequirements {
  financeCoreRemaining: string[];
  financeElectivesNeeded: number;
  genEdCategoriesMissing: string[];
}

export interface RecommendationContext {
  core_credits: number;
  remaining_credits: number;
  incomplete_requirements: IncompleteRequirements;
}

export interface ProgressData {
  student_summary: StudentSummary;
  current_term: Term;
  requirements: Requirement[];
} 