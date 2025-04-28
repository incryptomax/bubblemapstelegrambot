# Playwright Troubleshooting Guide

This document provides detailed guidance for diagnosing and resolving common issues with the Playwright screenshot functionality in the BubbleMaps Telegram Bot.

## Common Screenshot Issues

### 1. Missing Arrows and Icons

**Symptoms:**
- Screenshot shows bubbles but missing arrows between them
- Icons within bubbles not visible
- Connection lines between nodes not appearing

**Causes:**
- Insufficient wait time for visualization to fully render
- SVG elements loading after initial DOM content
- Resource blocking for certain content types
- JavaScript animations still in progress

**Solutions:**

1. **Increase Waiting Time:**
   ```javascript
   // Increase stabilization time in screenshotService.js
   this.stabilizationTime = 15000; // 15 seconds instead of 8
   
   // Or in the _takeScreenshot method
   await page.waitForTimeout(this.stabilizationTime * 2);
   ```

2. **Disable Resource Blocking:**
   ```javascript
   // Remove or modify route blocking in screenshotService.js
   // Original problematic code:
   await context.route('**/*', route => {
     const request = route.request();
     const resourceType = request.resourceType();
     
     // Block unnecessary resources to speed up loading
     if (['image', 'media', 'font'].includes(resourceType) && 
         !request.url().includes('bubblemaps')) {
       route.abort();
     } else {
       route.continue();
     }
   });
   
   // Either remove this completely or modify to:
   await context.route('**/*', route => {
     const request = route.request();
     const url = request.url();
     const resourceType = request.resourceType();
     
     // Only block resources not needed for visualization
     if (resourceType === 'media' && !url.includes('bubblemaps')) {
       route.abort();
     } else {
       route.continue();
     }
   });
   ```

3. **Update Wait Conditions:**
   ```javascript
   // More robust waiting strategy
   await page.waitForSelector('.bubblemaps-graph', { 
     state: 'attached', 
     timeout: 30000 
   });
   
   // Wait for SVG elements that contain arrows
   await page.waitForSelector('.bubblemaps-graph svg path', { 
     state: 'attached',
     timeout: 20000
   }).catch(e => logger.warn('SVG paths not found, but continuing'));
   
   // Wait for network to be completely idle
   await page.waitForLoadState('networkidle', { timeout: 30000 })
     .catch(e => logger.warn('Network not completely idle, but continuing'));
   ```

4. **Test with Headful Mode:**
   ```javascript
   // For testing, run browser in headful mode to observe rendering
   browser = await PlaywrightHelper.launchBrowser({
     headless: false,
     timeout: this.pageTimeout
   });
   ```

### 2. Modal Windows Not Closing

**Symptoms:**
- Screenshots show modal dialogs or overlays
- Content behind overlays is not visible

**Solutions:**

1. **Add More Selector Patterns:**
   ```javascript
   // Add additional selectors to the modalSelectors array
   const modalSelectors = [
     // Existing selectors...
     
     // Additional selectors for BubbleMaps site
     '[data-testid="modal-close"]',
     '.dialog button[aria-label="close"]',
     '.overlay-container button',
     'button.dismiss',
     '.modal-header .btn-close'
   ];
   ```

2. **Force-close with JavaScript:**
   ```javascript
   // Try to remove modals using JavaScript if selectors fail
   await page.evaluate(() => {
     // Remove common modal elements
     document.querySelectorAll('.modal, .overlay, [role="dialog"]').forEach(el => {
       el.remove();
     });
     
     // Remove modal backdrops
     document.querySelectorAll('.modal-backdrop').forEach(el => {
       el.remove();
     });
     
     // Fix body styling (often modified by modals)
     document.body.style.overflow = 'auto';
     document.body.classList.remove('modal-open');
   });
   ```

3. **Try Multiple Close Strategies:**
   ```javascript
   // Example of progressive modal closing strategy
   async function closeModals(page) {
     // Try clicking selectors first
     for (const selector of modalSelectors) {
       if (await page.$(selector) !== null) {
         await page.click(selector).catch(e => logger.debug(`Failed to click "${selector}"`));
         await page.waitForTimeout(1000);
       }
     }
     
     // Then try Escape key
     await page.keyboard.press('Escape');
     await page.waitForTimeout(1000);
     
     // Finally, try JavaScript removal
     await page.evaluate(() => {
       document.querySelectorAll('.modal, .overlay, [role="dialog"]').forEach(el => {
         el.remove();
       });
       document.body.style.overflow = 'auto';
     });
   }
   ```

### 3. Browser Launch Failures

**Symptoms:**
- Error messages about browser not launching
- Timeout errors when starting Playwright
- "No such file or directory" errors for browser executable

**Solutions:**

