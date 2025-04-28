const moment = require('moment');
const constants = require('../../config/constants');

/**
 * Formatting utilities for bot responses
 */
module.exports = {
  /**
   * Format token information for display
   * @param {Object} mapData - Map data from Bubblemaps API
   * @param {Object} metaData - Metadata from Bubblemaps API
   * @param {string} chain - Chain ID
   * @param {Object} marketData - Market data from CoinGecko (optional)
   * @returns {string} - Formatted message
   */
  formatTokenInfo: (mapData, metaData, chain, marketData = null) => {
    if (!mapData || !metaData) {
      return 'No data available';
    }
    
    // Extract basic token info
    const { token_address, full_name, symbol, dt_update } = mapData;
    const { decentralisation_score, identified_supply } = metaData;
    
    // Format update date
    const updateDate = moment(dt_update || metaData.dt_update).format('YYYY-MM-DD HH:mm');
    
    // Format top holders
    let topHolders = '';
    if (mapData.nodes && mapData.nodes.length > 0) {
      const sortedNodes = [...mapData.nodes]
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 5);
        
      topHolders = sortedNodes.map((node, idx) => {
        const name = node.name || `Address ${node.address.slice(0, 6)}...${node.address.slice(-4)}`;
        return `${idx + 1}. ${name}: ${node.percentage.toFixed(2)}%`;
      }).join('\n');
    }
    
    // Format supply info
    const cexPercent = identified_supply?.percent_in_cexs || 0;
    const contractPercent = identified_supply?.percent_in_contracts || 0;
    
    // Build basic message
    let message = `*${full_name || 'Unknown Token'} (${symbol || '???'})*\n\n` +
                  `*Contract:* \`${token_address}\`\n` +
                  `*Chain:* ${chain.toUpperCase()}\n` +
                  `*Decentralization Score:* ${decentralisation_score ? decentralisation_score.toFixed(2) : 'N/A'}/100\n\n`;
    
    // Add market data if available
    if (marketData && marketData.market_data) {
      const md = marketData.market_data;
      
      // Format price
      const usdPrice = md.current_price?.usd || null;
      const formattedPrice = usdPrice ? formatCurrency(usdPrice) : 'N/A';
      
      // Format market cap
      const marketCap = md.market_cap?.usd || null;
      const formattedMarketCap = marketCap ? formatLargeNumber(marketCap) : 'N/A';
      
      // Format 24h volume
      const volume24h = md.total_volume?.usd || null;
      const formattedVolume = volume24h ? formatLargeNumber(volume24h) : 'N/A';
      
      // Format price change
      const priceChange24h = md.price_change_percentage_24h || null;
      const priceChangeSymbol = priceChange24h >= 0 ? '📈' : '📉';
      const formattedPriceChange = priceChange24h ? `${priceChangeSymbol} ${Math.abs(priceChange24h).toFixed(2)}%` : 'N/A';
      
      message += `*Market Data:*\n` +
                 `- Price: $${formattedPrice}\n` +
                 `- 24h Change: ${formattedPriceChange}\n` +
                 `- Market Cap: $${formattedMarketCap}\n` +
                 `- 24h Volume: $${formattedVolume}\n\n`;
    }
    
    // Add supply info
    message += `*Supply Distribution:*\n` +
               `- In CEXs: ${cexPercent.toFixed(2)}%\n` +
               `- In Contracts: ${contractPercent.toFixed(2)}%\n` +
               `- Other: ${(100 - cexPercent - contractPercent).toFixed(2)}%\n\n` +
               `*Top Holders:*\n${topHolders}\n\n` +
               `*Last Updated:* ${updateDate}`;
               
    return message;
  },
  
  /**
   * Format user statistics
   * @param {Object} stats - User statistics object
   * @returns {string} - Formatted message
   */
  formatUserStats: (stats) => {
    if (!stats) {
      return 'No statistics available';
    }
    
    return `*Bot Statistics*\n\n` +
           `*Users:*\n` +
           `- Total: ${stats.totalUsers || 0}\n` +
           `- Active (24h): ${stats.activeUsers || 0}\n\n` +
           `*Interactions:*\n` +
           `- Total: ${stats.totalInteractions || 0}\n` +
           `- Today: ${stats.todayInteractions || 0}\n\n` +
           `*Tokens Checked:*\n` +
           `- Total: ${stats.tokensChecked || 0}\n` +
           `- Unique: ${stats.uniqueTokens || 0}\n\n` +
           `*Popular Chains:*\n${formatPopularChains(stats.popularChains)}`;
  },

  /**
   * Format public statistics for display
   * @param {Object} stats - Public statistics data
   * @returns {string} - Formatted message
   */
  formatPublicStats: (stats) => {
    if (!stats) {
      return 'No statistics available';
    }
    
    return `*📊 Community Statistics*\n\n` +
           `*Activity:*\n` +
           `- Total Token Checks: ${stats.totalChecks.toLocaleString()}\n\n` +
           `*Top 3 Chains:*\n${formatTopChains(stats.popularChains, 3)}\n\n` +
           `*Most Checked Tokens (All Time):*\n${formatTopTokens(stats.topTokens, 3)}\n\n` +
           `*Trending Tokens (Last 3 Days):*\n${formatTopTokens(stats.trendingTokens, 3)}\n\n` +
           `Use the buttons below to see more detailed statistics!`;
  },
  
  /**
   * Format top tokens for display
   * @param {Array} tokens - Array of token objects
   * @returns {string} - Formatted message
   */
  formatTopTokensList: (tokens) => {
    if (!tokens || tokens.length === 0) {
      return 'No token data available';
    }
    
    let message = `*🔝 Most Checked Tokens (All Time)*\n\n`;
    
    tokens.forEach((token, index) => {
      const shortAddress = `${token.token.substring(0, 6)}...${token.token.substring(token.token.length - 4)}`;
      const lastChecked = moment(token.lastChecked).fromNow();
      // Create hyperlink to BubbleMaps
      const mapUrl = `${constants.endpoints.bubblemapsUrl}${token.chain}/token/${token.token}`;
      
      message += `*${index + 1}.* [${shortAddress}](${mapUrl}) on ${token.chain.toUpperCase()}\n` +
                 `   👁️ ${token.checkCount} total checks • Last: ${lastChecked}\n`;
    });
    
    return message;
  },
  
  /**
   * Format popular chains for display
   * @param {Array} chains - Array of chain objects
   * @returns {string} - Formatted message
   */
  formatPopularChainsList: (chains) => {
    if (!chains || chains.length === 0) {
      return 'No chain data available';
    }
    
    let message = `*⛓️ Popular Blockchain Networks*\n\n`;
    
    // Calculate total checks for percentage
    const totalChecks = chains.reduce((sum, chain) => sum + chain.checkCount, 0);
    
    chains.forEach((chain, index) => {
      const percentage = ((chain.checkCount / totalChecks) * 100).toFixed(1);
      const barLength = Math.round(percentage / 5); // 20 bars would be 100%
      const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);
      
      message += `*${index + 1}.* ${chain.name}\n` +
                 `   ${bar} ${percentage}% (${chain.checkCount} checks)\n`;
    });
    
    return message;
  },
  
  /**
   * Format trending tokens for display
   * @param {Array} tokens - Array of token objects
   * @returns {string} - Formatted message
   */
  formatTrendingTokens: (tokens) => {
    if (!tokens || tokens.length === 0) {
      return 'No trending tokens data available';
    }
    
    let message = `*🔥 Trending Tokens (Last 3 Days)*\n\n`;
    
    tokens.forEach((token, index) => {
      const shortAddress = `${token.token.substring(0, 6)}...${token.token.substring(token.token.length - 4)}`;
      // Create hyperlink to BubbleMaps
      const mapUrl = `${constants.endpoints.bubblemapsUrl}${token.chain}/token/${token.token}`;
      
      message += `*${index + 1}.* [${shortAddress}](${mapUrl}) on ${token.chain.toUpperCase()}\n` +
                 `   🔥 ${token.checkCount} recent checks (last 3 days)\n`;
    });
    
    return message;
  }
};

