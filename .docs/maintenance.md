# Maintenance Guide

This document provides guidance on maintaining and troubleshooting the BubbleMaps Telegram Bot in production.

## Log Management

### Log Files

The bot generates several log files in the `logs/` directory:

- `combined.log`: All log messages (debug, info, warn, error)
- `error.log`: Error messages only
- `playwright.log`: Playwright/browser-related logs
- `puppeteer.log`: Legacy browser automation logs (if applicable)
- `exceptions.log`: Uncaught exceptions
- `rejections.log`: Unhandled promise rejections

### Log Rotation

Log files can grow very large over time. The application uses Winston for automatic log rotation, but you may need to manage this manually on some deployments:

```bash
# Check log file sizes
du -sh logs/*

# Rotate logs manually if needed
mv logs/combined.log logs/combined.log.old
touch logs/combined.log
gzip logs/combined.log.old
```

To implement automated log rotation using logrotate (Linux):

1. Create a configuration file `/etc/logrotate.d/bubblemaps-bot`:
   ```
   /path/to/bubblemaps-bot/logs/*.log {
     daily
     missingok
     rotate 14
     compress
     delaycompress
     notifempty
     create 0640 node node
     sharedscripts
     postrotate
       kill -USR2 `cat /path/to/bubblemaps-bot/logs/application.pid 2>/dev/null` 2>/dev/null || true
     endscript
   }
   ```

2. Test the configuration:
   ```bash
   logrotate -d /etc/logrotate.d/bubblemaps-bot
   ```

### Cleaning Up Logs

To prevent disk space issues, regularly clean up old logs:

```bash
# Find large log files
find logs -type f -name "*.log*" -size +100M

# Delete logs older than 30 days
find logs -type f -name "*.log.*" -mtime +30 -delete
```

## Database Maintenance

### MongoDB Backups

Regularly back up the MongoDB database:

```bash
# Create a backup
mongodump --uri="mongodb://localhost:27017/bubblemaps-bot" --out=/backup/$(date +%Y-%m-%d)

# Compress the backup
tar -zcvf /backup/$(date +%Y-%m-%d).tar.gz /backup/$(date +%Y-%m-%d)
```

### Database Performance

Monitor database performance and optimize when necessary:

```bash
# Connect to MongoDB
mongo mongodb://localhost:27017/bubblemaps-bot

# View collection stats
db.users.stats()
db.interactions.stats()

# Create indices for frequently queried fields
db.users.createIndex({ telegramId: 1 })
db.interactions.createIndex({ user: 1, createdAt: -1 })
```

## Playwright/Browser Management

### Browser Cache

The browser creates cache files that can accumulate over time. Clean these periodically:

```bash
# Check Playwright cache size
du -sh ~/.cache/ms-playwright/

# Clean up Playwright browser cache (optional, use with caution)
rm -rf ~/.cache/ms-playwright/*/cache
```

### Browser Crashes

If you notice frequent browser crashes in the logs:

1. Check system resources:
   ```bash
   free -h  # Memory
   df -h    # Disk space
   top      # CPU usage
   ```

2. Adjust browser launch options in `src/utils/playwright-helper.js`:
   ```javascript
   // Add more conservative memory options
   const mergedOptions = {
     ...defaultOptions,
     args: [
       ...defaultOptions.args,
       '--disable-dev-shm-usage',
       '--disable-gpu',
       '--disable-setuid-sandbox',
       '--no-sandbox',
       '--single-process'  // Less memory but less stable
     ]
   };
   ```

3. Consider implementing a browser process health check:
   ```javascript
   // Add to your main app loop
   setInterval(async () => {
     try {
       // Simple health check
       const browser = await chromium.launch({ timeout: 30000 });
       await browser.close();
       logger.info('Browser health check passed');
     } catch (error) {
       logger.error('Browser health check failed:', error.message);
       // Notify administrators
     }
   }, 3600000); // Every hour
   ```

### Handling Memory Leaks

If the application's memory usage increases over time:

1. Implement a process restart strategy:
   ```javascript
   // In your main application file
   const memoryLimit = 1024 * 1024 * 1024; // 1GB
   
   setInterval(() => {
     const memUsage = process.memoryUsage();
     if (memUsage.rss > memoryLimit) {
       logger.warn(`Memory limit exceeded (${Math.round(memUsage.rss / 1024 / 1024)}MB), restarting...`);
       process.exit(0); // PM2 or similar should restart the process
     }
   }, 60000); // Check every minute
   ```

2. Ensure all browser instances are being properly closed:
   ```javascript
   let browser = null;
   try {
     browser = await chromium.launch();
     // Use browser...
   } finally {
     if (browser) {
       try {
         await browser.close();
       } catch (closeError) {
         logger.error('Error closing browser:', closeError.message);
       }
     }
   }
   ```

## System Monitoring

### Process Monitoring

Use PM2 to monitor the application:

```bash
# View process status
pm2 status

# Monitor logs and metrics
pm2 monit

# View logs
pm2 logs bubblemaps-bot
```

### Resource Monitoring

Set up monitoring for system resources:

```bash
# Install node-problem-detector (example)
npm install -g node-problem-detector

# Run the detector
npd --memory-threshold=90 --cpu-threshold=80
```

## Automatic Restarts

Configure automatic restarts if the application crashes or becomes unresponsive:

### Using PM2

```bash
# Configure PM2 to restart on memory threshold
pm2 start src/index.js --name bubblemaps-bot --max-memory-restart 1G

# Configure to restart on file changes (for development)
pm2 start src/index.js --name bubblemaps-bot --watch

# Configure to restart on crashes
pm2 start src/index.js --name bubblemaps-bot --max-restarts 10
```

### Using Docker

```bash
# Configure Docker to restart on crashes
docker run -d --name bubblemaps-bot \
  --restart unless-stopped \
  -e TELEGRAM_BOT_TOKEN=your_token \
  -e MONGODB_URI=mongodb://mongo:27017/bubblemaps-bot \
  bubblemaps-bot
```

## Updating Dependencies

Regularly update dependencies to get security patches and bug fixes:

```bash
# Check for outdated packages
npm outdated

# Update packages
npm update

# Update a specific package (e.g., Playwright)
npm install playwright@latest
```

After updating Playwright, reinstall browsers:

```bash
npx playwright install chromium
```

## Screenshot Service Management

### Modal Handling

The screenshot service uses advanced DOM manipulation to handle modals and popups:

```javascript
// Modal removal strategies in screenshotService.js
try {
  await page.evaluate(() => {
    // Strategy 1: Remove by specific selectors
    const popup = document.querySelector('.mdc-dialog__surface[role="alertdialog"]');
    const backdrop = document.querySelector('.mdc-dialog__scrim');
    if (popup) popup.remove();
    if (backdrop) backdrop.remove();
    
    // Strategy 2: Remove all dialog elements
    document.querySelectorAll('.mdc-dialog').forEach(dialog => dialog.remove());
    
    // Strategy 3: Clean up dialog styles
    document.body.style.overflow = '';
    document.body.style.position = '';
  });
} catch (error) {
  logger.warn('Modal removal failed:', error.message);
}
```

### Screenshot Optimization

For better screenshot quality and performance:

1. Browser configuration:
```javascript
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  userAgent: 'Mozilla/5.0 (Macintosh; Apple Silicon Mac OS X 14_0) AppleWebKit/537.36',
  ignoreHTTPSErrors: true
});
```

2. Screenshot parameters:
```javascript
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
```

### Troubleshooting Screenshots

If screenshots are failing:

1. Check browser logs:
```bash
tail -f logs/playwright.log
```

2. Enable verbose logging:
```javascript
const browser = await chromium.launch({
  logger: {
    isEnabled: (name, severity) => severity === 'verbose',
    log: (name, severity, message) => logger.debug(`${name} ${message}`)
  }
});
```

3. Verify screenshot directory permissions:
```bash
# Check permissions
ls -la screenshots/

# Fix permissions if needed
chown -R node:node screenshots/
chmod 755 screenshots/
```

## Troubleshooting

### Bot Not Responding

If the bot stops responding to messages:

1. Check if the process is running:
   ```bash
   pm2 status
   # or
   ps aux | grep node
   ```

2. Check Telegram API status:
   ```bash
   curl -s https://api.telegram.org/bot<token>/getMe | json_pp
   ```

3. Check for errors in logs:
   ```bash
   tail -n 100 logs/error.log
   ```

### Screenshot Issues

If screenshots are failing:

1. Check Playwright logs:
   ```bash
   tail -n 100 logs/playwright.log
   ```

2. Try running the diagnostic script:
   ```bash
   node scripts/test-playwright.js
   ```

3. Verify that Chromium is installed correctly:
   ```bash
   npx playwright install chromium --dry-run
   ```

4. Check for system resources (memory, disk space):
   ```bash
   free -h
   df -h
   ```

### Connection Errors

For database or external API connection issues:

1. Check network connectivity:
   ```bash
   ping mongodb.example.com
   curl -I https://api.bubblemaps.io
   ```

2. Verify firewall settings:
   ```bash
   sudo iptables -L
   ```

3. Check for rate limiting in API logs.

## Backup and Recovery

### Application Backup

Regularly back up the entire application:

```bash
# Create a tarball of the application
tar -zcvf /backup/bubblemaps-bot-$(date +%Y-%m-%d).tar.gz \
  --exclude node_modules \
  --exclude logs \
  --exclude screenshots \
  /path/to/bubblemaps-bot
```

### Recovery Plan

In case of complete failure:

1. Set up a new server with Node.js and MongoDB
2. Restore the application from backup
3. Restore the database from the latest backup
4. Install dependencies and Playwright browsers
5. Start the application

## Security Maintenance

### Dependency Scanning

Regularly scan for vulnerable dependencies:

```bash
npm audit

# Fix vulnerabilities automatically where possible
npm audit fix
```

### Token Rotation

Periodically rotate your Telegram Bot token for security:

1. Go to BotFather in Telegram
2. Use the `/revoke` command to get a new token
3. Update your `.env` file with the new token
4. Restart the application 