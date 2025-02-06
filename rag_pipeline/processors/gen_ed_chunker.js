const OpenAI = require('openai');
const config = require('../config');

const openai = new OpenAI({
  apiKey: config.openaiApiKey
});

async function createGenEdChunks(genEdData) {
  const chunks = [];
  
  try {
    // Create overview chunk
    if (genEdData.overview) {
      chunks.push({
        title: "General Education Requirements Overview",
        content: genEdData.overview,
        metadata: {
          type: "gen_ed",
          subtype: "overview",
          chunk_type: "overview"
        }
      });
    }

    // Process each category
    for (const category of genEdData.categories) {
      // Create category overview chunk with raw content
      chunks.push({
        title: `Gen Ed - ${category.name}`,
        content: category.raw_content,
        metadata: {
          type: "gen_ed",
          subtype: "category",
          category: category.name,
          course_count: category.courses.length
        }
      });

      // Split courses into smaller chunks (10-15 courses per chunk)
      const coursesPerChunk = 12;
      for (let i = 0; i < category.courses.length; i += coursesPerChunk) {
        const courseSlice = category.courses.slice(i, i + coursesPerChunk);
        const chunkIndex = Math.floor(i / coursesPerChunk) + 1;
        
        // Format courses preserving original structure
        const courseContent = courseSlice.map(course => 
          `${course.code} - ${course.name}\n${course.description || ""}`
        ).join("\n\n");

        chunks.push({
          title: `Gen Ed - ${category.name} Courses (Part ${chunkIndex})`,
          content: courseContent,
          metadata: {
            type: "gen_ed",
            subtype: "course_list",
            category: category.name,
            chunk_index: chunkIndex,
            total_chunks: Math.ceil(category.courses.length / coursesPerChunk),
            courses: courseSlice.map(c => c.code)
          }
        });
      }
    }

    return chunks;
  } catch (error) {
    console.error('Error in createGenEdChunks:', error);
    throw error;
  }
}

async function enhanceChunkContent(chunk) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert at enhancing academic content chunks for RAG systems. Your task is to take the input content and enhance it with natural language that will help answer student questions about Gen Ed requirements. Keep all existing information but add context and clarity where helpful.

Rules:
1. Preserve all course codes and names exactly
2. Keep all specific requirements and credits
3. Add natural transitions and explanatory text
4. Include common student questions this content might answer
5. Format the output in clear markdown`
        },
        {
          role: "user",
          content: `Please enhance this ${chunk.metadata.subtype} content for the Gen Ed category "${chunk.metadata.category || 'Overview'}":\n\n${chunk.content}`
        }
      ],
      temperature: 0.3,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error enhancing chunk content:', error);
    return chunk.content; // Return original content if enhancement fails
  }
}

module.exports = { createGenEdChunks }; 