# BubbleMaps Telegram Bot

A powerful Telegram bot that provides instant token information and bubble maps visualization from BubbleMaps. Get real-time access to token ownership distribution, market data, and decentralization metrics directly in Telegram, for both private chats and communities.

<p align="center">
  <a href="https://t.me/bubblemapstelegrambot">
    <img src="https://img.shields.io/badge/Telegram-Bot-blue?logo=telegram" alt="Telegram Bot">
  </a>
  <img src="https://img.shields.io/badge/Version-v1.2.0_Beta-green" alt="Version">
  <a href="https://github.com/incryptomax/bubblemapstelegrambot/blob/master/LICENSE">
    <img src="https://img.shields.io/github/license/incryptomax/bubblemapstelegrambot" alt="License">
  </a>
</p>

## 🌟 Features

### Token Analysis
- 🔍 One-click token lookup by pasting any contract address directly in chat
- 🔄 Automatic blockchain detection across all supported networks
- 📊 Real-time market data integration (price, volume, market cap)
- 📈 Decentralization score and metrics visualization
- 👥 Detailed top holders identification and distribution analysis
- 🖼️ Token ownership visualization with interactive bubble maps
- 🌐 Multi-chain support with seamless cross-chain analysis

### Community Features
- 👥 Bot can be setup in community chats for group token analysis
- 📊 Community statistics for tracking popular tokens and chains
- 🔥 Trending tokens analytics for the last 3 days
- 👍👎 Community rating system with like/dislike functionality
- 🏆 Top rated tokens by community voting
- 📣 Mass message broadcasting system for announcements

### User Experience
- ⭐️ Favorites system to save and quickly access tokens
- 🕒 Recently viewed tokens history
- 📱 Intuitive Telegram interface with seamless navigation
- 🚀 Optimized performance for faster token lookups

### Administration
- 🔒 Comprehensive admin dashboard with usage statistics
- 📋 User management tools
- 📝 Detailed logging system for monitoring bot activity

## 🔗 Supported Networks

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

## 🚀 Quick Start

1. **Find the Bot on Telegram**: [BubbleMaps Telegram Bot](https://t.me/bubblemapstelegrambot)
2. **Start a Chat**: Click "Start" to initiate the bot
3. **Check a Token**: Paste any contract address to get instant analysis

## 💻 Self-Hosted Deployment

### Prerequisites
- Node.js 16+
- MongoDB 4.4+
- Telegram Bot Token (from @BotFather)

### Installation Steps

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

### Docker Deployment

Deploy using Docker Compose:

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f bot

# Stop services
docker-compose down
```

## 🔧 Configuration

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

## 📱 How to Use

The bot is designed to be simple and intuitive:

1. **Direct Contract Input**: Paste any contract address directly in the chat
2. **Command**: Use the `/check <address>` command
3. **Button Interface**: Click the "Check a token" button and follow the prompts
4. **Community Statistics**: Use `/topstat` to view popular tokens and trends
5. **User Features**: Access `/favorites` and `/recent` to manage your token history

### Available Commands

**User Commands**
- `/start` - Initialize the bot and display main menu
- `/help` - Display command list and usage instructions
- `/check <address>` - Analyze token by contract address
- `/favorites` - View and manage your saved tokens
- `/recent` - View your recently checked tokens history
- `/topstat` - Access community token statistics and trends

**Admin Commands**
- `/stats` - View detailed usage statistics and metrics
- `/broadcast` - Send a message to all bot users

## 🌐 Adding the Bot to Communities

Adding the BubbleMaps Telegram Bot to your community enhances your group's capabilities for on-chain token analysis.

### Step 1: Add the Bot to Your Group

1. **Search for the Bot**: 
   - Search for [@bubblemapstelegrambot](https://t.me/bubblemapstelegrambot) in Telegram

2. **Add to Group**:
   - Start a chat with the bot and click the three dots (⋮) in the top right
   - Select "Add to Group" or "Add to Channel"
   - Choose your community from the list

### Step 2: Configure Bot Permissions

For optimal functionality, ensure the bot has these permissions:

- ✅ Send Messages
- ✅ Send Media
- ✅ Send Stickers & GIFs
- ✅ Embed Links

### Step 3: Pasting a contract address to get instant token analysis

### Community Features

- **Automatic Token Analysis**: Members can paste any contract address for instant analysis
- **Blockchain Auto-Detection**: No need to specify which network the token is on
- **Visual Representation**: Get bubble map screenshots directly in the group chat
- **Deep-Link Integration**: "Check more details" button for private analysis with the bot

## 📝 Logging System

The bot features a comprehensive logging system:

### Log Levels

- **DEBUG**: Detailed diagnostic information for development
- **INFO**: General operational information about normal system activity
- **WARN**: Warning conditions that might require attention
- **ERROR**: Error conditions preventing normal operations

### Log Directory Structure

```
logs/
  ├── combined.log     # All log entries
  ├── error.log        # Error-level entries only
  ├── debug-YYYY-MM-DD.log  # Daily rotated debug logs
  └── exceptions.log   # Uncaught exceptions
```

## 📁 Project Structure

```
.
├── config/         # Configuration files
├── src/
│   ├── handlers/   # Command and callback handlers
│   ├── models/     # Database models
│   ├── services/   # Business logic and API integrations
│   ├── utils/      # Utility modules
│   └── assets/     # Static assets for the bot
├── logs/           # Application logs
├── screenshots/    # Generated screenshots for tokens
├── Dockerfile      # Docker configuration
├── docker-compose.yml # Docker Compose configuration
└── package.json    # Project metadata and dependencies
```

## 👨‍💻 Author

[incryptomax](https://github.com/incryptomax)

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments
- [BubbleMaps](https://app.bubblemaps.io/) for the token visualization data
- [CoinGecko](https://www.coingecko.com/) for market data integration
- [Playwright](https://playwright.dev/) for reliable web automation
- [Telegraf](https://telegraf.js.org/) for the Telegram Bot framework

