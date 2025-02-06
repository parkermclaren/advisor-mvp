const { parseGenEdCourses } = require('./scrapers/gen_ed_parser');

async function main() {
  try {
    console.log('Testing Gen Ed courses parser...');
    const courses = await parseGenEdCourses();
    
    // Print sample of parsed data
    console.log('\nSample of parsed data:');
    console.log(JSON.stringify(courses[0], null, 2));
    
    console.log(`\nTotal categories found: ${courses.length}`);
    courses.forEach(category => {
      console.log(`${category.title}: ${category.courses.length} courses`);
    });
  } catch (error) {
    console.error('Error testing parser:', error);
    process.exit(1);
  }
}

main(); 