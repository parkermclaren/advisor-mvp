const puppeteer = require('puppeteer');

async function scrapeCourseFromPrintView(page, pageNum) {
  try {
    const baseUrl = 'https://catalog.endicott.edu/content.php?catoid=46&navoid=2581&filter%5B27%5D=-1&filter%5B29%5D=&filter%5Bkeyword%5D=&filter%5B32%5D=1&filter%5Bcpage%5D=';
    const urlSuffix = '&filter%5Bexact_match%5D=1&filter%5Bitem_type%5D=3&filter%5Bonly_active%5D=1&filter%5B3%5D=1&expand=1&print';
    
    console.log(`Navigating to page ${pageNum}...`);
    await page.goto(`${baseUrl}${pageNum}${urlSuffix}`, {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    // Wait for course content to be visible
    await page.waitForSelector('td.width', { timeout: 15000 });

    // Extract all courses
    const courses = await page.evaluate(() => {
      const courseElements = document.querySelectorAll('td.width');
      return Array.from(courseElements).map(courseElem => {
        try {
          // Get the course title element
          const titleElem = courseElem.querySelector('h3');
          if (!titleElem) {
            console.log('No h3 found in course element');
        return null;
      }

          // Split the title into code and name, handling non-breaking spaces
          const titleText = titleElem.textContent.replace(/\u00A0/g, ' ').trim();
          const titleParts = titleText.split(/\s+-\s+/);
      if (titleParts.length !== 2) {
            console.log('Invalid title format:', titleText);
        return null;
      }

      const code = titleParts[0].trim();
      const title = titleParts[1].trim();

          // Get all text content after the hr element
          const hr = courseElem.querySelector('hr');
      if (!hr) {
            console.log('No hr found in course element');
        return null;
      }

          // First, let's get any term indicators that appear before the hr
          const terms_offered = [];
          let termText = '';
          
          // Look for term text between hr and the first p tag
          const firstP = courseElem.querySelector('p');
          if (firstP) {
            let node = hr.nextSibling;
            while (node && node !== firstP) {
              if (node.nodeType === Node.TEXT_NODE || node.nodeName === 'STRONG') {
                termText += node.textContent.trim() + ' ';
              }
              node = node.nextSibling;
            }
          }
          
          // Parse term indicators
          termText = termText.toLowerCase().trim();
          if (termText.includes('fa/sp')) terms_offered.push('Fall', 'Spring');
          else if (termText.includes('fa e')) terms_offered.push('Fall Even Years');
          else if (termText.includes('fa o')) terms_offered.push('Fall Odd Years');
          else if (termText.includes('sp e')) terms_offered.push('Spring Even Years');
          else if (termText.includes('sp o')) terms_offered.push('Spring Odd Years');
          else if (termText.includes('fa')) terms_offered.push('Fall');
          else if (termText.includes('sp')) terms_offered.push('Spring');

          // Get description and prerequisites
      let description = '';
          let prereqText = '';
          let isPrereq = false;

          // First, get all text nodes between hr and the first p tag
      let node = hr.nextSibling;
          while (node && (!firstP || node !== firstP)) {
        if (node.nodeType === Node.TEXT_NODE) {
              const text = node.textContent.trim();
              if (text && !text.toLowerCase().includes('cr:') && !text.match(/^(fa|sp)/i)) {
                description += ' ' + text;
              }
        }
        node = node.nextSibling;
      }

          // Then process all p tags
          const paragraphs = courseElem.querySelectorAll('p');
          paragraphs.forEach(p => {
            const text = p.textContent.trim();
            
            // Check if this paragraph contains prerequisites
            if (text.includes('Prerequisites & Notes')) {
              isPrereq = true;
              // Extract everything after "Prerequisites & Notes"
              const parts = text.split('Prerequisites & Notes');
              if (parts.length > 1) {
                // Add the text before "Prerequisites & Notes" to description if it's not just terms or credits
                const beforePrereq = parts[0].trim();
                if (beforePrereq && 
                    !beforePrereq.includes('(Cr:') && 
                    !beforePrereq.match(/^(fa|sp)/i)) {
                  description += ' ' + beforePrereq;
                }
                // Get the prerequisites text
                prereqText = parts[1].split('(Cr:')[0].trim();
              }
            } else if (text.includes('(Cr:')) {
              // This is the last paragraph with credits
              const parts = text.split('(Cr:');
              const beforeCredits = parts[0].trim();
              if (beforeCredits && !isPrereq && !beforeCredits.match(/^(fa|sp)/i)) {
                description += ' ' + beforeCredits;
              }
            } else if (!isPrereq && !text.match(/^(fa|sp)/i)) {
              // This is part of the description (excluding term indicators)
              description += ' ' + text;
            }
          });

      // Clean up description
          description = description
        .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
            .replace(/\u00A0/g, ' ')  // Replace non-breaking spaces
        .replace(/\(Cr:\s*\d+\)/, '') // Remove credits from description
            .replace(/^\s*[.,]\s*/, '') // Remove leading periods or commas
        .trim();

          console.log('Final description:', description);

          // Extract credits
          const creditsMatch = courseElem.textContent.match(/\(Cr:\s*(\d+)\)/);
          const credits = creditsMatch ? parseInt(creditsMatch[1]) : null;

          // Parse prerequisites
          const prerequisites = [];
          if (prereqText) {
            // Clean up the text
            prereqText = prereqText.trim();
            
            // Handle various forms of instructor permission
            if (prereqText.includes('Permission from Instructor') || 
                prereqText.includes('Permission of Instructor') ||
                prereqText.includes('Instructor Permission')) {
              prerequisites.push('Permission from Instructor');  // Standardize to one format
            }
            
            // Handle class status requirements
            const statusMatch = prereqText.match(/(freshman|sophomore|junior|senior)(\s+class)?\s+status/i);
            if (statusMatch) {
              // Capitalize first letter for consistency
              const status = statusMatch[1].charAt(0).toUpperCase() + statusMatch[1].slice(1).toLowerCase();
              prerequisites.push(`${status} Class Status`);
            }
            
            // Look for course codes (e.g. ART110, PSY100)
            const courseMatches = prereqText.match(/[A-Z]{2,4}\s*\d{3}/g);
            if (courseMatches) {
              courseMatches.forEach(match => {
                // Normalize format (add space between letters and numbers)
                const normalized = match.replace(/([A-Z]+)(\d+)/, '$1 $2');
                prerequisites.push(normalized);
              });
            }
          }

          // Remove duplicates while preserving order
          const uniquePrereqs = [...new Set(prerequisites)];

      // Extract department and course number
      const [dept, courseNum] = code.split(' ');
      
      return {
        code,
        title,
        description,
            prerequisites: uniquePrereqs,
        credits,
            terms_offered,
        metadata: {
          type: 'course',
          department: dept,
          level: parseInt(courseNum) || 0,
          source: 'Endicott Course Catalog'
        }
      };
        } catch (error) {
          console.log('Error processing course element:', error);
      return null;
    }
      }).filter(course => course !== null);
    });

    console.log(`Successfully extracted ${courses.length} courses from page ${pageNum}`);
    return courses;

  } catch (error) {
    console.error(`Error scraping courses from page ${pageNum}:`, error);
      return [];
    }
  }

async function getNumberOfPages(page) {
  try {
    await page.goto('https://catalog.endicott.edu/content.php?catoid=46&navoid=2581&filter%5B27%5D=-1&filter%5B29%5D=&filter%5Bkeyword%5D=&filter%5B32%5D=1&filter%5Bcpage%5D=1&filter%5Bexact_match%5D=1&filter%5Bitem_type%5D=3&filter%5Bonly_active%5D=1&filter%5B3%5D=1&expand=1&print', {
      waitUntil: 'networkidle0'
    });

    // Get the total number of pages
    const pageCount = await page.evaluate(() => {
      const pageLinks = document.querySelectorAll('a[aria-label^="Page"]');
      let maxPage = 1;
      pageLinks.forEach(link => {
        const pageNum = parseInt(link.textContent);
        if (!isNaN(pageNum) && pageNum > maxPage) {
          maxPage = pageNum;
        }
      });
      return maxPage;
    });

    return pageCount;
  } catch (error) {
    console.error('Error getting page count:', error);
    throw error;
  }
}

async function scrapeCatalog() {
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
  
  try {
    const page = await browser.newPage();
    
    // First, get the total number of pages
    const totalPages = await getNumberOfPages(page);
    console.log(`Found ${totalPages} pages to scrape`);
    
    // Scrape all pages
    let allCourses = [];
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const coursesFromPage = await scrapeCourseFromPrintView(page, pageNum);
      allCourses = allCourses.concat(coursesFromPage);
      console.log(`Progress: ${pageNum}/${totalPages} pages (${allCourses.length} courses so far)`);
      
      // Add a small delay between pages to be nice to the server
      if (pageNum < totalPages) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`Completed scraping ${allCourses.length} courses from ${totalPages} pages`);
    return allCourses;
  } finally {
    await browser.close();
  }
}

module.exports = { scrapeCatalog };