/**
 * Format popular chains for display
 * @param {Array} chains - Array of chain objects with count
 * @returns {string} - Formatted chains string
 */
function formatPopularChains(chains) {
  if (!chains || !Array.isArray(chains) || chains.length === 0) {
    return 'None';
  }
  
  return chains.map(chain => `- ${chain.id.toUpperCase()}: ${chain.count}`).join('\n');
}

/**
 * Format currency values with appropriate precision
 * @param {number} value - Currency value
 * @returns {string} - Formatted currency string
 */
function formatCurrency(value) {
  if (value === null || value === undefined) return 'N/A';
  
  // For values less than 0.01
  if (value < 0.01) {
    return value.toExponential(2);
  }
  
  // For values less than 1
  if (value < 1) {
    return value.toFixed(4);
  }
  
  // For values less than 100
  if (value < 100) {
    return value.toFixed(2);
  }
  
  // For values greater than 100
  return value.toLocaleString('en-US', {
    maximumFractionDigits: 0
  });
}

/**
 * Format large numbers with K, M, B, T suffixes
 * @param {number} value - Number to format
 * @returns {string} - Formatted number string
 */
function formatLargeNumber(value) {
  if (value === null || value === undefined) return 'N/A';
  
  if (value >= 1e12) {
    return (value / 1e12).toFixed(2) + 'T';
  }
  
  if (value >= 1e9) {
    return (value / 1e9).toFixed(2) + 'B';
  }
  
  if (value >= 1e6) {
    return (value / 1e6).toFixed(2) + 'M';
  }
  
  if (value >= 1e3) {
    return (value / 1e3).toFixed(2) + 'K';
  }
  
  return value.toLocaleString('en-US');
}

/**
 * Format top chains for brief display
 * @param {Array} chains - Array of chain objects
 * @param {number} limit - Number of chains to display
 * @returns {string} - Formatted chains string
 */
function formatTopChains(chains, limit = 3) {
  if (!chains || !Array.isArray(chains) || chains.length === 0) {
    return 'None';
  }
  
  return chains.slice(0, limit).map((chain, index) => 
    `${index + 1}. ${chain.name}: ${chain.checkCount} checks`
  ).join('\n');
}

/**
 * Format top tokens for brief display
 * @param {Array} tokens - Array of token objects
 * @param {number} limit - Number of tokens to display
 * @returns {string} - Formatted tokens string
 */
function formatTopTokens(tokens, limit = 3) {
  if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
    return 'None';
  }
  
  return tokens.slice(0, limit).map((token, index) => {
    const shortAddress = `${token.token.substring(0, 6)}...${token.token.substring(token.token.length - 4)}`;
    // Create hyperlink to BubbleMaps
    const mapUrl = `${constants.endpoints.bubblemapsUrl}${token.chain}/token/${token.token}`;
    return `${index + 1}. [${shortAddress}](${mapUrl}) (${token.chain.toUpperCase()}): ${token.checkCount} checks`;
  }).join('\n');
} 