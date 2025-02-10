const { scrapeDEICourses } = require('./scrapers/dei_courses');
const { generateEmbedding } = require('./embeddings/vector_generator');
const { insertChunks, testConnection } = require('./database/supabase_manager');

async function main() {
  try {
    console.log('Starting structured DEI courses ingestion...');
    
    // Test Supabase connection first
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to Supabase');
    }
    
    // Scrape and structure DEI courses
    const chunks = await scrapeDEICourses();
    console.log(`Created ${chunks.length} structured chunks`);
    
    // Generate embeddings for chunks
    console.log('Generating embeddings...');
    for (let chunk of chunks) {
      console.log(`Generating embedding for: ${chunk.title}`);
      const embedding = await generateEmbedding(chunk.content);
      chunk.embedding = embedding;
      console.log(`Generated embedding of length: ${embedding.length}`);
    }
    
    // Insert chunks into Supabase
    console.log('Inserting chunks into Supabase...');
    await insertChunks(chunks);
    console.log('Successfully inserted all DEI requirement chunks!');
    
  } catch (error) {
    console.error('Error in DEI courses ingestion:', error);
    console.error('Full error:', error.stack);
  }
}

main(); 