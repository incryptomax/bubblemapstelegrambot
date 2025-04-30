const moment = require('moment');
const constants = require('../../config/constants');

/**
 * Format top rated tokens for preview display in statistics overview
 * @param {Array} tokens - Array of token rating objects
 * @param {number} limit - Number of tokens to display
 * @returns {string} - Formatted tokens string
 */
function formatTopRatedTokensPreview(tokens, limit = 3) {
  if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
    return 'None';
  }
  
  return tokens.slice(0, limit).map((token, index) => {
    const shortAddress = `${token.contractAddress.substring(0, 6)}...${token.contractAddress.substring(token.contractAddress.length - 4)}`;
    
    // Create ticker display if symbol is available
    const ticker = token.symbol ? ` ${token.symbol}` : '';
    
    // Create hyperlink to BubbleMaps
    const mapUrl = `${constants.endpoints.bubblemapsUrl}${token.chain}/token/${token.contractAddress}`;
    
    const likeRatio = token.likesCount > 0 
      ? `👍 ${token.likesCount} · 👎 ${token.dislikesCount}`
      : 'No ratings yet';
    
    return `${index + 1}. [${shortAddress}${ticker}](${mapUrl}) (${token.chain.toUpperCase()}) - ${likeRatio}`;
  }).join('\n');
}

/**
 * Format popular chains for brief display
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
    
    // Add token symbol if available
    const ticker = token.symbol ? ` ${token.symbol}` : '';
    
    return `${index + 1}. [${shortAddress}${ticker}](${mapUrl}) (${token.chain.toUpperCase()}): ${token.checkCount} checks`;
  }).join('\n');
}

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
 * Formatting utilities for bot responses
 */
