# Telegram Bot Usage Guide

This document provides a comprehensive guide on how to use the BubbleMaps Telegram Bot, including all available commands and example usage scenarios.

## Getting Started

To start using the bot, search for it on Telegram and start a conversation.

### Basic Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/start` | Initialize the bot and get a welcome message | `/start` |
| `/help` | Display available commands and their usage | `/help` |
| `/check <address>` | Check information for a specific token | `/check 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48` |
| `/chain <chain_id>` | Set your preferred blockchain | `/chain eth` |
| `/stats` | View bot statistics (admin only) | `/stats` |

## Checking Token Information

### Quick Check: Just Send the Contract Address

The simplest way to check a token is to simply send its contract address directly to the bot:

```
0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48
```

The bot will process the address automatically, with no additional commands required.

### Automatic Solana Address Detection

For Solana tokens, the bot automatically detects the address format and processes it on the Solana chain without requiring any additional input:

```
EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

### Using the /check Command

The `/check` command provides the same functionality in command format:

```
/check 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48
```

### Using Inline Buttons

After checking a token, you'll receive interactive inline buttons that allow you to:
- Change the blockchain for the current token
- View more detailed information
- Refresh data
- Check other related tokens

Simply tap these buttons to perform the associated actions without typing additional commands.

### Setting Default Chain

If you frequently check tokens on a specific blockchain, you can set it as default:

```
/chain bsc
```

Available chain options:
- `eth` - Ethereum
- `bsc` - BNB Smart Chain
- `ftm` - Fantom
- `avax` - Avalanche
- `cro` - Cronos
- `arbi` - Arbitrum
- `poly` - Polygon
- `base` - Base
- `sol` - Solana (Auto-detected)
- `sonic` - Sonic

## Understanding the Results

After checking a token, the bot will return:

1. **Basic Token Information**
   - Token name and symbol
   - Current price and 24h change
   - Market capitalization
   - Trading volume

2. **Ownership Distribution Metrics**
   - Decentralization score
   - Number of holders
   - Distribution pattern

3. **Visualization Screenshot**
   - A bubble map showing ownership distribution
   - Larger bubbles represent wallets with more tokens
   - Connections between bubbles show relationships/transfers

4. **Interactive Buttons**
   - Change chain (analyze the same token on different blockchains)
   - View more details
   - Refresh data
   - Share token information

## Advanced Features

### Interactive Elements

The bot uses inline buttons for common actions:
- Changing the chain for the current token
- Viewing more detailed information
- Refreshing the data
- Direct links to BubbleMaps website

This provides a streamlined experience without needing to type commands repeatedly.

### Error Handling

If the bot cannot retrieve information for a token, it will provide a helpful error message explaining the issue, such as:
- Invalid contract address
- Token not found on the specified chain
- Token not yet indexed by BubbleMaps

## Administrative Features

These commands are only available to users listed in the `ADMIN_USER_IDS` environment variable.

### Statistics

View usage statistics with:
```
/stats
```

This provides information on:
- Total number of users
- Number of token checks in the last 24h/7d/30d
- Most frequently checked tokens
- Active users

### Broadcasting

Admins can send broadcast messages to all bot users:
1. Use the admin broadcast interface
2. Enter the message to send
3. Confirm to send to all users

## Troubleshooting

### Common Issues

1. **Bot not responding**
   - Ensure you have internet connectivity
   - Check if Telegram is functioning properly
   - The bot server might be down temporarily

2. **Invalid contract address error**
   - Double-check the address format
   - Verify the contract exists on the specified blockchain

3. **Chain not supported**
   - Ensure you're using one of the supported chain IDs
   - For custom chains, use the standard chain ID 