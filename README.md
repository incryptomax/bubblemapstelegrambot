# BubbleMaps Telegram Bot

A Telegram bot that provides token information and bubble maps visualization from BubbleMaps. Get instant access to token ownership distribution, market data, and decentralization metrics directly in Telegram.

## Live Bot

You can find the bot on Telegram: [Bubble Maps Telegram Bot](https://t.me/bubblemapstelegrambot)

Current Version: v0.2.0-Alpha

## Features

- 🔍 Token information lookup by contract address
- 📊 Real-time market data (price, volume, market cap)
- 📈 Decentralization score and metrics
- 🗺️ Visual ownership distribution maps
- 🔄 Automatic chain detection for all supported networks
- ⚡ Support for multiple blockchain networks
- 📱 Intuitive Telegram interface
- 🔒 Admin controls and statistics

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

## Bot Commands

- `/start` - Initialize the bot
- `/help` - Display command list
- `/check <address>` - Analyze token by contract address
- `/stats` - View statistics (admin only)

## Development

### Prerequisites

- Node.js 16+
- MongoDB 4.4+
- Telegram Bot Token (from @BotFather)

### Project Structure

```
.
├── config/             # Configuration files
├── src/
│   ├── bot/          # Bot initialization
│   ├── handlers/     # Command handlers
│   ├── models/       # Database models
│   ├── services/     # Business logic
│   └── utils/        # Utilities
├── docs/             # Documentation
└── assets/           # Static assets
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