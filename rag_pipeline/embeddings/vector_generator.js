const OpenAI = require('openai');
const config = require('../config');

const openai = new OpenAI({
  apiKey: config.openaiApiKey
});

async function generateEmbedding(text) {
  try {
    console.log('Generating embedding for text of length:', text.length);
    
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text,
    });

    if (!response.data || !response.data[0] || !response.data[0].embedding) {
      console.error('Unexpected response format from OpenAI:', JSON.stringify(response, null, 2));
      throw new Error('Invalid response format from OpenAI');
    }

    const embedding = response.data[0].embedding;
    console.log('Successfully generated embedding of length:', embedding.length);
    
    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    if (error.response) {
      console.error('OpenAI API error details:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

module.exports = { generateEmbedding }; 