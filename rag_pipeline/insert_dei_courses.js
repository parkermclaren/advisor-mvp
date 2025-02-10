const { scrapeDEICourses } = require('./scrapers/dei_courses');
const { generateEmbedding } = require('./embeddings/vector_generator');
const { insertChunks } = require('./database/supabase_manager');

async function main() {
  try {
    console.log('Starting DEI courses ingestion...');
    
    // Scrape DEI courses
    const chunks = await scrapeDEICourses();
    console.log(`Found ${chunks.length} DEI requirement chunks`);
    
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
    console.log('Successfully inserted DEI requirement chunks!');
    
  } catch (error) {
    console.error('Error in DEI courses ingestion:', error);
    console.error('Full error:', error.stack);
  }
}

main(); 