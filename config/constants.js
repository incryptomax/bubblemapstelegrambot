/**
 * Application constants and messages
 */

module.exports = {
  // Bot messages
  messages: {
    welcome: "👋 Welcome to Bubblemaps Token Checker Bot!\n\nI can help you check token information and visualize ownership distribution through bubble maps. Just send me a token contract address to get started.",
    help: "🔍 *Bubblemaps Token Checker Bot Help*\n\n" +
          "Send me a token contract address to check its information, or use these commands:\n\n" +
          "/start - Start or restart the bot\n" +
          "/help - Show this help message\n" +
          "/check `<contract_address>` - Check a specific token\n" +
          "/favorites - View and manage your favorite tokens\n" +
          "/recent - See your recently checked tokens\n" +
          "/topstat - View community token statistics\n\n" +
          "The bot automatically detects which blockchain your token belongs to, supporting: ETH, BSC, FTM, AVAX, CRO, ARBI, POLY, BASE, SOL, SONIC.\n\n" +
          "📊 *Statistics Feature:*\n" +
          "Use /topstat to see popular tokens, chains, and trending tokens in the community. Click the buttons to view detailed lists of top tokens, popular chains, and trending tokens.",
    invalidContract: "❌ Invalid contract address. Please check the address and try again.",
    processing: "⏳ Processing your request...",
    error: "❌ An error occurred. Please try again later.",
    dataNotAvailable: "❌ Data not available for this token. It may not be computed by Bubblemaps yet.",
    screenshotError: "⚠️ Couldn't generate visualization image, but here's the token data:",
    tokenDataError: "❌ Error fetching token data. Please try again later.",
    chainSet: "✅ Default chain set to: ",
    adminOnly: "⚠️ This command is for admins only.",
    broadcastInit: "📣 Enter the message you want to broadcast to all users:",
    broadcastSent: "✅ Broadcast message sent to all users.",
    broadcastCancelled: "❌ Broadcast cancelled.",
    selectChain: "Please select a blockchain:",
    noFavorites: "You don't have any favorite tokens yet. Add tokens to your favorites by using the ⭐️ button after checking a token.",
    favoritesTitle: "⭐️ Your Favorite Tokens:",
    recentTitle: "🕒 Your Recently Checked Tokens:",
    noRecent: "You haven't checked any tokens yet. Send me a contract address to get started.",
    addedToFavorites: "✅ Added to favorites",
    removedFromFavorites: "❌ Removed from favorites",
    manageFavoritesTitle: "Select tokens to remove from your favorites:"
  },
  
  // Available chains
  chains: [
    { id: "eth", name: "Ethereum" },
    { id: "bsc", name: "BNB Smart Chain" },
    { id: "ftm", name: "Fantom" },
    { id: "avax", name: "Avalanche" },
    { id: "cro", name: "Cronos" },
    { id: "arbi", name: "Arbitrum" },
    { id: "poly", name: "Polygon" },
    { id: "base", name: "Base" },
    { id: "sol", name: "Solana" },
    { id: "sonic", name: "Sonic" }
  ],
  
  // Default settings
  defaultChain: "eth",
  
  // API endpoints
  endpoints: {
    mapData: "https://api-legacy.bubblemaps.io/map-data",
    mapMetadata: "https://api-legacy.bubblemaps.io/map-metadata",
    bubblemapsUrl: "https://app.bubblemaps.io/"
  },
  
  // User interaction types
  interactionTypes: {
    START: "start",
    HELP: "help",
    CHECK_TOKEN: "check_token",
    CHANGE_CHAIN: "change_chain",
    STATS: "stats",
    BROADCAST: "broadcast",
    ADD_FAVORITE: "add_favorite",
    REMOVE_FAVORITE: "remove_favorite",
    VIEW_FAVORITES: "view_favorites",
    VIEW_RECENT: "view_recent",
    VIEW_STATS: "view_stats"
  }
}; 