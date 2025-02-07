const { scrapeCourseCatalog } = require('./scrapers/course_catalog');
const { generateEmbedding } = require('./embeddings/vector_generator');
const { insertChunks } = require('./database/supabase_manager');
const puppeteer = require('puppeteer');

async function verifyPage() {
  console.log('Verifying page access...');
  const browser = await puppeteer.launch({ 
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    console.log('Navigating to catalog page...');
    await page.goto('https://catalog.endicott.edu/content.php?catoid=46&navoid=2581', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    // Get page content for debugging
    const content = await page.content();
    console.log('Page content length:', content.length);
    console.log('Page title:', await page.title());
    
    // Check for specific elements
    const links = await page.$$('a.preview_td');
    console.log('Preview links found:', links.length);
    
    const html = await page.evaluate(() => document.documentElement.outerHTML);
    console.log('Sample of page HTML:', html.substring(0, 500));
    
    return links.length > 0;
  } catch (error) {
    console.error('Error verifying page:', error);
    return false;
  } finally {
    await browser.close();
  }
}

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
    
    // First verify page access
    const isPageAccessible = await verifyPage();
    if (!isPageAccessible) {
      console.error('Could not access course catalog page properly');
      process.exit(1);
    }
    
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