# BubbleMaps Integration

This document describes how the Telegram bot integrates with the BubbleMaps platform to provide token ownership visualization and data.

## API Integration

The bot interacts with BubbleMaps through two main channels:

1. **BubbleMaps API**: Used to retrieve token data and metadata
2. **Web Visualization**: Using Playwright to create screenshots of the visual ownership distribution (bubble maps)

### BubbleMaps API Endpoints

The main endpoints used by the application:

```javascript
endpoints: {
  mapData: "https://api-legacy.bubblemaps.io/map-data",
  mapMetadata: "https://api-legacy.bubblemaps.io/map-metadata",
  bubblemapsUrl: "https://app.bubblemaps.io/"
}
```

These endpoints are defined in `config/constants.js` and used by the `bubblemapsService.js` to retrieve data.

## Screenshot Generation Process

One of the key features of the bot is providing visual representation of token ownership distribution. This is achieved through the following process:

1. The user queries information about a specific token
2. The application generates a URL to the BubbleMaps visualization for that token
3. Playwright (a browser automation tool) is used to:
   - Navigate to the generated URL
   - Handle any cookie consent dialogs or modal windows
   - Wait for the bubble map visualization to render
   - Take a screenshot of the rendered visualization
4. The screenshot is sent back to the user via Telegram

### Playwright Configuration

The application uses a custom `PlaywrightHelper` class to manage browser instances with optimized settings:

- Headless mode for production
- Platform-specific optimizations (Linux, macOS, Windows)
- Docker container detection and optimization
- Fallback mechanisms if the initial launch fails

### Screenshot Process

The screenshot generation is handled by the `screenshotService.js` module:

1. **Browser Launch**: A Chromium browser instance is launched using the `PlaywrightHelper`
2. **Page Navigation**: The browser navigates to the BubbleMaps URL for the specific token
3. **Dialog Handling**: Cookie consent and modal windows are automatically detected and closed
4. **Visualization Loading**: The service waits for the bubble map graph to load and stabilize
5. **Screenshot Capture**: A screenshot is taken of the visualization
6. **Resource Cleanup**: The browser is closed to free up system resources

### User Agent Configuration

The application uses a modern User-Agent string to ensure compatibility with the BubbleMaps website:

```
Mozilla/5.0 (Macintosh; Apple Silicon Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36
```

### Error Handling & Fallbacks

If the screenshot process fails (due to network issues, timeouts, etc.), the service provides a fallback mechanism that generates a simple HTML page with token information.

## Caching Strategy

To improve performance and reduce API load:

1. Screenshots are cached for 1 hour
2. Cached screenshots are reused for identical token/chain combinations
3. Screenshots are regenerated after the cache period expires

## Troubleshooting Common Issues

### Arrows and Icons Not Loading

If arrows and connection icons between bubbles are not loading:

1. Increase the stabilization time (currently set to 8 seconds * 2)
2. Ensure no resource blocking for images and SVG content
3. Verify the page has fully loaded with `waitUntil: 'networkidle'`

### Modal Windows Not Closing

The application attempts to close modal windows using multiple selector strategies:

1. Common selectors for standard modal designs
2. BubbleMaps-specific selectors
3. Fallback to ESC key for any remaining overlays

If modals still persist, additional selectors may need to be added to the `modalSelectors` array.

### Browser Launch Failures

If the browser fails to launch:

1. Check system resources (memory, disk space)
2. Verify Playwright is correctly installed (`npx playwright install chromium`)
3. Try setting a custom Chrome executable path via `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`
4. Check the logs for specific error messages 