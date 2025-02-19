import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface Course {
    course_code: string;
    course_title: string;
    grade: string;
    credits: number;
    term_name: string;
}

interface TranscriptTerm {
    term_name: string;
    term_gpa: number;
    courses: Course[];
}

// New interfaces for structured degree progress
interface DegreeRequirement {
    title: string;
    credits: number;
    status: 'completed' | 'pending' | 'in_progress';
    grade?: string;
    term_completed?: string;
    satisfies?: string[];
    note?: string;
}

interface GeneralEducationCategory {
    credits_required: number;
    status: 'completed' | 'pending' | 'in_progress';
    course_taken?: string;
    grade?: string;
    term_completed?: string;
    approved_courses?: Array<{
        code: string;
        title: string;
        credits: number;
    }>;
}

interface YearProgress {
    credits_required: number;
    credits_completed: number;
    requirements: {
        [key: string]: DegreeRequirement;
    };
    general_education?: {
        [key: string]: GeneralEducationCategory;
    };
}

interface DegreeProgress {
    first_year: YearProgress;
    sophomore_year: YearProgress;
    junior_year: YearProgress;
    senior_year: YearProgress;
}

// Add this helper function before buildDegreeProgress
function checkRequirementCompletion(
    requirement: string,
    courses: Course[]
): { completed: boolean; grade?: string; term?: string } {
    const course = courses.find(c => c.course_code.startsWith(requirement));
    if (course) {
        return {
            completed: true,
            grade: course.grade,
            term: course.term_name
        };
    }
    return { completed: false };
}

// Add these interfaces before FINANCE_PROGRAM_REQUIREMENTS

interface CourseRequirement {
    title: string;
    credits: number;
    alternative?: string;
    satisfies?: string[];
}

interface GeneralEducationRequirement {
    title: string;
    credits: number;
    requirement_type: string;
}

interface YearRequirements {
    required_courses: {
        [key: string]: CourseRequirement;
    };
    general_education?: {
        [key: string]: GeneralEducationRequirement;
    };
    electives?: {
        [key: string]: {
            credits_required: number;
            requirement_type: string;
        };
    };
}

interface ProgramRequirements {
    first_year: {
        required_courses: {
            [key: string]: CourseRequirement;
        };
    };
    sophomore_year: YearRequirements;
    junior_year: YearRequirements;
    senior_year: YearRequirements;
    finance_electives_options: Array<{
        code: string;
        title: string;
        credits: number;
    }>;
}

