const OpenAI = require('openai');
const config = require('../config');
const { v4: uuidv4 } = require('uuid');

const openai = new OpenAI({
  apiKey: config.openaiApiKey
});

class TranscriptProcessor {
    constructor() {
        this.currentTranscript = null;
    }

    processTranscriptSummary(summaryData) {
        return {
            transcript_id: uuidv4(),
            student_id: uuidv4(), // This should be replaced with actual student ID if available
            student_name: summaryData.studentName,
            program: summaryData.program,
            attempted_credits_transfer: summaryData.attemptedCreditsTransfer,
            attempted_credits_residential: summaryData.attemptedCreditsResidential,
            attempted_credits_cumulative: summaryData.attemptedCreditsCumulative,
            earned_credits_transfer: summaryData.earnedCreditsTransfer,
            earned_credits_residential: summaryData.earnedCreditsResidential,
            earned_credits_cumulative: summaryData.earnedCreditsCumulative,
            cumulative_gpa: summaryData.cumulativeGPA
        };
    }

    processCourse(courseData) {
        return {
            course_code: courseData.courseCode,
            course_title: courseData.courseTitle,
            grade: courseData.grade,
            repeat: courseData.repeat || 'N',
            attempted_credits: courseData.attemptedCredits,
            earned_credits: courseData.earnedCredits,
            quality_points: courseData.qualityPoints
        };
    }

    processTermData(termData) {
        return {
            term_id: uuidv4(),
            term_name: termData.termName,
            term_attempted_credits: termData.termAttemptedCredits,
            term_earned_credits: termData.termEarnedCredits,
            term_gpa: termData.termGPA,
            courses: termData.courses.map(course => this.processCourse(course))
        };
    }

    validateTranscriptData(transcriptSummary, terms) {
        // Basic validation
        if (!transcriptSummary.student_name) {
            throw new Error('Student name is required');
        }

        // Only validate terms if they are provided
        if (terms && terms.length > 0) {
            // Validate each term has required fields
            terms.forEach((term, index) => {
                if (!term.term_name) {
                    throw new Error(`Term name is required for term at index ${index}`);
                }
                if (!Array.isArray(term.courses)) {
                    throw new Error(`Courses must be an array for term ${term.term_name}`);
                }
            });
        }

        return true;
    }

    processFullTranscript(summaryData, termsData) {
        const transcriptSummary = this.processTranscriptSummary(summaryData);
        const processedTerms = termsData.map(term => this.processTermData(term));

        this.validateTranscriptData(transcriptSummary, processedTerms);

        return {
            transcriptSummary,
            terms: processedTerms
        };
    }
}

/**
 * Processes transcript data from screenshots using GPT-4 Vision
 * @param {Array<string>} imageUrls - Array of transcript screenshot URLs/base64 strings
 * @returns {Object} Structured transcript data
 */
async function processTranscriptImages(imageUrls) {
  try {
    // Call GPT-4 Vision to extract data from images
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "system",
          content: `You are a precise transcript data extractor. Extract and structure transcript data exactly according to these specifications:

1. For the transcript summary:
   - student_id (leave as null, will be filled later)
   - student_name
   - program
   - attempted_credits_transfer
   - attempted_credits_residential
   - attempted_credits_cumulative
   - earned_credits_transfer
   - earned_credits_residential
   - earned_credits_cumulative
   - cumulative_gpa

2. For each term:
   - term_name
   - term_attempted_credits
   - term_earned_credits
   - term_gpa
   - courses (array of objects with):
     - course_code
     - course_title
     - grade
     - repeat
     - attempted_credits
     - earned_credits
     - quality_points

Return the data in a JSON structure exactly matching these fields.`
        },
        {
          role: "user",
          content: [
            ...imageUrls.map(url => ({
              type: "image",
              image_url: url
            })),
            {
              type: "text",
              text: "Extract the transcript data from these images and format it according to the specified structure."
            }
          ]
        }
      ],
      max_tokens: 4096,
    });

    // Parse and validate the response
    const extractedData = JSON.parse(response.choices[0].message.content);
    return validateTranscriptData(extractedData);
  } catch (error) {
    console.error('Error processing transcript images:', error);
    throw error;
  }
}

/**
 * Validates the structure and content of extracted transcript data
 * @param {Object} data - The extracted transcript data
 * @returns {Object} Validated and cleaned transcript data
 */
function validateTranscriptData(data) {
  // Ensure all required fields are present
  const requiredSummaryFields = [
    'student_name',
    'program',
    'attempted_credits_transfer',
    'attempted_credits_residential',
    'attempted_credits_cumulative',
    'earned_credits_transfer',
    'earned_credits_residential',
    'earned_credits_cumulative',
    'cumulative_gpa'
  ];

  const requiredTermFields = [
    'term_name',
    'term_attempted_credits',
    'term_earned_credits',
    'term_gpa',
    'courses'
  ];

  const requiredCourseFields = [
    'course_code',
    'course_title',
    'grade',
    'repeat',
    'attempted_credits',
    'earned_credits',
    'quality_points'
  ];

  // Validate summary fields
  requiredSummaryFields.forEach(field => {
    if (!(field in data.summary)) {
      throw new Error(`Missing required summary field: ${field}`);
    }
  });

  // Validate terms and courses
  data.terms.forEach((term, termIndex) => {
    requiredTermFields.forEach(field => {
      if (!(field in term)) {
        throw new Error(`Missing required term field: ${field} in term ${termIndex}`);
      }
    });

    term.courses.forEach((course, courseIndex) => {
      requiredCourseFields.forEach(field => {
        if (!(field in course)) {
          throw new Error(`Missing required course field: ${field} in course ${courseIndex} of term ${termIndex}`);
        }
      });
    });
  });

  return data;
}

module.exports = new TranscriptProcessor(); 