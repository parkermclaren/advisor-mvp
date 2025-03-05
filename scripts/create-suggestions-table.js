require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function createSuggestionsTable() {
  try {
    console.log('Creating suggested_follow_ups table...');
    
    // Check if the table already exists
    const { data: existingTables, error: checkError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'suggested_follow_ups');
    
    if (checkError) {
      console.error('Error checking for existing table:', checkError);
      return;
    }
    
    if (existingTables && existingTables.length > 0) {
      console.log('Table suggested_follow_ups already exists.');
      return;
    }
    
    // Create the table using SQL
    const { error } = await supabase.rpc('exec', { 
      query: `
        CREATE TABLE IF NOT EXISTS suggested_follow_ups (
          id SERIAL PRIMARY KEY,
          chat_id UUID NOT NULL REFERENCES chat_sessions(chat_id) ON DELETE CASCADE,
          prompts JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ,
          UNIQUE(chat_id)
        );
      `
    });
    
    if (error) {
      console.error('Error creating table:', error);
      return;
    }
    
    console.log('Table suggested_follow_ups created successfully!');
  } catch (error) {
    console.error('Error:', error);
  }
}

createSuggestionsTable()
  .then(() => {
    console.log('Script completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  }); 