const { chromium } = require('playwright');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');

/**
 * Helper utility for Playwright browser management
 */
class PlaywrightHelper {
  /**
   * Launch a browser with optimized settings for the current environment
   * @param {Object} options - Browser launch options
   * @returns {Promise<Browser>} - Playwright browser instance
   */
  static async launchBrowser(options = {}) {
    // Default options
    const defaultOptions = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ],
      timeout: 60000
    };

    // Merge options
    const mergedOptions = { ...defaultOptions, ...options };
    
    // Add custom executable path if set in env
    if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
      mergedOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
      logger.info(`Using custom Chromium executable: ${process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}`);
    }
    
    // Detect environment and adjust settings
    this._adjustOptionsForEnvironment(mergedOptions);
    
    try {
      logger.debug('Launching browser with options:', JSON.stringify(mergedOptions));
      return await chromium.launch(mergedOptions);
    } catch (error) {
      logger.error('Failed to launch browser:', error.message);
      
      // Try fallback options if initial launch fails
      if (!options.isFallback) {
        logger.info('Trying fallback browser launch options');
        const fallbackOptions = this._getFallbackOptions(mergedOptions);
        return this.launchBrowser({ ...fallbackOptions, isFallback: true });
      }
      
      throw error;
    }
  }
  
  /**
   * Adjust browser options based on the current environment
   * @private
   * @param {Object} options - Browser options to adjust
   */
  static _adjustOptionsForEnvironment(options) {
    const platform = os.platform();
    const isDocker = this._isRunningInDocker();
    
    // Docker-specific settings
    if (isDocker) {
      logger.info('Running in Docker container, applying Docker-specific settings');
      options.args.push('--disable-features=VizDisplayCompositor');
      options.args.push('--single-process'); // Sometimes helps in containerized environments
    }
    
    // Platform-specific adjustments
    if (platform === 'linux') {
      // Linux often needs these additional flags
      options.args.push('--no-zygote');
      options.args.push('--disable-feature=WebRtcHideLocalIpsWithMdns');
    } else if (platform === 'darwin') {
      // macOS specific adjustments (if any)
      // Currently no special flags needed
    } else if (platform === 'win32') {
      // Windows specific adjustments
      options.args.push('--disable-features=TranslateUI');
    }
    
    return options;
  }
  
  /**
   * Get fallback options for browser launch if initial attempt fails
   * @private
   * @param {Object} originalOptions - The original browser options
   * @returns {Object} - Fallback options
   */
  static _getFallbackOptions(originalOptions) {
    // Simplify arguments to the bare minimum
    return {
      ...originalOptions,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
      timeout: originalOptions.timeout * 1.5, // Increase timeout for fallback
      ignoreDefaultArgs: false, // Reset to default args
      executablePath: undefined // Let Playwright find the executable
    };
  }
  
  /**
   * Check if running inside a Docker container
   * @private
   * @returns {boolean} - True if in Docker, false otherwise
   */
  static _isRunningInDocker() {
    try {
      return fs.readFile('/proc/1/cgroup', 'utf8')
        .then(content => content.includes('docker'))
        .catch(() => false);
    } catch (e) {
      return false;
    }
  }
}

module.exports = PlaywrightHelper; 