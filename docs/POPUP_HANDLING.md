# Popup and Modal Handling in Bubblemaps Telegram Bot

This guide documents how the Bubblemaps Telegram Bot handles popup windows, modal dialogs, and cookie consent notices when capturing screenshots using Playwright.

## Current Implementation

The screenshot service uses several strategies to handle popups and modals that might appear on the Bubblemaps website:

### 1. Cookie Consent Handling

```javascript
const cookieSelectors = [
  '[aria-label="Accept cookies"]',
  'button:has-text("Accept")',
  'button:has-text("Accept All")',
  'button:has-text("Got it")',
  '.cookie-consent button',
  '#cookie-consent button',
  '[data-testid="cookie-accept"]'
];

for (const selector of cookieSelectors) {
  if (await page.$(selector) !== null) {
    logger.info(`Found cookie consent with selector "${selector}", accepting cookies`);
    await page.click(selector).catch(e => logger.debug(`Failed to click "${selector}": ${e.message}`));
    await page.waitForTimeout(1000); // Wait for animation
    break;
  }
}
```

### 2. Modal Window Handling

```javascript
const modalSelectors = [
  'button:has-text("CLOSE")', 
  'button:has-text("Close")',
  'button.close',
  '[data-testid="close-button"]',
  '.modal-close',
  '.modal .close',
  '.dialog-close',
  '.close-button',
  '[aria-label="Close"]',
  // BubbleMaps specific selectors
  '.modal [title="Close"]',
  '.popup-container .close-btn',
  // Additional selectors for welcome screens and announcements
  '.welcome-modal .close',
  '.announcement-modal .close',
  '[data-modal-close]'
];

// Try each selector to close potential modals
for (const selector of modalSelectors) {
  if (await page.$(selector) !== null) {
    logger.info(`Found modal with selector "${selector}", attempting to close`);
    await page.click(selector).catch(e => logger.debug(`Failed to click "${selector}": ${e.message}`));
    await page.waitForTimeout(1000); // Wait for modal animation
    break;
  }
}

// Handle any remaining overlay by trying ESC key
const hasOverlay = await page.evaluate(() => {
  // Check for elements with modal/overlay styling
  const elements = document.querySelectorAll('.modal, .overlay, [role="dialog"]');
  return elements.length > 0;
});

if (hasOverlay) {
  logger.info('Overlay still detected, trying ESC key');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);
}
```

## Common Issues and Solutions

### Issue: Modal Windows Not Closing

**Symptoms:**
- Screenshots show modal dialogs or overlays
- Content behind overlays is not visible

**Recommended Solutions:**

#### 1. Add More Selector Patterns

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

#### 2. Force-close with JavaScript

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

#### 3. Progressive Modal Closing Strategy

```javascript
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

## Testing Modal Handling

You can use the test scripts in the project to verify modal handling functionality:

### Using test-bubblemaps.js

```bash
node scripts/test-bubblemaps.js
```

This script navigates to the BubbleMaps homepage and tests the modal handling logic, saving a screenshot to verify results.

### Using bubblemaps-full.js

```bash
node scripts/bubblemaps-full.js
```

This script provides a more comprehensive test of the BubbleMaps screenshot functionality, including modal handling, with Russian-language logs.

## Troubleshooting Tips

1. **Check for New Modal Types**: The BubbleMaps website may introduce new types of modals or change the structure of existing ones. Regularly test and update the selectors.

2. **Increase Wait Times**: If modals appear after the initial check, consider increasing wait times before checking for modals or add multiple check phases.

3. **Monitor Error Logs**: The screenshot service logs all modal-related actions. If you notice issues, check the logs for failed selector clicks or unhandled modals.

4. **Test in Headful Mode**: When developing or debugging, use headful mode to observe the browser's behavior:
   ```javascript
   browser = await PlaywrightHelper.launchBrowser({
     headless: false,
     timeout: this.pageTimeout
   });
   ```

5. **Add Viewport Manipulation**: Sometimes modals are position-dependent. Consider scrolling or adjusting the viewport before attempting to close them.

## Adding New Selectors

When the BubbleMaps website is updated, you may need to add new selectors. Follow these steps:

1. Run the bot in debug mode to identify new modal selectors
2. Add the selectors to the `modalSelectors` array in `screenshotService.js`
3. Test the changes with the test scripts
4. Update this documentation if the modal handling strategy changes significantly 