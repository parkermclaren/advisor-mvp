const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

const supabase = createClient(config.supabaseUrl, config.supabaseKey);

async function setupGenEdTable() {
  // Check if table exists, if not create it
  const { data, error } = await supabase
    .from('gen_ed_courses')
    .select('id')
    .limit(1);

  if (error && error.code === '42P01') {
    console.log('Creating gen_ed_courses table...');
    // You'll need to create this table in Supabase dashboard
    // with the following structure:
    /*
      id: uuid primary key
      code: text
      name: text
      category: text
      description: text
      embedding: vector(1536)
      metadata: jsonb
      created_at: timestamp with time zone
    */
  }
}

async function insertGenEdCourses(courses) {
  console.log(`Inserting ${courses.length} Gen Ed course categories...`);
  
  try {
    for (const category of courses) {
      console.log(`Processing category: ${category.title}`);
      
      // Insert each course in the category
      for (const course of category.courses) {
        const { error } = await supabase
          .from('gen_ed_courses')
          .insert({
            code: course.code,
            name: course.name,
            category: category.category,
            metadata: {
              type: 'gen_ed',
              category: category.category,
              requirements_fulfilled: [category.category]
            }
          });

        if (error) {
          console.error(`Error inserting course ${course.code}:`, error);
        }
      }
    }
    
    console.log('Successfully inserted all Gen Ed courses');
  } catch (error) {
    console.error('Error in insertGenEdCourses:', error);
    throw error;
  }
}

async function searchGenEdCourses(queryEmbedding, category = null, limit = 5) {
  try {
    let query = supabase
      .rpc('match_gen_ed_courses', {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: limit
      });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error searching Gen Ed courses:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in searchGenEdCourses:', error);
    throw error;
  }
}

module.exports = {
  setupGenEdTable,
  insertGenEdCourses,
  searchGenEdCourses
}; 