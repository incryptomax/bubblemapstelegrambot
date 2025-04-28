# Telegram BubbleMaps Architecture

## General Overview

The application is a Telegram bot that integrates with the BubbleMaps API to provide information about tokens, their distribution, and visualization through bubble maps. The bot is written in Node.js using various libraries, including node-telegram-bot-api for interacting with the Telegram API, mongoose for working with MongoDB, and Playwright for creating screenshots.

## Project Structure

```
bubblemapstelegramchecker/
├── config/              # Configuration files and constants
├── logs/                # Application logs
├── screenshots/         # Saved bubble maps screenshots
├── scripts/             # Scripts for various tasks
├── src/                 # Application source code
│   ├── handlers/        # Telegram command and message handlers
│   ├── models/          # Mongoose models for MongoDB
│   ├── services/        # Services for API interactions and other functions
│   │   ├── adminService.js          # Admin functions
│   │   ├── bubblemapsService.js     # BubbleMaps API integration
│   │   ├── marketDataService.js     # Market data retrieval
│   │   ├── screenshotService.js     # Playwright screenshot creation
│   │   └── userService.js           # User management
│   └── utils/           # Utilities and helper functions
│       ├── config.js               # Configuration loading
│       ├── formatters.js           # Data formatting for output
│       ├── logger.js               # Logging setup
│       ├── playwright-helper.js    # Playwright utilities
│       └── validation.js           # Input validation
└── test/                # Tests
```

## Main Components

### Telegram Bot

The central component of the application. The bot is initialized in `src/index.js` and sets up handlers for various commands and messages from users.

### Services

1. **bubblemapsService**: Interacts with the BubbleMaps API, retrieves token data and metadata.
2. **screenshotService**: Uses Playwright to create screenshots of bubble maps from the BubbleMaps web interface.
3. **marketDataService**: Retrieves market data about tokens (price, volume, market capitalization).
4. **userService**: Manages user data and tracks interactions.
5. **adminService**: Provides functionality for administrators (statistics, message broadcasts).

### Database

MongoDB is used to store information about users, their settings, and interactions with the bot.

### Playwright for Screenshots

Playwright is used to create bubble maps visualizations. This allows capturing screenshots of interactive charts that are displayed on the BubbleMaps web interface.

## Data Flows

1. User sends a command in Telegram
2. Telegram Bot API forwards the message to our bot
3. The bot processes the command through the appropriate handler in `handlers/`
4. The handler calls the necessary services to retrieve data
5. Data is formatted and sent back to the user

## Integrations

1. **Telegram Bot API**: Through node-telegram-bot-api
2. **BubbleMaps API**: For retrieving token data
3. **CoinGecko API**: For retrieving market data
4. **MongoDB**: For storing user data 