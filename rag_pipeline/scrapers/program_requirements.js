const puppeteer = require('puppeteer');

async function scrapeFinanceRequirements() {
  const browser = await puppeteer.launch({ 
    headless: "new",
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920x1080'
    ],
    timeout: 60000,
    ignoreHTTPSErrors: true
  });
  
  const page = await browser.newPage();
  await page.setDefaultNavigationTimeout(60000);
  await page.setDefaultTimeout(60000);
  
  try {
    console.log('Navigating to finance program page...');
    await page.goto('https://catalog.endicott.edu/content.php?catoid=46&navoid=2515#fin-maj', { 
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    console.log('Page loaded, starting data extraction...');
    
    const financeData = await page.evaluate(() => {
      console.log('Starting page evaluation...');
      
      // Find the specific finance program element using the anchor
      const financeSection = document.querySelector('a[name="fin-maj"]')?.closest('tr');
      console.log('Finance section found:', !!financeSection);
      
      if (!financeSection) {
        console.log('Could not find finance section');
        return null;
      }
      
      // Get all the content within this section
      const contentDiv = financeSection.querySelector('.custom_leftpad_20');
      console.log('Content div found:', !!contentDiv);
      
      if (!contentDiv) {
        console.log('Could not find content div');
        return null;
      }

      // Extract the raw text content
      const content = contentDiv.textContent.trim();
      console.log('Content length:', content.length);
      
      // Extract year-specific sections
      const yearMatches = content.match(/(?:First Year|Sophomore|Junior|Senior).*?(?=(?:First Year|Sophomore|Junior|Senior|Learning Outcomes)|$)/gs) || [];
      console.log('Found year sections:', yearMatches.length);
      
      // Extract electives section
      const electivesMatch = content.match(/Finance Electives.*?(?=Learning Outcomes|$)/s);
      console.log('Found electives section:', !!electivesMatch);
      
      // Extract learning outcomes
      const outcomesMatch = content.match(/Learning Outcomes.*$/s);
      console.log('Found learning outcomes:', !!outcomesMatch);

      // Structure the data for return
      const structured = {
        title: "Finance Major (Bachelor of Science)",
        requirements: {
          content: content,
          sections: {
            years: yearMatches.map(year => year.trim()),
            electives: electivesMatch ? electivesMatch[0].trim() : '',
            learning_outcomes: outcomesMatch ? outcomesMatch[0].trim() : ''
          }
        }
      };

      return structured;
    });
    
    if (financeData) {
      console.log('Successfully extracted finance data:');
      console.log('- Content length:', financeData.requirements.content.length);
      console.log('- Number of year sections:', financeData.requirements.sections.years.length);
      console.log('- Has electives:', !!financeData.requirements.sections.electives);
      console.log('- Has learning outcomes:', !!financeData.requirements.sections.learning_outcomes);
    } else {
      console.log('Failed to extract finance data');
    }
    
    return financeData;
  } catch (error) {
    console.error('Error in finance requirements scraping:', error);
    return null;
  } finally {
    await browser.close();
  }
}

module.exports = { scrapeFinanceRequirements }; 