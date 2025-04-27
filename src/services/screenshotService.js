const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');
const bubblemapsService = require('./bubblemapsService');
const PlaywrightHelper = require('../utils/playwright-helper');

/**
 * Service for capturing screenshots of bubble maps using Playwright
 */
class ScreenshotService {
  constructor() {
    this.screenshotDir = path.join(process.cwd(), 'screenshots');
    this.ensureDirectoryExists();
    this.maxRetries = 3; // Maximum number of retry attempts
    this.retryDelay = 2000; // Delay between retries in milliseconds
    this.pageTimeout = 60000; // Increased page load timeout to 60 seconds
    this.navigationTimeout = 60000; // Separate navigation timeout
    this.stabilizationTime = 8000; // Increased wait time for graph to stabilize
  }

  /**
   * Ensure the screenshots directory exists
   * @private
   */
  async ensureDirectoryExists() {
    try {
      await fs.access(this.screenshotDir);
    } catch (error) {
      // Directory doesn't exist, create it
      await fs.mkdir(this.screenshotDir, { recursive: true });
      logger.info(`Created screenshots directory: ${this.screenshotDir}`);
    }
  }

  /**
   * Generate the URL for viewing a token on Bubblemaps
   * @param {string} token - Contract address
   * @param {string} chain - Chain ID
   * @returns {string} - URL to view the map
   */
  generateMapUrl(token, chain) {
    return bubblemapsService.generateMapUrl(token, chain);
  }

