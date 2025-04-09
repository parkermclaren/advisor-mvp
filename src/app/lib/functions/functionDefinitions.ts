/**
 * Function definitions for OpenAI function calling
 * These definitions follow the OpenAI function calling schema format
 */

export const functionDefinitions = [
  {
    type: "function" as const,
    function: {
      name: "getCompletedCourses",
      description: "Get a list of courses that the student has completed. The system will automatically use the current student's ID.",
      parameters: {
        type: "object",
        properties: {
          studentId: {
            type: "string",
            description: "The ID of the student (optional, will use current student if not provided)"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "getRemainingRequirements",
      description: "Get a list of remaining program requirements that the student needs to complete for their degree. The system will automatically use the current student's ID.",
      parameters: {
        type: "object",
        properties: {
          studentId: {
            type: "string",
            description: "The ID of the student (optional, will use current student if not provided)"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "getRecommendedCourses",
      description: "Get recommended courses for the student's next term based on their program requirements and completed courses. The system will automatically use the current student's ID.",
      parameters: {
        type: "object",
        properties: {
          studentId: {
            type: "string",
            description: "The ID of the student (optional, will use current student if not provided)"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "buildStudentSchedule",
      description: "Build a simple conflict-free class schedule for the student based on their program requirements. IMPORTANT: Your response MUST include the raw schedule data wrapped in a JSON code block BEFORE any text description, like this:\n```json\n{\"sections\": [...], \"total_credits\": 16}\n```\nAfter the JSON block, you can then provide a friendly description of the schedule.",
      parameters: {
        type: "object",
        properties: {
          studentId: {
            type: "string",
            description: "The ID of the student (optional, will use current student if not provided)"
          },
          term: {
            type: "string",
            description: "The term to build the schedule for (e.g., 'Spring 2025')"
          }
        },
        required: ["term"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "getCoursesByCategory",
      description: "Get a list of courses that satisfy a specific requirement category, such as 'Finance Electives' or 'Aesthetic Awareness'. Results can be personalized based on student goals and interests.",
      parameters: {
        type: "object",
        properties: {
          categoryName: {
            type: "string",
            description: "The name or type of the category to search for (e.g., 'Finance Electives', 'Aesthetic Awareness')"
          },
          limit: {
            type: "number",
            description: "Optional limit on the number of courses to return (default: 5)"
          },
          personalize: {
            type: "boolean",
            description: "Whether to personalize the results based on student goals and interests (default: true)"
          },
          offset: {
            type: "number",
            description: "Optional offset for pagination to skip courses already shown (default: 0). Use this when the user asks for more courses."
          }
        },
        required: ["categoryName"]
      }
    }
  }
];

// This can be expanded with more functions in the future
// Example of how to add more functions:
/*
  {
    type: "function" as const,
    function: {
      name: "getAvailableCourses",
      description: "Get a list of courses available for the student to take",
      parameters: {
        type: "object",
        properties: {
          studentId: {
            type: "string",
            description: "The ID of the student (optional, will use current student if not provided)"
          },
          term: {
            type: "string",
            description: "The term to get available courses for (e.g., 'Fall 2023')"
          }
        },
        required: []
      }
    }
  }
*/ 