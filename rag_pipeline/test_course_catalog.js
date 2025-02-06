const { scrapeCourseCatalog } = require('./scrapers/course_catalog');
const { generateEmbedding } = require('./embeddings/vector_generator');
const { insertChunks } = require('./database/supabase_manager');

async function processBatch(courses) {
  try {
    // Take only first 3 courses for testing
    const testCourses = courses.slice(0, 3);
    console.log('\nProcessing test batch of 3 courses:');
    testCourses.forEach(course => {
      console.log(`\nCourse: ${course.courseCode} - ${course.title}`);
      console.log(`Prerequisites: ${course.prerequisites.join(', ') || 'None'}`);
      console.log(`Credits: ${course.credits}`);
      console.log(`Terms: ${course.terms_offered.join(', ') || 'Not specified'}`);
      console.log(`Description: ${course.description.substring(0, 100)}...`);
    });
    
    // Convert courses to chunks
    const chunks = testCourses.map(course => ({
      title: `${course.courseCode} - ${course.title}`,
      content: `${course.description}\n\nPrerequisites: ${course.prerequisites.join(', ') || 'None'}\nCredits: ${course.credits}\nTerms Offered: ${course.terms_offered.join(', ') || 'Not specified'}`,
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
    console.log('Starting course catalog test scrape (first 3 courses only)...');
    
    // Only process the first page
    await scrapeCourseCatalog(async (pageCourses) => {
      await processBatch(pageCourses);
      // Exit after processing first page
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Error in test:', error);
    process.exit(1);
  }
}

main(); 