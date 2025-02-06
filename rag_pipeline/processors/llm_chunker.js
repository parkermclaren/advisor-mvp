const OpenAI = require('openai');
const config = require('../config');

const openai = new OpenAI({
  apiKey: config.openaiApiKey
});

async function createIntelligentChunks(rawProgramContent) {
  try {
    // First, ask GPT-4 to analyze and structure the content
    const structuringResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a precise academic program requirement analyzer. Your task is to take raw program requirement text and break it down into clear, natural language chunks that will be used by a RAG system to answer student questions. For each chunk:

1. Start with a clear title describing what the chunk contains
2. Include complete sentences and context that will help answer student questions
3. Keep related information together (e.g., all information about junior year requirements in one chunk)
4. Preserve exact course codes, credit numbers, and specific requirements
5. Include any relevant prerequisites or special conditions
6. Format the output as a series of chunks separated by "---" with a title line starting with "CHUNK: "

Example format:
CHUNK: First Year Requirements
The first year of the program requires 32-33 credits, including... [full context and details]
---
CHUNK: Program Electives
Students must choose four electives from the following list... [full list and details]
---`
        },
        {
          role: "user",
          content: `Please analyze this program requirement text and break it into clear, natural language chunks that will help answer student questions about degree requirements:

${rawProgramContent}`
        }
      ],
      temperature: 0.1, // Low temperature for more precise output
    });

    // Split the response into chunks
    const chunks = structuringResponse.choices[0].message.content
      .split('---')
      .map(chunk => chunk.trim())
      .filter(chunk => chunk.length > 0)
      .map(chunk => {
        const titleMatch = chunk.match(/CHUNK: (.*?)\n/);
        const title = titleMatch ? titleMatch[1].trim() : 'Untitled Chunk';
        const content = chunk.replace(/CHUNK: .*?\n/, '').trim();
        
        return {
          title,
          content,
          metadata: {
            type: "program_requirement",
            program: "finance",
            category: title.toLowerCase().includes('elective') ? 'elective' : 
                     title.toLowerCase().includes('general education') ? 'gen-ed' : 'core',
            year: title.toLowerCase().includes('first') ? 1 :
                  title.toLowerCase().includes('sophomore') ? 2 :
                  title.toLowerCase().includes('junior') ? 3 :
                  title.toLowerCase().includes('senior') ? 4 : null
          }
        };
      });

    console.log(`Created ${chunks.length} natural language chunks`);
    return chunks;
  } catch (error) {
    console.error('Error in intelligent chunking:', error);
    throw error;
  }
}

module.exports = { createIntelligentChunks }; 