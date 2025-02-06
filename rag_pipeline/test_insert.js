const { insertChunk, testConnection } = require('./database/supabase_manager');

async function main() {
  try {
    // First test connection
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('Failed to connect to Supabase');
      process.exit(1);
    }

    // Try to insert a test chunk
    const testChunk = {
      title: "Test Course",
      content: "This is a test course description.",
      metadata: { type: 'test', courseCode: 'TEST101' },
      embedding: new Array(1536).fill(0.1) // OpenAI embeddings are 1536 dimensions
    };

    console.log('Attempting to insert test chunk...');
    const result = await insertChunk(testChunk);
    console.log('Insert result:', result);
  } catch (error) {
    console.error('Error running test:', error);
    process.exit(1);
  }
}

main(); 