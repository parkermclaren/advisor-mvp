const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

module.exports = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY
}; 