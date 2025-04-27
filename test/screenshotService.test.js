const screenshotService = require('../src/services/screenshotService');
const fs = require('fs').promises;
const path = require('path');

/**
 * Simple test script to verify that the Playwright screenshot service is working
 */
async function testScreenshotService() {
  console.log('Testing Playwright screenshot service...');
  
  try {
    // Use a known token address for testing
    const token = '0xa00453052a36d43a99ac1ca145dfe4a952ca33b8'; // UNI token
    const chain = 'eth';
    
    console.log(`Capturing screenshot for ${token} on ${chain}...`);
    const screenshot = await screenshotService.captureMapScreenshot(token, chain);
    
    if (screenshot) {
      console.log(`Screenshot captured successfully! Size: ${screenshot.length} bytes`);
      
      // Verify the file exists in the screenshots directory
      const filename = `${chain}_${token}.png`;
      const filePath = path.join(process.cwd(), 'screenshots', filename);
      
      const stats = await fs.stat(filePath);
      console.log(`Screenshot saved to ${filePath}, size: ${stats.size} bytes`);
      
      return true;
    } else {
      console.error('Failed to capture screenshot: No data returned');
      return false;
    }
  } catch (error) {
    console.error('Error testing screenshot service:', error.message);
    return false;
  }
}

// Run the test
testScreenshotService()
  .then(success => {
    console.log(success ? 'Test completed successfully!' : 'Test failed!');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error during test:', error);
    process.exit(1);
  }); 