// Update the constant declaration
const FINANCE_PROGRAM_REQUIREMENTS: ProgramRequirements = {
    first_year: {
        required_courses: {
            'ACC175': { title: 'Financial Accounting', credits: 3 },
            'BUS110': { title: 'Business Computers I', credits: 3, alternative: 'elective' },
            'BUS120': { title: 'Business Fundamentals I', credits: 3 },
            'BUS121': { title: 'Business Fundamentals II', credits: 3 },
            'BUS122': { title: 'Business Problem Solving', credits: 3, alternative: 'elective' },
            'ECN201': { 
                title: 'Macroeconomics', 
                credits: 3,
                satisfies: ['Global Issues General Education Requirement']
            },
            'ECN202': { title: 'Microeconomics', credits: 3 },
            'ENG111': { 
                title: 'Critical Reading and Writing I', 
                credits: 3,
                satisfies: ['Writing Designated Core Requirement']
            },
            'ENG112': { 
                title: 'Critical Reading and Writing II', 
                credits: 3,
                satisfies: ['Writing Designated Core Requirement']
            },
            'INT100': { title: 'Internship I', credits: 2 },
            'MTH126': { 
                title: 'Applied Statistics', 
                credits: 3,
                satisfies: ['Quantitative Reasoning General Education Requirement']
            }
        }
    },
    sophomore_year: {
        required_courses: {
            'ACC185': { title: 'Managerial Accounting', credits: 3 },
            'BUS200': { title: 'Marketing', credits: 3 },
            'BUS210': { title: 'Finance', credits: 3 },
            'BUS249': { title: 'Introduction to Business Analytics', credits: 3 },
            'BUS270': { title: 'Communicating in Business', credits: 3 },
            'BUS311': { title: 'Corporate Finance', credits: 3 },
            'INT200': { title: 'Internship II', credits: 2 }
        },
        general_education: {
            'aesthetic_awareness': {
                title: 'Aesthetic Awareness and Creative Expression',
                credits: 3,
                requirement_type: 'general_education'
            },
            'individual_society': {
                title: 'Individual and Society',
                credits: 3,
                requirement_type: 'general_education'
            },
            'literary_perspectives': {
                title: 'Literary Perspectives',
                credits: 3,
                requirement_type: 'general_education'
            },
            'science_technology': {
                title: 'Science and Technology',
                credits: 3,
                requirement_type: 'general_education'
            }
        }
    },
    junior_year: {
        required_courses: {
            'BUS320': { title: 'Organizational Behavior', credits: 3 },
            'BUS340': { title: 'International Finance', credits: 3 },
            'BUS370': { 
                title: 'Business Analysis and Research', 
                credits: 3,
                satisfies: ['Writing Designated Requirement']
            },
            'BUS375': { title: 'Financial Modeling', credits: 3 },
            'BUS379': { title: 'Semester Internship Strategies', credits: 1 }
        },
        general_education: {
            'values_ethical': {
                title: 'Values and Ethical Reasoning',
                credits: 3,
                requirement_type: 'general_education'
            },
            'world_cultures': {
                title: 'World Cultures',
                credits: 3,
                requirement_type: 'general_education'
            }
        },
        electives: {
            finance_electives: {
                credits_required: 9,
                requirement_type: 'finance_elective'
            },
            general_education: {
                credits_required: 3,
                requirement_type: 'general_education'
            }
        }
    },
    senior_year: {
        required_courses: {
            'BUS331': { title: 'Investments', credits: 3 },
            'BUS480': { title: 'Semester Internship', credits: 12 },
            'BUS489': { title: 'Senior Research', credits: 3 },
            'BUS490': { 
                title: 'Senior Thesis', 
                credits: 3,
                alternative: 'BUS491'
            },
            'BUS491': { 
                title: 'Senior Capstone', 
                credits: 3,
                alternative: 'BUS490'
            }
        },
        electives: {
            finance_electives: {
                credits_required: 3,
                requirement_type: 'finance_elective'
            },
            general_education: {
                credits_required: 6,
                requirement_type: 'general_education'
            }
        }
    },
    finance_electives_options: [
        { code: 'ACC300', title: 'Accounting Information Systems', credits: 3 },
        { code: 'ACC325', title: 'Tax Accounting', credits: 3 },
        { code: 'ACC425', title: 'Corporate Tax Accounting', credits: 3 },
        { code: 'BUS224', title: 'Principles of Buying', credits: 3 },
        { code: 'BUS302', title: 'Legal Environment for Business Including the UCC', credits: 3 },
        { code: 'BUS303', title: 'International Business', credits: 3 },
        { code: 'BUS309', title: 'Project Management', credits: 3 },
        { code: 'BUS319', title: 'Financial Planning for Clients', credits: 3 },
        { code: 'BUS332', title: 'Applied Modeling for Decision-Making', credits: 3 },
        { code: 'BUS336', title: 'Options and Futures Trading', credits: 3 },
        { code: 'BUS337', title: 'Valuation', credits: 3 },
        { code: 'BUS354', title: 'Entrepreneurial Finance', credits: 3 },
        { code: 'BUS355', title: 'Risk Management', credits: 3 },
        { code: 'BUS369', title: 'Financial Institutions and Markets', credits: 3 },
        { code: 'BUS415', title: 'Business Negotiation', credits: 3 },
        { code: 'BUS440', title: 'Topics in Real Estate Seminar', credits: 3 },
        { code: 'CSC160', title: 'Introduction to Programming and Lab', credits: 4 },
        { code: 'CSC260', title: 'Visual Programming I', credits: 3 },
        { code: 'CSC261', title: 'Visual Programming II and Object-Oriented Design', credits: 3 },
        { code: 'ECN302', title: 'Intermediate Microeconomics', credits: 3 },
        { code: 'MTH137', title: 'Calculus II', credits: 4 },
        { code: 'MTH225', title: 'Probability', credits: 3 }
    ]
};

