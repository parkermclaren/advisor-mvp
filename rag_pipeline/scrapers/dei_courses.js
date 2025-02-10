const fs = require('fs').promises;
const path = require('path');
const pdf = require('pdf-parse');
const OpenAI = require('openai');
const config = require('../config');

const openai = new OpenAI({
  apiKey: config.openaiApiKey
});

async function scrapeDEICourses() {
  try {
    console.log('Starting DEI courses parsing...');
    
    // Read the PDF file
    const dataBuffer = await fs.readFile(path.join(__dirname, '../data/gen_ed_courses.pdf'));
    console.log('PDF file read successfully');
    
    const data = await pdf(dataBuffer);
    console.log('PDF parsed successfully');
    console.log('Full text length:', data.text.length);
    
    // Clean up basic text formatting
    const cleanText = data.text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    console.log('Looking for DEI section...');
    
    // Find the DEI section using the exact heading
    const deiSection = cleanText.match(/DIVERSITY, EQUITY, AND INCLUSION:[\s\S]*?(?=\n\n[A-Z][A-Z\s,&]+:|\n*$)/i);
    
    if (!deiSection) {
      console.log('Text sample around expected DEI section:');
      console.log(cleanText.substring(0, 500) + '...');
      throw new Error('DEI section not found in PDF');
    }

    console.log('Found DEI section:', deiSection[0].substring(0, 200) + '...');

    // Parse the section with GPT-4 to get structured data
    console.log('Calling GPT-4 to parse DEI section...');
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
          content: deiSection[0]
        }
      ],
      temperature: 0.0
    });

    // Clean and parse the response
    const cleanedContent = response.choices[0].message.content.replace(/```json\n|```\n|```/g, '').trim();
    const parsedData = JSON.parse(cleanedContent);
    console.log(`Parsed DEI category with ${parsedData.courses.length} courses`);

    // Create chunks using the same structure as gen_ed_chunker
    const chunks = [];
    
    // Add the full category overview chunk
    chunks.push({
      title: `Gen Ed - ${parsedData.name}`,
      content: parsedData.raw_content,
      metadata: {
        type: "gen_ed",
        subtype: "category",
        category: parsedData.name,
        course_count: parsedData.courses.length
      }
    });

    // Split courses into smaller chunks (12 courses per chunk)
    const coursesPerChunk = 12;
    for (let i = 0; i < parsedData.courses.length; i += coursesPerChunk) {
      const courseSlice = parsedData.courses.slice(i, i + coursesPerChunk);
      const chunkIndex = Math.floor(i / coursesPerChunk) + 1;
      
      // Format courses preserving original structure
      const courseContent = courseSlice.map(course => 
        `${course.code} - ${course.name}\n${course.description || ""}`
      ).join("\n\n");

      chunks.push({
        title: `Gen Ed - ${parsedData.name} Courses (Part ${chunkIndex})`,
        content: courseContent,
        metadata: {
          type: "gen_ed",
          subtype: "course_list",
          category: parsedData.name,
          chunk_index: chunkIndex,
          total_chunks: Math.ceil(parsedData.courses.length / coursesPerChunk),
          courses: courseSlice.map(c => c.code)
        }
      });
    }

    return chunks;
  } catch (error) {
    console.error('Error parsing DEI courses:', error);
    throw error;
  }
}

module.exports = { scrapeDEICourses }; 