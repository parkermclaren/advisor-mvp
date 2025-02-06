const { parseGenEdCourses } = require('./scrapers/gen_ed_parser');
const { createGenEdChunks } = require('./processors/gen_ed_chunker');
const { generateEmbedding } = require('./embeddings/vector_generator');
const { insertChunks } = require('./database/supabase_manager');

async function main() {
  try {
    console.log('Starting Gen Ed pipeline test...');

    // 1. Parse the PDF
    console.log('Parsing Gen Ed courses from PDF...');
    const genEdData = await parseGenEdCourses();
    if (!genEdData) {
      throw new Error('No data returned from parser');
    }
    console.log(`Found ${genEdData.categories?.length || 0} categories`);
    console.log('Categories:', genEdData.categories?.map(c => c.name).join(', '));

    // 2. Create chunks
    console.log('\nCreating chunks from Gen Ed data...');
    const chunks = await createGenEdChunks(genEdData);
    if (!chunks) {
      throw new Error('No chunks created');
    }
    console.log(`Created ${chunks.length} chunks`);
    console.log('Chunk titles:', chunks.map(c => c.title).join(', '));

    // 3. Generate embeddings for each chunk
    console.log('\nGenerating embeddings...');
    for (const chunk of chunks) {
      console.log(`Generating embedding for: ${chunk.title}`);
      try {
        const embedding = await generateEmbedding(chunk.content);
        chunk.embedding = embedding;
        console.log(`Generated embedding of length: ${embedding.length}`);
      } catch (error) {
        console.error(`Error generating embedding for ${chunk.title}:`, error);
        throw error;
      }
    }

    // 4. Insert into Supabase
    console.log('\nInserting chunks into Supabase...');
    try {
      await insertChunks(chunks);
      console.log('Successfully inserted all chunks into Supabase');
    } catch (error) {
      console.error('Error inserting chunks:', error);
      throw error;
    }
    
    console.log('\nGen Ed pipeline test completed successfully!');
  } catch (error) {
    console.error('\nError in Gen Ed pipeline:', error);
    process.exit(1);
  }
}

main(); 