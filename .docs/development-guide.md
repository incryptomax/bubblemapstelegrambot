# Development Guide

This guide covers development practices and guidelines for the BubbleMaps Telegram Bot.

## Project Structure

```
.
├── config/             # Configuration files
├── docs/              # Documentation
├── logs/              # Application logs
├── screenshots/       # Generated screenshots
├── src/
│   ├── bot/          # Bot initialization and core setup
│   ├── handlers/     # Command and message handlers
│   ├── models/       # Database models
│   ├── services/     # Business logic services
│   └── utils/        # Utility functions and helpers
├── test/             # Test files
└── scripts/          # Utility scripts
```

## Screenshot Service

The screenshot service is responsible for capturing BubbleMaps visualizations. It uses Playwright for browser automation.

### Best Practices

1. Modal Handling:
```javascript
// Use DOM manipulation for reliable modal removal
await page.evaluate(() => {
  // Remove modal and backdrop
  const elements = document.querySelectorAll('.mdc-dialog, .mdc-dialog__scrim');
  elements.forEach(el => el.remove());
  
  // Clean up body styles
  document.body.style.overflow = '';
  document.body.style.position = '';
});
```

2. Browser Configuration:
```javascript
const browser = await chromium.launch({
  headless: true,
  args: [
    '--disable-dev-shm-usage',
    '--no-sandbox',
    '--disable-setuid-sandbox'
  ]
});

const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  userAgent: 'Mozilla/5.0 (Macintosh; Apple Silicon Mac OS X 14_0) AppleWebKit/537.36',
  ignoreHTTPSErrors: true
});
```

3. Error Handling:
```javascript
try {
  const screenshot = await page.screenshot({
    fullPage: false,
    clip: { x: 0, y: 0, width: 1280, height: 800 }
  });
  return screenshot;
} catch (error) {
  logger.error('Screenshot failed:', error.message);
  // Use fallback mechanism
  return await this.generateFallbackImage(token, chain);
} finally {
  await browser.close();
}
```

## Message Handling

When sending messages with screenshots:

```javascript
// Send screenshot with token info as caption
await bot.sendPhoto(chatId, screenshotBuffer, {
  caption: tokenInfo,
  parse_mode: 'Markdown',
  reply_markup: {
    inline_keyboard: [
      [{ text: 'View on BubbleMaps', url: mapUrl }],
      [{ text: 'Check Another Token', callback_data: 'check_token' }]
    ]
  }
});
```

## Error Handling

Implement comprehensive error handling:

```javascript
try {
  // Main operation
} catch (error) {
  logger.error(`Operation failed: ${error.message}`);
  
  if (error.name === 'TimeoutError') {
    // Handle timeout specifically
  } else if (error.name === 'NetworkError') {
    // Handle network issues
  }
  
  // Provide user-friendly message
  await bot.sendMessage(chatId, constants.messages.error);
}
```

## Testing

Run tests before committing changes:

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- --grep "Screenshot Service"
```

## Deployment

Deploy using Docker:

```bash
# Build image
docker build -t bubblemaps-bot .

# Run container
docker run -d \
  --name bubblemaps-bot \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/screenshots:/app/screenshots \
  --env-file .env \
  bubblemaps-bot
```

## Contributing

1. Create a feature branch:
```bash
git checkout -b feature/your-feature-name
```

2. Make your changes following the style guide

3. Test thoroughly

4. Submit a pull request

## Style Guide

- Use meaningful variable names
- Add JSDoc comments for functions
- Follow the existing code structure
- Use consistent error handling
- Log important operations and errors
- Keep functions focused and small
- Use async/await for asynchronous operations
- Handle all promise rejections
- Clean up resources in finally blocks

## Debugging

For debugging screenshot issues:

1. Enable verbose logging:
```javascript
logger.level = 'debug';
```

2. Use Playwright's debug mode:
```javascript
const browser = await chromium.launch({
  headless: false,
  slowMo: 100,
  devtools: true
});
```

3. Save page content for investigation:
```javascript
await page.content().then(html => {
  fs.writeFileSync('debug.html', html);
});
``` 