1. **Verify Playwright Installation:**
   ```bash
   # Check if Playwright is properly installed
   npx playwright --version
   
   # Reinstall Chromium browser
   npx playwright install chromium
   ```

2. **Check Environment Variables:**
   ```bash
   # If using custom Chrome path, verify it exists
   ls -la $PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
   
   # If not set, consider setting it to a known working Chrome installation
   export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chrome
   ```

3. **Debug Launch Issues:**
   ```javascript
   // Add more detailed logging before launch
   logger.debug('System info:', {
     platform: os.platform(),
     release: os.release(),
     arch: os.arch(),
     memory: process.memoryUsage(),
     cwd: process.cwd()
   });
   
   // More verbose browser launch
   browser = await chromium.launch({
     headless: true,
     args: ['--no-sandbox', '--disable-setuid-sandbox'],
     timeout: 60000,
     logger: {
       isEnabled: (name, severity) => true,
       log: (name, severity, message, args) => {
         logger.debug(`Browser internal: [${severity}] ${message}`);
       }
     }
   });
   ```

4. **Test with Minimal Options:**
   ```javascript
   // Try minimal launch options to isolate issues
   browser = await chromium.launch({
     headless: true,
     args: ['--no-sandbox'],
     timeout: 90000 // Longer timeout
   });
   ```

## Testing and Debugging

### Diagnostic Script

Create a diagnostic script to test the screenshot functionality in isolation:

```javascript
// scripts/test-playwright.js
const { chromium } = require('playwright');
const os = require('os');

async function runDiagnostics() {
  console.log('=== Playwright Diagnostics ===');
  console.log('OS:', os.platform(), os.release());
  console.log('Architecture:', os.arch());
  console.log('Node version:', process.version);
  
  try {
    console.log('\nAttempting to launch browser...');
    const browser = await chromium.launch({
      headless: true,
      timeout: 30000
    });
    
    console.log('Browser launched successfully');
    console.log('Browser version:', await browser.version());
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('\nNavigating to test page...');
    await page.goto('https://example.com', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    console.log('Page loaded successfully');
    
    console.log('\nTaking test screenshot...');
    await page.screenshot({ path: 'test-screenshot.png' });
    console.log('Screenshot saved to test-screenshot.png');
    
    await browser.close();
    console.log('\nTest completed successfully');
    return true;
  } catch (error) {
    console.error('\nDiagnostic test failed:', error);
    return false;
  }
}

runDiagnostics().then(success => {
  process.exit(success ? 0 : 1);
});
```

### Logging Improvements

Enhance logging in the screenshot service for better diagnostics:

```javascript
// Add detailed logging for each step of the process
async _takeScreenshot(url, token, chain, attempt) {
  const logContext = `[${chain}:${token.slice(0,8)}]`;
  let browser = null;
  
  logger.info(`${logContext} Screenshot attempt ${attempt} starting`);
  
  try {
    // Log system state
    logger.debug(`${logContext} System state:`, {
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    });
    
    // Browser launch with timing
    const browserStartTime = Date.now();
    logger.info(`${logContext} Launching browser...`);
    browser = await PlaywrightHelper.launchBrowser({
      timeout: this.pageTimeout
    });
    logger.info(`${logContext} Browser launched in ${Date.now() - browserStartTime}ms`);
    
    // Continue with existing flow, adding more timing and state logs
    // ...
  } catch (error) {
    // Enhanced error logging
    logger.error(`${logContext} Screenshot error:`, {
      message: error.message,
      stack: error.stack,
      attemptNumber: attempt,
      url: url
    });
    throw error;
  }
}
```

## Performance Optimization

If you're experiencing slow screenshot generation, consider these optimizations:

1. **Reduce Loaded Resources:**
   ```javascript
   // Use a more targeted blocking strategy
   await context.route('**/*', route => {
     const request = route.request();
     const url = request.url();
     
     // Block non-essential resources
     if (url.endsWith('.woff') || 
         url.endsWith('.jpg') || 
         url.includes('analytics') ||
         url.includes('tracking')) {
       route.abort();
     } else {
       route.continue();
     }
   });
   ```

2. **Limit Viewport Size:**
   ```javascript
   const context = await browser.newContext({
     viewport: { width: 1024, height: 768 }, // Smaller than default
     deviceScaleFactor: 1 // Prevent high-DPI rendering
   });
   ```

3. **Optimize Screenshot Parameters:**
   ```javascript
   const screenshot = await page.screenshot({ 
     fullPage: false,
     clip: {
       x: 0,
       y: 0,
       width: 1024, // Match viewport width
       height: 768  // Match viewport height
     },
     type: 'jpeg', // Use JPEG instead of PNG for smaller file size
     quality: 80,  // Reduce quality slightly for better performance
     timeout: 10000
   });
   ``` 