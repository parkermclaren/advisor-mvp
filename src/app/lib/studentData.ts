import { AcademicStanding, ProgressData } from './types';

const rawProgress = {
  "program_name": "Finance Major (B.S.)",
  "total_credits_required": 125,
  "current_term": {
    "term": "2024 Fall Term",
    "year": 2024,
    "next_registration_term": "2025 Spring Term"
  },
  "requirements": [
    // First Year Core Requirements
    {
      "id": "ACC175",
      "title": "Financial Accounting",
      "credits": 3,
      "year_level": 1,
      "student_status": {
        "status": "completed",
        "term": "2023 Spring Term",
        "grade": "A"
      }
    },
    {
      "id": "BUS110",
      "title": "Business Computers I",
      "credits": 3,
      "year_level": 1,
      "alternatives": ["Elective"],
      "student_status": {
        "status": "completed",
        "term": "2022 Fall Term",
        "grade": "B+"
      }
    },
    {
      "id": "BUS120",
      "title": "Business Fundamentals I",
      "credits": 3,
      "year_level": 1,
      "student_status": {
        "status": "completed",
        "term": "2022 Fall Term",
        "grade": "B+"
      }
    },
    {
      "id": "BUS121",
      "title": "Business Fundamentals II",
      "credits": 3,
      "year_level": 1,
      "student_status": {
        "status": "completed",
        "term": "2023 Spring Term",
        "grade": "A"
      }
    },
    {
      "id": "BUS122",
      "title": "Business Problem Solving",
      "credits": 3,
      "year_level": 1,
      "alternatives": ["Elective"],
      "student_status": {
        "status": "completed",
        "term": "2022 Fall Term",
        "grade": "A-"
      }
    },
    {
      "id": "ECN201",
      "title": "Macroeconomics",
      "credits": 3,
      "year_level": 1,
      "satisfies": ["Global Issues"],
      "student_status": {
        "status": "completed",
        "term": "2022 Fall Term",
        "grade": "B"
      }
    },
    {
      "id": "ECN202",
      "title": "Microeconomics",
      "credits": 3,
      "year_level": 1,
      "student_status": {
        "status": "completed",
        "term": "2023 Spring Term",
        "grade": "A"
      }
    },
    {
      "id": "ENG111",
      "title": "Critical Reading & Writing I",
      "credits": 3,
      "year_level": 1,
      "satisfies": ["Writing Designated"],
      "student_status": {
        "status": "completed",
        "term": "2022 Fall Term",
        "grade": "B+"
      }
    },
    {
      "id": "ENG112",
      "title": "Critical Reading & Writing II",
      "credits": 3,
      "year_level": 1,
      "satisfies": ["Writing Designated"],
      "student_status": {
        "status": "completed",
        "term": "2023 Spring Term",
        "grade": "B-"
      }
    },
    {
      "id": "INT100",
      "title": "Internship I",
      "credits": 2,
      "year_level": 1,
      "student_status": {
        "status": "completed",
        "term": "2023 Summer Term",
        "grade": "B+"
      }
    },
    {
      "id": "MTH126",
      "title": "Applied Statistics",
      "credits": 3,
      "year_level": 1,
      "satisfies": ["Quantitative Reasoning"],
      "student_status": {
        "status": "completed",
        "term": "2023 Spring Term",
        "grade": "B"
      }
    },
    
    // Sophomore Year Core Requirements
    {
      "id": "ACC185",
      "title": "Managerial Accounting",
      "credits": 3,
      "year_level": 2,
      "student_status": {
        "status": "completed",
        "term": "2023 Fall Term",
        "grade": "B"
      }
    },
    {
      "id": "BUS200",
      "title": "Marketing",
      "credits": 3,
      "year_level": 2,
      "student_status": {
        "status": "completed",
        "term": "2024 Spring Term",
        "grade": "A-"
      }
    },
    {
      "id": "BUS210",
      "title": "Finance",
      "credits": 3,
      "year_level": 2,
      "student_status": {
        "status": "completed",
        "term": "2023 Fall Term",
        "grade": "C+"
      }
    },
    {
      "id": "BUS249",
      "title": "Introduction to Business Analytics",
      "credits": 3,
      "year_level": 2,
      "student_status": {
        "status": "completed",
        "term": "2023 Fall Term",
        "grade": "A"
      }
    },
    {
      "id": "BUS270",
      "title": "Communicating in Business",
      "credits": 3,
      "year_level": 2,
      "student_status": {
        "status": "completed",
        "term": "2024 Spring Term",
        "grade": "B"
      }
    },
    {
      "id": "BUS311",
      "title": "Corporate Finance",
      "credits": 3,
      "year_level": 2,
      "student_status": {
        "status": "not_started"
      }
    },
    {
      "id": "INT200",
      "title": "Internship II",
      "credits": 2,
      "year_level": 2,
      "student_status": {
        "status": "completed",
        "term": "2024 Summer Term",
        "grade": "A"
      }
    },

    // Junior Year Core Requirements
    {
      "id": "BUS320",
      "title": "Organizational Behavior",
      "credits": 3,
      "year_level": 3,
      "student_status": {
        "status": "not_started"
      }
    },
    {
      "id": "BUS340",
      "title": "International Finance",
      "credits": 3,
      "year_level": 3,
      "student_status": {
        "status": "completed",
        "term": "2024 Fall Term",
        "grade": "B+"
      }
    },
    {
      "id": "BUS370",
      "title": "Business Analysis and Research",
      "credits": 3,
      "year_level": 3,
      "satisfies": ["Writing Designated"],
      "student_status": {
        "status": "not_started"
      }
    },
    {
      "id": "BUS375",
      "title": "Financial Modeling",
      "credits": 3,
      "year_level": 3,
      "student_status": {
        "status": "completed",
        "term": "2024 Fall Term",
        "grade": "B"
      }
    },
    {
      "id": "BUS379",
      "title": "Semester Internship Strategies",
      "credits": 1,
      "year_level": 3,
      "student_status": {
        "status": "not_started"
      }
    },

    // Senior Year Core Requirements
    {
      "id": "BUS331",
      "title": "Investments",
      "credits": 3,
      "year_level": 4,
      "student_status": {
        "status": "completed",
        "term": "2024 Spring Term",
        "grade": "D+"
      }
    },
    {
      "id": "BUS480",
      "title": "Semester Internship",
      "credits": 12,
      "year_level": 4,
      "student_status": {
        "status": "not_started"
      }
    },
    {
      "id": "BUS489",
      "title": "Senior Research",
      "credits": 3,
      "year_level": 4,
      "student_status": {
        "status": "not_started"
      }
    },
    {
      "id": "BUS490",
      "title": "Senior Thesis",
      "credits": 3,
      "year_level": 4,
      "alternatives": ["BUS491"],
      "student_status": {
        "status": "not_started"
      }
    },

    // Finance Electives Requirement
    {
      "id": "FINANCE_ELECTIVES",
      "title": "Finance Electives",
      "credits_required": 12,
      "available_courses": [
        { "id": "ACC300", "title": "Accounting Information Systems", "credits": 3 },
        { "id": "ACC325", "title": "Tax Accounting", "credits": 3 },
        { "id": "ACC425", "title": "Corporate Tax Accounting", "credits": 3 },
        { "id": "BUS224", "title": "Principles of Buying", "credits": 3 },
        { "id": "BUS302", "title": "Legal Environment for Business Including the UCC", "credits": 3 },
        { "id": "BUS303", "title": "International Business", "credits": 3 },
        { "id": "BUS309", "title": "Project Management", "credits": 3 },
        { "id": "BUS319", "title": "Financial Planning for Clients", "credits": 3 },
        { "id": "BUS332", "title": "Applied Modeling for Decision-Making", "credits": 3 },
        { "id": "BUS336", "title": "Options and Futures Trading", "credits": 3 },
        { "id": "BUS337", "title": "Valuation", "credits": 3 },
        { "id": "BUS354", "title": "Entrepreneurial Finance", "credits": 3 },
        { "id": "BUS355", "title": "Risk Management", "credits": 3 },
        { "id": "BUS369", "title": "Financial Institutions and Markets", "credits": 3 },
        { "id": "BUS415", "title": "Business Negotiation", "credits": 3 },
        { "id": "BUS440", "title": "Topics in Real Estate Seminar", "credits": 3 },
        { "id": "CSC160", "title": "Introduction to Programming and Lab", "credits": 4 },
        { "id": "CSC260", "title": "Visual Programming I", "credits": 3 },
        { "id": "CSC261", "title": "Visual Programming II and Object-Oriented Design", "credits": 3 },
        { "id": "ECN302", "title": "Intermediate Microeconomics", "credits": 3 },
        { "id": "MTH137", "title": "Calculus II", "credits": 4 },
        { "id": "MTH225", "title": "Probability", "credits": 3 }
      ],
      "student_status": {
        "credits_completed": 6,
        "courses_completed": [
          {
            "id": "BUS415",
            "term": "2024 Fall Term",
            "grade": "B+"
          },
          {
            "id": "ECN302",
            "term": "2023 Fall Term",
            "grade": "A-"
          }
        ],
        "status": "in_progress"
      }
    },

    // Writing Designated Requirements
    {
      "id": "WRITING_DESIGNATED",
      "title": "Writing Designated Courses",
      "credits_required": 12,
      "notes": "Must complete ENG111, ENG112, plus 6 additional credits with one course at 200-level or higher",
      "student_status": {
        "credits_completed": 6,
        "courses_completed": [
          {
            "id": "ENG111",
            "title": "Critical Reading & Writing I",
            "term": "2022 Fall Term",
            "grade": "B+",
            "level": 100
          },
          {
            "id": "ENG112",
            "title": "Critical Reading & Writing II",
            "term": "2023 Spring Term",
            "grade": "B-",
            "level": 100
          }
        ],
        "additional_credits_needed": 6,
        "needs_200_level": true,
        "status": "in_progress",
        "available_options": [
          {
            "id": "BUS370",
            "title": "Business Analysis and Research",
            "credits": 3,
            "level": 300,
            "status": "not_started"
          }
        ]
      }
    },

    // General Education Requirements
    {
      "id": "GENED_GLOBAL_ISSUES",
      "title": "Global Issues",
      "credits_required": 3,
      "student_status": {
        "status": "completed",
        "course": {
          "id": "ECN201",
          "title": "Macroeconomics",
          "term": "2022 Fall Term",
          "grade": "B"
        }
      }
    },
    {
      "id": "GENED_AESTHETIC_AWARENESS",
      "title": "Aesthetic Awareness and Creative Expression",
      "credits_required": 3,
      "notes": "Can be completed with one 3-credit course or three 1-credit courses",
      "student_status": {
        "status": "completed",
        "course": {
          "id": "MUS110",
          "title": "Fundamentals of Music",
          "term": "2023 Fall Term",
          "grade": "A"
        }
      }
    },
    {
      "id": "GENED_INDIVIDUAL_SOCIETY",
      "title": "Individual and Society",
      "credits_required": 3,
      "student_status": {
        "status": "not_started"
      }
    },
    {
      "id": "GENED_LITERARY_PERSPECTIVES",
      "title": "Literary Perspectives",
      "credits_required": 3,
      "student_status": {
        "status": "completed",
        "course": {
          "id": "ENG367",
          "title": "Eastern Literature & Haiku",
          "term": "2024 Fall Term",
          "grade": "A"
        }
      }
    },
    {
      "id": "GENED_SCIENCE_TECHNOLOGY",
      "title": "Science and Technology",
      "credits_required": 3,
      "student_status": {
        "status": "completed",
        "course": {
          "id": "EGR100",
          "title": "Intro to Engineering",
          "term": "2024 Fall Term",
          "grade": "A-"
        }
      }
    },
    {
      "id": "GENED_VALUES_ETHICAL",
      "title": "Values and Ethical Reasoning",
      "credits_required": 3,
      "student_status": {
        "status": "not_started"
      }
    },
    {
      "id": "GENED_WORLD_CULTURES",
      "title": "World Cultures",
      "credits_required": 3,
      "student_status": {
        "status": "not_started",
        "notes": "Withdrew from HTM329 Cultural History of Food"
      }
    },
    {
      "id": "GENED_QUANTITATIVE_REASONING",
      "title": "Quantitative Reasoning",
      "credits_required": 3,
      "student_status": {
        "status": "completed",
        "course": {
          "id": "MTH126",
          "title": "Applied Statistics",
          "term": "2023 Spring Term",
          "grade": "B"
        }
      }
    },
    {
      "id": "GENED_ELECTIVES",
      "title": "General Education Electives",
      "credits_required": 12,
      "notes": "Must complete 4 courses (12 credits) outside major/concentration. At least 2 courses must be above 100-level. Can be from thematic categories or other areas. Can fulfill minor requirements.",
      "student_status": {
        "credits_completed": 9,
        "courses_completed": [
          {
            "id": "SM100",
            "title": "Introduction to Sport Management",
            "term": "2020 Fall Term",
            "grade": "B+",
            "level": 100
          },
          {
            "id": "CJ151",
            "title": "Criminal Law",
            "term": "2021 Spring Term",
            "grade": "C-",
            "level": 100
          },
          {
            "id": "BUS214",
            "title": "Artificial Intelligence and Business",
            "term": "2024 Spring Term",
            "grade": "A",
            "level": 200
          }
        ],
        "credits_needed": 3,
        "courses_above_100": 1,
        "additional_above_100_needed": 1,
        "status": "in_progress"
      }
    }
  ],
  "student_summary": {
    "completed_credits": 88,
    "gpa": 3.36,
    "remaining_credits": 37,
    "academic_standing": "Junior",
    "career_goals": "i would like to obtain a role as an analyst at a venture capital fund",
    "academic_interests": [
      "Technology & Computing",
      "Business & Entrepreneurship"
    ]
  }
};

