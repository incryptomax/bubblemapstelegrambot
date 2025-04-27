const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;

/**
 * Script to check if Playwright is properly installed
 * This helps identify any issues with Playwright setup before starting the bot
 */
async function checkPlaywright() {
  console.log('Checking Playwright installation...');
  
  let browser = null;
  try {
    // Try to launch a browser
    console.log('Launching Chromium browser...');
    browser = await chromium.launch({ headless: true });
    
    // Create a simple page
    const page = await browser.newPage();
    await page.setContent(`
      <html>
        <body>
          <h1>Playwright Test</h1>
          <p>If you can see this message in the screenshot, Playwright is working correctly!</p>
        </body>
      </html>
    `);
    
    // Take a screenshot
    console.log('Taking a test screenshot...');
    const screenshotBuffer = await page.screenshot({ fullPage: true });
    
    // Save the screenshot to the testing directory
    const testDir = path.join(process.cwd(), 'test');
    try {
      await fs.access(testDir);
    } catch {
      await fs.mkdir(testDir, { recursive: true });
    }
    
    const screenshotPath = path.join(testDir, 'playwright-test.png');
    await fs.writeFile(screenshotPath, screenshotBuffer);
    
    console.log(`✅ Playwright is working correctly! Test screenshot saved to: ${screenshotPath}`);
    return true;
  } catch (error) {
    console.error('❌ Error checking Playwright installation:', error.message);
    console.error('');
    console.error('Please ensure Playwright is properly installed:');
    console.error('1. Run: npm install playwright');
    console.error('2. Run: npx playwright install chromium');
    console.error('');
    console.error('If you continue to have issues, check the Playwright documentation at:');
    console.error('https://playwright.dev/docs/intro');
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the check if this script is executed directly
if (require.main === module) {
  checkPlaywright()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = checkPlaywright; 