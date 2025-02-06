const fs = require('fs').promises;
const pdf = require('pdf-parse');
const path = require('path');
const OpenAI = require('openai');
const config = require('../config');

const openai = new OpenAI({
  apiKey: config.openaiApiKey
});

function cleanJsonResponse(content) {
  // Remove markdown code block formatting if present
  const cleaned = content.replace(/```json\n|```\n|```/g, '').trim();
  console.log('Cleaned JSON response:', cleaned.substring(0, 200) + '...');
  return cleaned;
}

async function parseGenEdCourses() {
  try {
    console.log('Starting Gen Ed courses parsing...');
    
    // Read the PDF file
    const dataBuffer = await fs.readFile(path.join(__dirname, '../data/gen_ed_courses.pdf'));
    console.log('PDF file read successfully');
    
    const data = await pdf(dataBuffer);
    console.log('PDF parsed successfully');
    console.log('Raw text length:', data.text.length);
    
    // Clean up basic text formatting
    const cleanText = data.text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Split into sections based on category headers
    const sections = cleanText.split(/(?=\n[A-Z][A-Z\s&]+:)/);
    console.log(`Split text into ${sections.length} sections`);

    // Process overview section (first section)
    const overview = sections[0];
    console.log('Overview length:', overview.length);

    // Process each category section
    const categories = [];
    for (let i = 1; i < sections.length; i++) {
      const section = sections[i].trim();
      console.log(`\nProcessing section ${i} of ${sections.length-1}`);
      console.log('Section preview:', section.substring(0, 100));

      // Parse this section with GPT-4
      console.log('Calling GPT-4o for section...');
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Parse this section of a course catalog into a category object. Extract the category name and course information exactly as they appear.

Return a JSON object with this structure:
{
  "name": "exact category name",
  "courses": [
    {
      "code": "exact course code",
      "name": "exact course name",
      "description": "exact description if any"
    }
  ],
  "raw_content": "complete unmodified text of this section"
}`
          },
          {
            role: "user",
            content: section
          }
        ],
        temperature: 0.0
      });

      try {
        const cleanedContent = cleanJsonResponse(response.choices[0].message.content);
        const sectionData = JSON.parse(cleanedContent);
        console.log(`Parsed category: ${sectionData.name}`);
        console.log(`Found ${sectionData.courses.length} courses`);
        categories.push(sectionData);
      } catch (error) {
        console.error(`Error parsing section ${i}:`, error);
        console.error('Raw response:', response.choices[0].message.content);
      }
    }

    const result = {
      overview: overview.trim(),
      categories
    };

    console.log(`\nSuccessfully parsed ${result.categories.length} categories`);
    return result;

  } catch (error) {
    console.error('Error in parseGenEdCourses:', error);
    if (error.response) {
      console.error('OpenAI API error details:', error.response.data);
    }
    throw error;
  }
}

module.exports = { parseGenEdCourses }; 