// Modify buildDegreeProgress to use this structure
async function buildDegreeProgress(courses: Course[]): Promise<DegreeProgress> {
    const progress: DegreeProgress = {
        first_year: {
            credits_required: 32,
            credits_completed: 0,
            requirements: {}
        },
        sophomore_year: {
            credits_required: 32,
            credits_completed: 0,
            requirements: {}
        },
        junior_year: {
            credits_required: 31,
            credits_completed: 0,
            requirements: {}
        },
        senior_year: {
            credits_required: 30,
            credits_completed: 0,
            requirements: {}
        }
    };

    // Process first year requirements
    Object.entries(FINANCE_PROGRAM_REQUIREMENTS.first_year.required_courses).forEach(([code, info]) => {
        const completion = checkRequirementCompletion(code, courses);
        progress.first_year.requirements[code] = {
            title: info.title,
            credits: info.credits,
            status: completion.completed ? 'completed' : 'pending',
            ...(completion.completed && {
                grade: completion.grade,
                term_completed: completion.term
            }),
            ...(info.satisfies && { satisfies: info.satisfies })
        };
        if (completion.completed) {
            progress.first_year.credits_completed += info.credits;
        }
    });

    // Process sophomore year requirements
    progress.sophomore_year.general_education = {};
    Object.entries(FINANCE_PROGRAM_REQUIREMENTS.sophomore_year.required_courses).forEach(([code, info]) => {
        const completion = checkRequirementCompletion(code, courses);
        progress.sophomore_year.requirements[code] = {
            title: info.title,
            credits: info.credits,
            status: completion.completed ? 'completed' : 'pending',
            ...(completion.completed && {
                grade: completion.grade,
                term_completed: completion.term
            })
        };
        if (completion.completed) {
            progress.sophomore_year.credits_completed += info.credits;
        }
    });

    // Add GE requirements for sophomore year
    if (FINANCE_PROGRAM_REQUIREMENTS.sophomore_year.general_education) {
        Object.entries(FINANCE_PROGRAM_REQUIREMENTS.sophomore_year.general_education).forEach(([key, info]) => {
            progress.sophomore_year.general_education![key] = {
                credits_required: info.credits,
                status: 'pending' // You'll need to implement logic to check GE completion
            };
        });
    }

    // Process junior year requirements
    progress.junior_year.general_education = {};
    Object.entries(FINANCE_PROGRAM_REQUIREMENTS.junior_year.required_courses).forEach(([code, info]) => {
        const completion = checkRequirementCompletion(code, courses);
        progress.junior_year.requirements[code] = {
            title: info.title,
            credits: info.credits,
            status: completion.completed ? 'completed' : 'pending',
            ...(completion.completed && {
                grade: completion.grade,
                term_completed: completion.term
            }),
            ...(info.satisfies && { satisfies: info.satisfies })
        };
        if (completion.completed) {
            progress.junior_year.credits_completed += info.credits;
        }
    });

    // Add GE and elective requirements for junior year
    if (FINANCE_PROGRAM_REQUIREMENTS.junior_year.general_education) {
        Object.entries(FINANCE_PROGRAM_REQUIREMENTS.junior_year.general_education).forEach(([key, info]) => {
            progress.junior_year.general_education![key] = {
                credits_required: info.credits,
                status: 'pending',
                approved_courses: [] // Will be populated from academic_chunks table
            };
        });
    }

    // Process finance electives for junior year
    const completedFinanceElectives = courses.filter(course => 
        FINANCE_PROGRAM_REQUIREMENTS.finance_electives_options.some(option => 
            course.course_code.startsWith(option.code)
        )
    );

    const juniorFinanceElectivesRequired = FINANCE_PROGRAM_REQUIREMENTS.junior_year.electives?.finance_electives.credits_required || 0;
    const completedFinanceElectiveCredits = completedFinanceElectives.reduce((sum) => sum + 3, 0); // Assuming 3 credits per finance elective

    // Process senior year requirements
    progress.senior_year.general_education = {};
    Object.entries(FINANCE_PROGRAM_REQUIREMENTS.senior_year.required_courses).forEach(([code, info]) => {
        const completion = checkRequirementCompletion(code, courses);
        progress.senior_year.requirements[code] = {
            title: info.title,
            credits: info.credits,
            status: completion.completed ? 'completed' : 'pending',
            ...(completion.completed && {
                grade: completion.grade,
                term_completed: completion.term
            }),
            ...(info.alternative && { alternative: info.alternative })
        };
        if (completion.completed) {
            progress.senior_year.credits_completed += info.credits;
        }
    });

    // Add remaining finance electives to senior year requirements
    const remainingFinanceElectiveCredits = Math.max(0, 
        (juniorFinanceElectivesRequired + 
        (FINANCE_PROGRAM_REQUIREMENTS.senior_year.electives?.finance_electives.credits_required || 0)) - 
        completedFinanceElectiveCredits
    );

    // Add a summary of remaining requirements
    const remainingRequirements = {
        total_credits_remaining: 125 - (
            progress.first_year.credits_completed +
            progress.sophomore_year.credits_completed +
            progress.junior_year.credits_completed +
            progress.senior_year.credits_completed
        ),
        finance_electives_remaining: remainingFinanceElectiveCredits,
        available_finance_electives: FINANCE_PROGRAM_REQUIREMENTS.finance_electives_options
            .filter(option => !completedFinanceElectives.some(course => 
                course.course_code.startsWith(option.code)
            ))
    };

    return {
        ...progress,
        remaining_requirements: remainingRequirements
    } as DegreeProgress;
}