module.exports = {
  /**
   * Format token information for display
   * @param {Object} mapData - Map data from Bubblemaps API
   * @param {Object} metaData - Metadata from Bubblemaps API
   * @param {string} chain - Chain ID
   * @param {Object} marketData - Market data from CoinGecko (optional)
   * @param {Object} ratingData - Token rating data (optional)
   * @param {string} userRating - User's rating for this token (optional)
   * @returns {string} - Formatted message
   */
  formatTokenInfo: (mapData, metaData, chain, marketData = null, ratingData = null, userRating = null) => {
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
    if (marketData && marketData.price && marketData.price > 0) {
      message += `💰 *Market Data:*\n` +
                `*Price:* $${marketData.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}\n` +
                `*24h:* ${marketData.price_change_24h > 0 ? '🟢' : '🔴'} ${marketData.price_change_24h.toFixed(2)}%\n` +
                `*Market Cap:* $${marketData.market_cap ? marketData.market_cap.toLocaleString('en-US', { maximumFractionDigits: 0 }) : 'N/A'}\n` +
                `*24h Volume:* $${marketData.volume_24h ? marketData.volume_24h.toLocaleString('en-US', { maximumFractionDigits: 0 }) : 'N/A'}\n\n`;
    }
    
    // Add community rating if available
    if (ratingData) {
      const totalVotes = ratingData.likesCount + ratingData.dislikesCount;
      const likePercentage = totalVotes > 0 ? Math.round((ratingData.likesCount / totalVotes) * 100) : 0;
      const dislikePercentage = totalVotes > 0 ? Math.round((ratingData.dislikesCount / totalVotes) * 100) : 0;
      
      // Add user's current rating if available
      let userRatingText = '';
      if (userRating === 'like') {
        userRatingText = ' (You liked this token)';
      } else if (userRating === 'dislike') {
        userRatingText = ' (You disliked this token)';
      }
      
      message += `👥 *Community Rating:*${userRatingText}\n` +
                `👍 ${ratingData.likesCount} (${likePercentage}%) | 👎 ${ratingData.dislikesCount} (${dislikePercentage}%)\n\n`;
    }
    
    // Add supply distribution data
    message += `📊 *Supply Distribution:*\n` +
              `*CEXs:* ${cexPercent.toFixed(2)}%\n` +
              `*Contracts:* ${contractPercent.toFixed(2)}%\n` +
              `*Other Wallets:* ${(100 - cexPercent - contractPercent).toFixed(2)}%\n\n`;
    
    // Add top holders
    message += `🔝 *Top Holders:*\n${topHolders}\n\n`;
    
    // Add last updated info
    message += `🕒 *Last updated:* ${updateDate}`;
    
    return message;
  },
  
  /**
   * Format brief token information for group chats
   * @param {Object} mapData - Map data from Bubblemaps API
   * @param {Object} metaData - Metadata from Bubblemaps API
   * @param {string} chain - Chain ID
   * @param {Object} marketData - Market data from CoinGecko (optional)
   * @returns {string} - Formatted brief message
   */
  formatBriefTokenInfo: (mapData, metaData, chain, marketData = null) => {
    if (!mapData || !metaData) {
      return 'No data available';
    }
    
    // Extract basic token info
    const { token_address, full_name, symbol, dt_update } = mapData;
    const { decentralisation_score, identified_supply } = metaData;
    
    // Get top 3 holders for concise display
    let topHolders = '';
    if (mapData.nodes && mapData.nodes.length > 0) {
      const sortedNodes = [...mapData.nodes]
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 3);
        
      topHolders = sortedNodes.map((node, idx) => {
        const name = node.name || `Wallet ${idx + 1}`;
        return `${name}: ${node.percentage.toFixed(2)}%`;
      }).join(' | ');
    }
    
    // Format CEX info
    const cexPercent = identified_supply?.percent_in_cexs || 0;
    
    // Build enhanced message with better formatting
    let message = `*${full_name || 'Unknown Token'} (${symbol || '???'})*\n`;
    message += `Chain: ${chain.toUpperCase()} | Score: ${decentralisation_score ? decentralisation_score.toFixed(2) : 'N/A'}/100\n\n`;
    
    // Add market data if available (in an improved format)
    if (marketData && marketData.price && marketData.price > 0) {
      const priceChange = marketData.price_change_24h || 0;
      const priceChangeIcon = priceChange > 0 ? '🟢' : priceChange < 0 ? '🔴' : '⚪';
      const priceFormatOptions = marketData.price < 0.01 
        ? { minimumFractionDigits: 6, maximumFractionDigits: 8 }
        : { minimumFractionDigits: 2, maximumFractionDigits: 4 };
      
      message += `💰 *Price:* $${marketData.price.toLocaleString('en-US', priceFormatOptions)}\n`;
      message += `${priceChangeIcon} *24h:* ${priceChange.toFixed(2)}%\n\n`;
    }
    
    // Add distribution data in a more visually appealing format
    message += `📊 *Distribution:*\n`;
    message += `CEXs: ${cexPercent.toFixed(2)}%\n`;
    
    // Format top holders in a cleaner way
    if (topHolders) {
      const holderLines = topHolders.split(' | ').map(holder => `• ${holder}`);
      message += `*Top Holders:*\n${holderLines.join('\n')}`;
    }
    
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
   * Format group statistics for admin view
   * @param {Object} stats - Group statistics object
   * @returns {string} - Formatted message
   */
  formatGroupStats: (stats) => {
    if (!stats) {
      return 'No group statistics available';
    }

    let message = `*📊 Community Statistics*\n\n` +
                  `*Groups:*\n` +
                  `- Total: ${stats.totalGroups || 0}\n` +
                  `- Active (7d): ${stats.activeGroups || 0}\n\n` +
                  `*Activity:*\n` +
                  `- Total Checks: ${stats.totalChecks.toLocaleString() || 0}\n` +
                  `- Today: ${stats.todayChecks.toLocaleString() || 0}\n\n`;

    // Add top groups section
    if (stats.topGroups && stats.topGroups.length > 0) {
      message += `*Top Active Communities:*\n`;
      
      stats.topGroups.forEach((group, index) => {
        const groupName = group.name || 'Unknown Group';
        const groupUsername = group.username ? `@${group.username}` : '';
        const lastActive = moment(group.lastActivity).fromNow();
        
        message += `${index + 1}. ${groupName} ${groupUsername}\n` +
                  `   👁️ ${group.tokensChecked} checks • Last active: ${lastActive}\n`;
      });
    }

    return message;
  },

  /**
   * Format full system statistics including users and groups
   * @param {Object} systemStats - System statistics object
   * @returns {string} - Formatted message
   */
  formatSystemStats: (systemStats) => {
    if (!systemStats) {
      return 'No system statistics available';
    }

    let userStatsText = '';
    if (systemStats.userStats) {
      userStatsText = `*👤 Users:*\n` +
                     `- Total: ${systemStats.userStats.totalUsers || 0}\n` +
                     `- Active (24h): ${systemStats.userStats.activeUsers || 0}\n`;
    }


    let activityStatsText = '';
    if (systemStats.userStats || systemStats.groupStats) {
      const totalUserChecks = systemStats.userStats ? systemStats.userStats.tokensChecked || 0 : 0;
      const totalGroupChecks = systemStats.groupStats ? systemStats.groupStats.totalChecks || 0 : 0;
      const todayUserChecks = systemStats.userStats ? systemStats.userStats.todayInteractions || 0 : 0;
      const todayGroupChecks = systemStats.groupStats ? systemStats.groupStats.todayChecks || 0 : 0;
      
      activityStatsText = `*📈 Activity:*\n` +
                         `- Total Checks: ${(totalUserChecks + totalGroupChecks).toLocaleString()}\n` +
                         `- Today: ${(todayUserChecks + todayGroupChecks).toLocaleString()}\n`;
    }

    return `*🤖 Bot System Statistics*\n\n` +
           userStatsText + '\n' +
           activityStatsText;
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
           `*Top Rated by Community:*\n${formatTopRatedTokensPreview(stats.topRatedTokens, 3)}\n\n` +
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
      
      // Add token symbol if available
      const ticker = token.symbol ? ` ${token.symbol}` : '';
      
      // Create hyperlink to BubbleMaps
      const mapUrl = `${constants.endpoints.bubblemapsUrl}${token.chain}/token/${token.token}`;
      
      message += `*${index + 1}.* [${shortAddress}${ticker}](${mapUrl}) on ${token.chain.toUpperCase()}\n` +
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
      
      // Add token symbol if available
      const ticker = token.symbol ? ` ${token.symbol}` : '';
      
      message += `*${index + 1}.* [${shortAddress}${ticker}](${mapUrl}) on ${token.chain.toUpperCase()}\n` +
                 `   🔥 ${token.checkCount} recent checks (last 3 days)\n`;
    });
    
    return message;
  },
  
  /**
   * Format top rated tokens for display
   * @param {Array} tokens - Array of token rating objects
   * @returns {string} - Formatted message
   */
  formatTopRatedTokens: (tokens) => {
    if (!tokens || tokens.length === 0) {
      return 'No token rating data available';
    }
    
    let message = `*🏆 Top Rated Tokens by Community*\n\n`;
    
    tokens.forEach((token, index) => {
      const shortAddress = `${token.contractAddress.substring(0, 6)}...${token.contractAddress.substring(token.contractAddress.length - 4)}`;
      
      // Add token symbol if available
      const ticker = token.symbol ? ` ${token.symbol}` : '';
      
      // Create hyperlink to BubbleMaps
      const mapUrl = `${constants.endpoints.bubblemapsUrl}${token.chain}/token/${token.contractAddress}`;
      
      const totalVotes = token.likesCount + token.dislikesCount;
      const likePercentage = totalVotes > 0 ? Math.round((token.likesCount / totalVotes) * 100) : 0;
      
      message += `*${index + 1}.* [${shortAddress}${ticker}](${mapUrl}) on ${token.chain.toUpperCase()}\n` +
                 `   👍 ${token.likesCount} · 👎 ${token.dislikesCount} · Approval: ${likePercentage}%\n`;
    });
    
    return message;
  },
  
  /**
   * Format top rated tokens for preview display in statistics overview
   * @param {Array} tokens - Array of token rating objects
   * @param {number} limit - Number of tokens to display
   * @returns {string} - Formatted tokens string
   */
  formatTopRatedTokensPreview: formatTopRatedTokensPreview,
  
  /**
   * Format user list for admin view
   * @param {Array} users - Array of user objects
   * @returns {string} - Formatted message with user list
   */
  formatUserList: (users) => {
    if (!users || !Array.isArray(users) || users.length === 0) {
      return 'No users available';
    }
    
    // Use minimal formatting to avoid Telegram parsing errors
    let message = `*👥 User List (${users.length} users)*\n\n`;
    
    users.forEach((user, index) => {
      try {
        // Safely extract user data - escape any markdown special characters
        const displayUsername = user.username ? 
          `@${user.username.replace(/([_*[\]()~`>#+=|{}.!-])/g, '\\$1')}` : 
          'No username';
        
        // Escape special markdown characters in names
        const firstName = user.firstName ? user.firstName.replace(/([_*[\]()~`>#+=|{}.!-])/g, '\\$1') : '';
        const lastName = user.lastName ? user.lastName.replace(/([_*[\]()~`>#+=|{}.!-])/g, '\\$1') : '';
        const displayName = `${firstName} ${lastName}`.trim() || 'No name';
        
        const lastActive = user.lastActivity ? moment(user.lastActivity).fromNow() : 'Unknown';
        const activeStatus = user.isActive ? '✅' : '❌';
        const adminStatus = user.isAdmin ? '👑' : '';
        
        // Build the user entry with simple formatting, avoiding complex markdown
        message += `${index + 1}\\. `; // Escape the period to avoid list formatting
        
        if (adminStatus) {
          message += `${adminStatus} `;
        }
        
        // Use simple plain text with double spaces to create visual separation
        message += `${activeStatus} ${displayName}\n`;
        message += `  🆔 ID: ${user.telegramId || 'Unknown'}\n`;
        message += `  👤 Username: ${displayUsername}\n`;
        message += `  🕒 Last active: ${lastActive}\n`;
        
        // Add separator between users except for the last one
        if (index < users.length - 1) {
          message += `\n`;
        }
      } catch (error) {
        // If formatting a specific user fails, log it and continue with a placeholder
        console.error(`Error formatting user at index ${index}:`, error);
        message += `${index + 1}\\. ⚠️ Error displaying user\n\n`;
      }
    });
    
    return message;
  }
}; 