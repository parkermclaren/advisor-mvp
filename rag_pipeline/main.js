const { scrapeFinanceRequirements } = require('./scrapers/program_requirements');
const { createIntelligentChunks } = require('./processors/llm_chunker');
const { generateEmbedding } = require('./embeddings/vector_generator');
const { insertChunks } = require('./database/supabase_manager');

async function main() {
  try {
    console.log('Starting scraper for finance degree requirements...');
    const financeData = await scrapeFinanceRequirements();
    
    if (financeData && financeData.requirements && financeData.requirements.content) {
      console.log('Creating intelligent chunks...');
      const chunks = await createIntelligentChunks(financeData.requirements.content);
      console.log('Created chunks:', JSON.stringify(chunks, null, 2));
      
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
      console.log('Successfully inserted chunks!');
    } else {
      console.error('No finance data was returned from scraper');
    }
    
    console.log('Pipeline complete!');
  } catch (error) {
    console.error('Error in pipeline:', error);
    console.error('Full error:', error.stack);
  }
}

main(); 