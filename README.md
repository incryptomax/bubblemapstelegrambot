# BubbleMaps Telegram Bot

A Telegram bot that provides token information and bubble maps visualization from BubbleMaps. Get instant access to token ownership distribution, market data, and decentralization metrics directly in Telegram.

## Live Bot

You can find the bot on Telegram: [BubbleMaps Telegram Bot](https://t.me/bubblemapstelegrambot)

Current Version: v1.1.0-Beta

## Features

- 🔍 Token information lookup by contract address
- 📊 Real-time market data (price, volume, market cap)
- 📈 Decentralization score and metrics
- 🗺️ Visual ownership distribution maps
- 🔄 Automatic chain detection for all supported networks
- ⚡ Support for multiple blockchain networks
- 📱 Intuitive Telegram interface with seamless navigation
- 📊 Community statistics for tracking popular tokens and chains
- 🔍 Trending tokens analytics for the last 3 days
- 🔒 Admin controls and statistics
- 📣 Mass message broadcasting system
- 💬 Direct contract address input in chat
- 📝 Comprehensive logging system
- ⭐️ Favorites system to save and quickly access tokens
- 🕒 Recently viewed tokens history
- 🚀 Optimized performance for faster token lookups


## Supported Networks

- Ethereum (ETH) - Auto-detected
- BNB Smart Chain (BSC) - Auto-detected
- Fantom (FTM) - Auto-detected
- Avalanche (AVAX) - Auto-detected
- Cronos (CRO) - Auto-detected
- Arbitrum (ARBI) - Auto-detected
- Polygon (POLY) - Auto-detected
- Base (BASE) - Auto-detected
- Solana (SOL) - Auto-detected
- Sonic (SONIC) - Auto-detected

## Quick Start

1. Clone the repository:
```bash
git clone https://github.com/incryptomax/bubblemapstelegrambot.git
cd bubblemapstelegrambot
```

2. Install dependencies:
```bash
npm install
npx playwright install chromium
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your settings
```

4. Start the bot:
```bash
npm start
```

## How to Use

The bot is designed to be simple and intuitive. There are several ways to check tokens:

1. **Direct Contract Input**: Simply paste any contract address directly in the chat, and the bot will automatically detect the network and return token information
2. **Command**: Use the `/check <address>` command
3. **Button Interface**: Click the "Check a token" button and follow the prompts
4. **Community Statistics**: Use the `/topstat` command or click the "Community Statistics" button to view popular tokens and trends

## Key Features

### Token Analysis
- Automatic blockchain detection for any contract address
- Decentralization score and metrics visualization
- Top holders identification and distribution analysis
- Market data integration (price, volume, market cap)
- Direct links to BubbleMaps for deeper analysis

### Community Statistics
- View most checked tokens across all users
- See popular blockchain networks with percentage visualization
- Discover trending tokens from the last 3 days
- Click through to detailed statistics views

### User Management
- Save favorite tokens for quick access
- View recently checked tokens history
- Intuitive navigation with back buttons at every level

## Docker Deployment

Deploy using Docker Compose:

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f bot

# Stop services
docker-compose down
```

## Configuration

### Required Environment Variables

```bash
TELEGRAM_BOT_TOKEN=   # Your Telegram bot token from @BotFather
MONGODB_URI=         # MongoDB connection URI
ADMIN_USER_IDS=     # Comma-separated Telegram user IDs for admin access
```

### Optional Settings

```bash
LOG_LEVEL=info      # Logging level (debug, info, warn, error)
PLAYWRIGHT_TIMEOUT=60000       # Screenshot timeout (ms)
NAVIGATION_TIMEOUT=120000      # Page navigation timeout (ms)
STABILIZATION_TIME=25000      # Page stabilization wait time (ms)
```

## Logging System

The bot features a comprehensive logging system that provides detailed insights into operations:

### Log Levels

- **DEBUG**: Detailed diagnostic information for development
- **INFO**: General operational information about normal system activity
- **WARN**: Warning conditions that might require attention
- **ERROR**: Error conditions preventing normal operations

### Logging Features

- **Structured Logging**: JSON-formatted logs for easy parsing and analysis
- **Rotation**: Automatic log file rotation to manage disk space
- **User Tracking**: All user interactions are logged with unique identifiers
- **Error Capture**: Detailed error capturing with stack traces
- **Performance Metrics**: Timing information for critical operations
- **Chain Detection Logs**: Detailed logs of the chain detection process

### Log Directory Structure

```
logs/
  ├── combined.log     # All log entries
  ├── error.log        # Error-level entries only
  ├── debug-YYYY-MM-DD.log  # Daily rotated debug logs
  └── exceptions.log   # Uncaught exceptions
```

To view logs in real-time during development:

```bash
tail -f logs/combined.log
```

## Bot Commands

### User Commands
- `/start` - Initialize the bot and display main menu
- `/help` - Display command list and usage instructions
- `/check <address>` - Analyze token by contract address
- `/favorites` - View and manage your saved tokens
- `/recent` - View your recently checked tokens history
- `/topstat` - Access community token statistics and trends

### Admin Commands
- `/stats` - View detailed usage statistics and metrics
- `/broadcast` - Send a message to all bot users (mass communication)

## Admin Features

The bot includes special features for administrators:

- **User Statistics**: View total users, active users, and interaction data
- **Broadcast System**: Send announcements, updates, or important information to all users
- **Usage Metrics**: Track which tokens are being analyzed most frequently
- **Chain Analytics**: See usage patterns across different blockchain networks

## Statistics Feature
The statistics feature provides insights into token usage across the community:

- **All-Time Top Tokens**: See which tokens have been checked the most since the bot launched
- **Popular Chains**: View blockchain networks ranked by usage with percentage visualization
- **Trending Tokens (3 Days)**: Discover tokens gaining popularity specifically in the last 3 days

The main statistics page shows a summary, and you can click on buttons to view more detailed information for each category. Each token in the statistics is hyperlinked to BubbleMaps for easy access to detailed token information.

## Enhanced Navigation
The bot features an intuitive navigation system with:
- Back buttons at every menu level
- Direct links between related screens
- Logical menu hierarchy for easy exploration
- Context-aware button labels with information counts

## Development

### Prerequisites

- Node.js 16+
- MongoDB 4.4+
- Telegram Bot Token (from @BotFather)

## Project Structure

```
.
├── config/         # Configuration files
├── src/
│   ├── handlers/   # Command and callback handlers
│   ├── models/     # Database models
│   ├── services/   # Business logic and API integrations
│   ├── utils/      # Utility modules (validation, formatting, logging, etc.)
│   └── assets/     # Fallback images and static assets for the bot
├── logs/           # Application logs
├── screenshots/    # Generated screenshots for tokens
├── Dockerfile      # Docker configuration
├── docker-compose.yml # Docker Compose configuration
├── package.json    # Project metadata and dependencies
├── README.md       # Project overview and instructions
└── ...             # Other files
```

## Author

[incryptomax](https://github.com/incryptomax)

## License

This project is licensed under the MIT License.

```
MIT License

Copyright (c) 2024 incryptomax

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Acknowledgments
- [BubbleMaps](https://app.bubblemaps.io/) for the token visualization data
- [CoinGecko](https://www.coingecko.com/) for market data integration
- [Playwright](https://playwright.dev/) for reliable web automation
- [Telegraf](https://telegraf.js.org/) for the Telegram Bot framework

### Token Information
- Check token information by sending a contract address
- View decentralization score, supply distribution, and top holders
- Get market data (price, market cap, volume)
- Automatically detects blockchain for EVM addresses
- Supports multiple blockchains: ETH, BSC, FTM, AVAX, CRO, ARBI, POLY, BASE, SOL, SONIC
