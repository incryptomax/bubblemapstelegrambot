# Docker Setup for Bubblemaps Telegram Bot

This guide explains how to set up and run the Bubblemaps Telegram Bot using Docker and docker-compose.

## Prerequisites

- Docker installed on your system
- Docker Compose installed on your system
- A valid Telegram Bot Token

## Quick Start

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd bubblemapstelegramchecker
   ```

2. Copy the example environment file and edit it with your settings:
   ```bash
   cp .env.example .env
   ```

3. Open the `.env` file and update the following variables:
   ```bash
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   ADMIN_USER_IDS=your_telegram_user_id
   ```

4. Build and start the containers:
   ```bash
   docker-compose up -d
   ```

5. Check the logs to ensure everything is running correctly:
   ```bash
   docker-compose logs -f
   ```

## Container Structure

The Docker setup includes:

- **bot**: The main application container running the Telegram bot with Playwright
- **mongodb**: Database container for storing user data and bot settings

## Data Persistence

The following data is persisted:

- MongoDB data is stored in a Docker volume (`mongodb_data`)
- Screenshots are stored in a local directory mounted to the container (`./screenshots`)

## Updating the Bot

To update the bot to the latest version:

1. Pull the latest code:
   ```bash
   git pull
   ```

2. Rebuild and restart the containers:
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

## Troubleshooting

### Playwright Issues

If you encounter issues with Playwright screenshots:

1. Check the container logs:
   ```bash
   docker-compose logs -f bot
   ```

2. Run the Playwright test script inside the container:
   ```bash
   docker-compose exec bot node scripts/check-playwright.js
   ```

3. If Playwright fails to install or run, you can try rebuilding the container:
   ```bash
   docker-compose build --no-cache bot
   docker-compose up -d
   ```

### Navigation Timeouts

If you see errors like "Timeout 60000ms exceeded" in the logs:

1. Increase the timeout values in docker-compose.yml:
   ```yaml
   environment:
     - PLAYWRIGHT_TIMEOUT=180000      # 3 minutes
     - NAVIGATION_TIMEOUT=180000      # 3 minutes
     - STABILIZATION_TIME=30000       # 30 seconds
   ```

2. Restart the containers:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

### Network Issues in Docker

If Playwright cannot connect to Bubblemaps or other external services:

1. Check DNS resolution inside the container:
   ```bash
   docker-compose exec bot nslookup app.bubblemaps.io
   ```

2. Test connectivity from inside the container:
   ```bash
   docker-compose exec bot curl -I https://app.bubblemaps.io
   ```

3. Add specific DNS and hosts configuration in docker-compose.yml:
   ```yaml
   dns:
     - 8.8.8.8
     - 8.8.4.4
   extra_hosts:
     - "app.bubblemaps.io:104.18.24.49"  # Replace with actual IP if needed
   ```

4. For persistent issues, try running the container with host network mode:
   ```yaml
   network_mode: "host"
   ```
   Note: This is less secure but can help bypass networking issues.

### MongoDB Connection Issues

If the bot can't connect to MongoDB:

1. Ensure MongoDB container is running:
   ```bash
   docker-compose ps
   ```

2. Check MongoDB logs:
   ```bash
   docker-compose logs mongodb
   ```

3. Verify the MongoDB connection string in docker-compose.yml:
   ```
   MONGODB_URI=mongodb://mongodb:27017/bubblemaps-bot
   ```

## Manual Testing

To test the screenshot functionality manually:

```bash
docker-compose exec bot node scripts/quick-screenshot.js 0xa00453052a36d43a99ac1ca145dfe4a952ca33b8 eth
```

## Advanced Configuration

### Changing MongoDB Port

If you need to change the MongoDB port, update the `docker-compose.yml` file:

```yaml
mongodb:
  ports:
    - "27018:27017"  # Change 27018 to your desired port
```

### Custom Chromium Path

If you need to specify a custom Chromium path:

```yaml
bot:
  environment:
    - PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chromium
```

### Changing Log Level

To change the log level (debug, info, warn, error):

```yaml
bot:
  environment:
    - LOG_LEVEL=debug
```

### Optimizing for Performance

For better performance in a production environment:

1. Use a volume for browser cache:
   ```yaml
   volumes:
     - ./screenshots:/app/screenshots
     - playwright-cache:/root/.cache/ms-playwright
   ```

2. Add resource limits to avoid container crashes:
   ```yaml
   deploy:
     resources:
       limits:
         memory: 2G
       reservations:
         memory: 1G
   ``` 