export async function buildStudentContext(studentName: string): Promise<string> {
    try {
        console.log(`Building context for student: ${studentName}`);
        
        // Get the most recent transcript
        console.log('Fetching most recent transcript...');
        const { data: transcriptData, error: transcriptError } = await supabase
            .from('student_transcripts')
            .select('transcript_id, student_name, program, cumulative_gpa, earned_credits_cumulative, attempted_credits_cumulative, created_at')
            .eq('student_name', studentName)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (transcriptError) throw transcriptError;
        console.log('Retrieved transcript data:', JSON.stringify(transcriptData, null, 2));

        // Get all terms
        console.log('Fetching transcript terms...');
        const { data: termsData, error: termsError } = await supabase
            .from('transcript_terms')
            .select('term_name, term_gpa, term_order, courses')
            .eq('transcript_id', transcriptData.transcript_id)
            .order('term_order', { ascending: true });

        if (termsError) throw termsError;
        console.log('Retrieved terms data:', JSON.stringify(termsData, null, 2));

        // Get student profile
        console.log('Fetching student profile...');
        const { data: profileData } = await supabase
            .from('student_profiles')
            .select('goals, interests')
            .eq('student_id', transcriptData.transcript_id)
            .single();

        if (profileData) {
            console.log('Retrieved profile data:', JSON.stringify(profileData, null, 2));
        } else {
            console.log('No profile data found');
        }

        // Type assertion to ensure termsData is TranscriptTerm[]
        const typedTermsData = termsData as unknown as TranscriptTerm[];

        // Build the structured context
        const structuredContext = {
            student_profile: {
                name: transcriptData.student_name,
                program: transcriptData.program,
                academic_standing: getAcademicStanding(transcriptData.earned_credits_cumulative),
                cumulative_GPA: transcriptData.cumulative_gpa,
                total_credits_earned: transcriptData.earned_credits_cumulative,
                total_credits_required: 125,
                career_goals: profileData?.goals,
                academic_interests: profileData?.interests
            },
            degree_progress: await buildDegreeProgress(
                typedTermsData.flatMap(term => term.courses)
            )
        };

        // Convert to string format for the LLM
        return JSON.stringify(structuredContext, null, 2);
    } catch (error) {
        console.error('Error building student context:', error);
        throw error;
    }
}

function getAcademicStanding(earnedCredits: number): string {
    if (earnedCredits < 30) return 'Freshman';
    if (earnedCredits < 60) return 'Sophomore';
    if (earnedCredits < 90) return 'Junior';
    return 'Senior';
} 