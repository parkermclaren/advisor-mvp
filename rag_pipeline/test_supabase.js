const { testConnection } = require('./database/supabase_manager');

async function main() {
  try {
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('Failed to connect to Supabase or access academic_chunks table');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error running test:', error);
    process.exit(1);
  }
}

main(); 