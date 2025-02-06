const puppeteer = require('puppeteer');

async function scrapeCourseFromPopup(page, courseLink) {
  try {
    // Click the course link to open popup
    await courseLink.click();
    
    // Wait for popup content to load
    await page.waitForSelector('.td_dark .coursepadding', { timeout: 5000 });
    
    // Extract course information
    const courseInfo = await page.evaluate(() => {
      const container = document.querySelector('.td_dark .coursepadding');
      if (!container) return null;

      // Get course code and title
      const titleElement = container.querySelector('h3');
      const [code, ...titleParts] = titleElement.textContent.split('\u00A0-\u00A0');
      const title = titleParts.join(' ').trim();

      // Get description and other details
      const contentDiv = container.querySelector('div p:last-child');
      const description = contentDiv ? contentDiv.textContent.trim() : '';

      // Extract prerequisites
      const prereqText = description.match(/Prerequisites & Notes.*?\n(.*?)\n/s);
      const prerequisites = prereqText ? 
        prereqText[1].replace(/[()]/g, '').split(',').map(p => p.trim()) : 
        [];

      // Extract credits
      const creditsMatch = description.match(/\(Cr: (\d+)\)/);
      const credits = creditsMatch ? parseInt(creditsMatch[1]) : null;

      // Extract terms offered
      const termsMatch = description.match(/^(FA|SP|SU)/);
      const terms_offered = termsMatch ? [termsMatch[1]] : [];

      return {
        courseCode: code.trim(),
        title: title,
        description: description,
        prerequisites: prerequisites.filter(p => p && p !== 'none'),
        credits: credits,
        terms_offered: terms_offered,
        metadata: {
          type: 'course',
          department: code.split(' ')[0],
          level: parseInt(code.split(' ')[1]) || 0,
          source: 'Endicott Course Catalog'
        }
      };
    });

    // Click somewhere else to close the popup
    await page.click('body');
    await page.waitForTimeout(500); // Small delay to ensure popup closes

    return courseInfo;
  } catch (error) {
    console.error(`Error scraping course popup:`, error);
    return null;
  }
}

async function scrapeCoursePage(page, pageNum) {
  console.log(`Scraping page ${pageNum}...`);
  
  // If not first page, navigate to the page
  if (pageNum > 1) {
    try {
      await page.click(`a[aria-label="Page ${pageNum}"]`);
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
    } catch (error) {
      console.error(`Error navigating to page ${pageNum}:`, error);
      return [];
    }
  }

  // Get all course links on the page
  const courseLinks = await page.$$('a.preview_td');
  console.log(`Found ${courseLinks.length} courses on page ${pageNum}`);

  const courses = [];
  for (let i = 0; i < courseLinks.length; i++) {
    try {
      console.log(`Processing course ${i + 1} of ${courseLinks.length} on page ${pageNum}`);
      const courseInfo = await scrapeCourseFromPopup(page, courseLinks[i]);
      if (courseInfo) {
        courses.push(courseInfo);
      }
    } catch (error) {
      console.error(`Error processing course ${i + 1}:`, error);
    }
  }

  return courses;
}

async function scrapeCourseCatalog(onPageScraped = null) {
  const browser = await puppeteer.launch({ 
    headless: "new",
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920x1080'
    ]
  });
  
  const page = await browser.newPage();
  await page.setDefaultNavigationTimeout(60000);
  
  const allCourses = [];
  
  try {
    // Navigate to the first page
    await page.goto('https://catalog.endicott.edu/content.php?catoid=46&navoid=2581', { 
      waitUntil: 'networkidle0',
      timeout: 60000
    });
    
    // Scrape all 18 pages
    for (let pageNum = 1; pageNum <= 18; pageNum++) {
      const pageCourses = await scrapeCoursePage(page, pageNum);
      allCourses.push(...pageCourses);
      
      if (onPageScraped) {
        await onPageScraped(pageCourses);
      }
      
      console.log(`Completed page ${pageNum}. Total courses so far: ${allCourses.length}`);
    }
    
  } catch (error) {
    console.error('Error in course catalog scraping:', error);
  } finally {
    await browser.close();
  }
  
  return allCourses;
}

module.exports = { scrapeCourseCatalog };