export const maxProgress: ProgressData = {
  student_summary: {
    id: "d290f1ee-6c54-4b01-90e6-d701748f0851",
    name: "Max Grenert",
    major: "Finance",
    career_goals: [rawProgress.student_summary.career_goals],
    academic_interests: rawProgress.student_summary.academic_interests,
    completed_credits: rawProgress.student_summary.completed_credits,
    gpa: rawProgress.student_summary.gpa,
    remaining_credits: rawProgress.student_summary.remaining_credits,
    academic_standing: rawProgress.student_summary.academic_standing as AcademicStanding
  },
  current_term: {
    term: rawProgress.current_term.term,
    next_registration_term: rawProgress.current_term.next_registration_term
  },
  requirements: rawProgress.requirements.map(req => ({
    id: req.id,
    title: req.title,
    type: req.id === 'FINANCE_ELECTIVES' ? 'finance_elective' : 
          req.id.startsWith('BUS') ? 'finance_core' : 'gen_ed',
    credits_required: req.credits_required || req.credits || 0,
    category: req.satisfies?.[0] || undefined,
    year_level: req.year_level,
    student_status: {
      status: req.student_status.status as 'not_started' | 'in_progress' | 'completed',
      credits_completed: req.student_status.credits_completed || (req.student_status.status === 'completed' ? (req.credits || 0) : 0),
      grade: req.student_status.grade,
      courses_completed: req.student_status.courses_completed,
      available_courses: req.available_courses
    }
  }))
}; 