require('dotenv').config({ path: '../.env.local' });

module.exports = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY
}; 