  /**
   * Capture a screenshot of a token's bubble map
   * @param {string} token - Contract address
   * @param {string} chain - Chain ID
   * @returns {Promise<Buffer>} - Screenshot buffer
   */
  async captureMapScreenshot(token, chain) {
    const url = this.generateMapUrl(token, chain);
    const filename = `${chain}_${token}.png`;
    const filePath = path.join(this.screenshotDir, filename);

    logger.info(`Capturing screenshot for ${url}`);
    
    // Check if screenshot already exists and is recent (less than 1 hour old)
    try {
      const stats = await fs.stat(filePath);
      const isRecent = Date.now() - stats.mtimeMs < 3600000; // 1 hour in milliseconds
      
      if (isRecent) {
        logger.info(`Using cached screenshot for ${token} on ${chain}`);
        return fs.readFile(filePath);
      }
    } catch (error) {
      // File doesn't exist or can't be accessed, continue to create it
    }

    // Implement retry logic with exponential backoff
    let lastError = null;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const screenshot = await this._takeScreenshot(url, token, chain, attempt);
        
        // Save the screenshot to file if it was successful
        if (screenshot) {
          await fs.writeFile(filePath, screenshot);
          logger.info(`Screenshot captured and saved to ${filePath}`);
          return screenshot;
        } else {
          throw new Error('No screenshot data returned');
        }
      } catch (error) {
        lastError = error;
        logger.warn(`Screenshot attempt ${attempt}/${this.maxRetries} failed for ${token} on ${chain}: ${error.message}`);
        
        // If we've reached the max retries, don't wait more
        if (attempt < this.maxRetries) {
          // Exponential backoff
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          logger.info(`Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // If all attempts failed, try to return a fallback image
    logger.error(`All screenshot attempts failed for ${token} on ${chain}. Using fallback image.`);
    try {
      // Try to use a default fallback image
      const fallbackPath = path.join(this.screenshotDir, 'fallback.png');
      
      // Check if fallback image exists
      try {
        await fs.access(fallbackPath);
        logger.info(`Using fallback image for ${token} on ${chain}`);
        return fs.readFile(fallbackPath);
      } catch (fallbackError) {
        // Create a simple fallback image if it doesn't exist
        logger.info(`Creating fallback image for ${token} on ${chain}`);
        
        // Create a default fallback screenshot from a blank HTML page
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        
        // Generate a simple page with token info
        await page.setContent(`
          <html>
            <head>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  margin: 0;
                  background-color: #f5f5f5;
                  color: #333;
                }
                .container {
                  text-align: center;
                  padding: 2rem;
                  background-color: white;
                  border-radius: 8px;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                  max-width: 80%;
                }
                h1 {
                  color: #E91E63;
                  margin-bottom: 1rem;
                }
                .token {
                  font-family: monospace;
                  background-color: #f0f0f0;
                  padding: 0.5rem;
                  border-radius: 4px;
                  margin: 1rem 0;
                  word-break: break-all;
                }
                .chain {
                  font-weight: bold;
                  color: #2196F3;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>BubbleMaps Visualization</h1>
                <p>Token visualization is currently unavailable.</p>
                <div class="token">${token}</div>
                <p>Chain: <span class="chain">${chain.toUpperCase()}</span></p>
                <p>Please check back later or visit <a href="${url}" target="_blank">BubbleMaps</a> directly.</p>
              </div>
            </body>
          </html>
        `);
        
        // Take a screenshot of this page
        const fallbackScreenshot = await page.screenshot({ 
          fullPage: false,
          clip: { x: 0, y: 0, width: 800, height: 600 }
        });
        
        await browser.close();
        
        // Save this as the fallback image for future use
        await fs.writeFile(fallbackPath, fallbackScreenshot);
        
        // Also save a copy as the requested token image
        await fs.writeFile(filePath, fallbackScreenshot);
        
        return fallbackScreenshot;
      }
    } catch (finalError) {
      // If even the fallback mechanism fails, rethrow the original error
      logger.error(`Failed to create fallback image: ${finalError.message}`);
      throw lastError;
    }
  }

  /**
   * Take a screenshot of a URL using Playwright
   * @private
   * @param {string} url - URL to screenshot
   * @param {string} token - Token address (for logging)
   * @param {string} chain - Chain ID (for logging)
   * @param {number} attempt - Current attempt number
   * @returns {Promise<Buffer>} - Screenshot buffer
   */
  async _takeScreenshot(url, token, chain, attempt) {
    let browser = null;
    
    try {
      logger.info(`Screenshot attempt ${attempt} for ${token} on ${chain}`);
      
      // Launch browser with PlaywrightHelper
      browser = await PlaywrightHelper.launchBrowser({
        timeout: this.pageTimeout
      });
      
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Macintosh; Apple Silicon Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36', // Modern user agent
        ignoreHTTPSErrors: true,
        bypassCSP: true
      });
      
      const page = await context.newPage();
      
      // Add timeout for navigation
      page.setDefaultTimeout(this.navigationTimeout);
      
      // Navigate to the page
      logger.info(`Navigating to ${url}`);
      try {
        const response = await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
        
        if (!response || !response.ok()) {
          throw new Error(`Failed to load page: ${response ? response.status() : 'No response'}`);
        }
      } catch (navError) {
        logger.error(`Navigation error: ${navError.message}`);
        // Even if the page didn't fully load, we can try to take a screenshot
        // if the DOM content was loaded
      }
      
      // Reduce waiting time
      logger.info('Waiting for 10 seconds to allow page to stabilize');
      await page.waitForTimeout(10000);
      
      // Check for the specific modal and close it if it exists
      logger.info('Checking for specific modal');
      try {
        // Try multiple approaches to remove the modal
        const modalRemoved = await page.evaluate(() => {
          let removed = false;
          
          // First try: Remove by class and role
          const popup = document.querySelector('.mdc-dialog__surface[role="alertdialog"]');
          const backdrop = document.querySelector('.mdc-dialog__scrim');
          if (popup || backdrop) {
            if (popup) popup.remove();
            if (backdrop) backdrop.remove();
            removed = true;
          }
          
          // Second try: Remove any mdc-dialog elements
          const dialogs = document.querySelectorAll('.mdc-dialog');
          dialogs.forEach(dialog => {
            dialog.remove();
            removed = true;
          });
          
          // Third try: Remove by dialog role
          const dialogElements = document.querySelectorAll('[role="dialog"], [role="alertdialog"]');
          dialogElements.forEach(dialog => {
            dialog.remove();
            removed = true;
          });
          
          // Fourth try: Force dialog state
          document.body.style.overflow = '';
          document.body.style.position = '';
          document.body.style.width = '';
          document.body.style.height = '';
          
          return removed;
        });

        if (modalRemoved) {
          logger.info('Attempted aggressive modal removal');
          await page.waitForTimeout(500);
          
          // Verify modal is gone
          const modalStillExists = await page.evaluate(() => {
            return !!(
              document.querySelector('.mdc-dialog__surface') ||
              document.querySelector('.mdc-dialog') ||
              document.querySelector('[role="dialog"]') ||
              document.querySelector('[role="alertdialog"]')
            );
          });
          
          if (modalStillExists) {
            logger.warn('Modal still detected after removal attempt, trying keyboard escape');
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);
          }
        } else {
          logger.info('No modal elements found to remove');
        }

        // Final verification and cleanup
        await page.evaluate(() => {
          // Remove any remaining overlay styles from body
          document.body.style.overflow = '';
          document.body.style.position = '';
          // Remove any backdrop elements that might remain
          const backdrops = document.querySelectorAll('.mdc-dialog__scrim, .modal-backdrop, .dialog-backdrop');
          backdrops.forEach(backdrop => backdrop.remove());
        });

      } catch (modalError) {
        logger.warn(`Error handling modal removal: ${modalError.message}`);
      }

      logger.info(`Taking screenshot of ${token}`);
      const screenshot = await page.screenshot({ 
        fullPage: false,
        clip: {
          x: 0,
          y: 0,
          width: 1280,
          height: 800
        },
        timeout: 15000
      });
      
      return screenshot;
    } catch (error) {
      logger.error(`Error during screenshot process for ${token} on ${chain}:`, error.message);
      throw error;
    } finally {
      if (browser) {
        logger.info(`Closing browser for ${token}`);
        try {
          await browser.close();
        } catch (closeError) {
          logger.warn(`Error closing browser: ${closeError.message}`);
        }
      }
    }
  }
}

module.exports = new ScreenshotService(); 