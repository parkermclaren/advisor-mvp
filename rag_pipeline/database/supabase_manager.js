const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

const supabase = createClient(config.supabaseUrl, config.supabaseKey);

async function testConnection() {
  console.log('Testing Supabase connection...');
  console.log('Using URL:', config.supabaseUrl);
  try {
    // Try to select a single row from the table
    const { data, error } = await supabase
      .from('academic_chunks')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Error connecting to Supabase:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return false;
    }

    console.log('Successfully connected to Supabase');
    console.log('academic_chunks table exists and is accessible');
    console.log('Current row count:', data ? data.length : 0);
    return true;
  } catch (error) {
    console.error('Error testing Supabase connection:', error);
    console.error('Full error object:', JSON.stringify(error, null, 2));
    return false;
  }
}

async function insertChunk(chunk) {
  console.log('Attempting to insert chunk:', chunk.title);
  try {
    // Log the chunk data being sent (excluding the embedding for brevity)
    const chunkData = {
      title: chunk.title,
      content: chunk.content,
      metadata: chunk.metadata,
      embedding_length: chunk.embedding ? chunk.embedding.length : 'no embedding'
    };
    console.log('Chunk data:', JSON.stringify(chunkData, null, 2));

    const { data, error } = await supabase
      .from('academic_chunks')
      .insert([{
        title: chunk.title,
        content: chunk.content,
        metadata: chunk.metadata,
        embedding: chunk.embedding
      }]);

    if (error) {
      console.error('Error inserting chunk:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw error;
    }
    console.log('Successfully inserted chunk:', chunk.title);
    return data;
  } catch (error) {
    console.error('Error in insertChunk:', error);
    console.error('Full error object:', JSON.stringify(error, null, 2));
    throw error;
  }
}

async function insertChunks(chunks) {
  console.log(`Attempting to insert ${chunks.length} chunks into Supabase...`);
  try {
    // Test connection before attempting inserts
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to Supabase');
    }

    // Insert chunks in batches of 10 to avoid overwhelming the database
    const batchSize = 10;
    const results = [];
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      console.log(`Inserting batch ${i/batchSize + 1} of ${Math.ceil(chunks.length/batchSize)}`);
      
      // Log the first chunk in each batch (excluding embedding for brevity)
      console.log('Sample chunk from batch:', JSON.stringify({
        title: batch[0].title,
        content: batch[0].content,
        metadata: batch[0].metadata,
        embedding_length: batch[0].embedding ? batch[0].embedding.length : 'no embedding'
      }, null, 2));

      const { data, error } = await supabase
        .from('academic_chunks')
        .insert(
          batch.map(chunk => ({
            title: chunk.title,
            content: chunk.content,
            metadata: chunk.metadata,
            embedding: chunk.embedding
          }))
        );

      if (error) {
        console.error('Error inserting batch:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw error;
      }
      
      console.log(`Successfully inserted batch ${i/batchSize + 1}`);
      results.push(...(data || []));
    }
    
    console.log(`Successfully inserted all ${chunks.length} chunks`);
    return results;
  } catch (error) {
    console.error('Error in insertChunks:', error);
    console.error('Full error object:', JSON.stringify(error, null, 2));
    throw error;
  }
}

module.exports = { insertChunk, insertChunks, testConnection }; 