const { scrapeCatalog } = require('./scrapers/course_catalog');
const { generateEmbedding } = require('./embeddings/vector_generator');
const { insertChunks } = require('./database/supabase_manager');

async function processBatch(courses) {
  try {
    console.log('\nProcessing batch of courses:');
    courses.forEach(course => {
      console.log(`\nCourse: ${course.code} - ${course.title}`);
      console.log(`Prerequisites: ${course.prerequisites.join(', ') || 'None'}`);
      console.log(`Credits: ${course.credits}`);
      console.log(`Terms: ${course.terms_offered.join(', ') || 'Not specified'}`);
      console.log(`Description: ${course.description.substring(0, 100)}...`);
    });
    
    // Convert courses to chunks
    const chunks = courses.map(course => ({
      title: `${course.code} - ${course.title}`,
      content: `Course: ${course.code} - ${course.title}\n\n${course.description}\n\nPrerequisites: ${course.prerequisites.join(', ') || 'None'}\nCredits: ${course.credits}\nTerms Offered: ${course.terms_offered.join(', ') || 'Not specified'}`,
      metadata: {
        ...course.metadata,
        prerequisites: course.prerequisites,
        credits: course.credits,
        terms_offered: course.terms_offered
      }
    }));

    // Generate embeddings
    console.log('\nGenerating embeddings...');
    const withEmbeddings = await Promise.all(
      chunks.map(async (chunk) => {
        try {
          const embedding = await generateEmbedding(chunk.content);
          console.log(`Generated embedding for ${chunk.title}`);
          return { ...chunk, embedding };
        } catch (error) {
          console.error(`Error generating embedding for ${chunk.title}:`, error);
          return null;
        }
      })
    );

    // Filter out any failed embeddings
    const validChunks = withEmbeddings.filter(chunk => chunk !== null);
    
    // Insert into Supabase
    if (validChunks.length > 0) {
      console.log(`\nInserting ${validChunks.length} chunks into Supabase...`);
      await insertChunks(validChunks);
      console.log('Successfully inserted chunks:');
      validChunks.forEach(chunk => {
        console.log(`- ${chunk.title}`);
      });
    }

    return validChunks.length;
  } catch (error) {
    console.error('Error processing batch:', error);
    return 0;
  }
}

async function main() {
  try {
    console.log('Starting full course catalog scrape...');
    
    // Scrape all courses using the print view
    const courses = await scrapeCatalog();
    
    if (courses.length > 0) {
      console.log(`\nSuccessfully scraped ${courses.length} courses`);
      
      // Process courses in batches of 50 to avoid overwhelming the embedding API
      const batchSize = 50;
      for (let i = 0; i < courses.length; i += batchSize) {
        const batch = courses.slice(i, i + batchSize);
        console.log(`\nProcessing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(courses.length/batchSize)}`);
        await processBatch(batch);
      }
    } else {
      console.error('No courses were scraped');
      process.exit(1);
    }
    
    console.log('\nScraping completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error in scraping:', error);
    process.exit(1);
  }
}

main(); 