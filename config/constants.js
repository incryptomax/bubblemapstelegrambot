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
          "/check <contract_address> - Check a specific token\n" +
          "/chain <chain_name> - Set default chain (eth, bsc, etc.)\n\n" +
          "Available chains: eth, bsc, ftm, avax, cro, arbi, poly, base, sol, sonic",
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
    selectChain: "Please select a blockchain:"
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
    BROADCAST: "broadcast"
  }
}; 