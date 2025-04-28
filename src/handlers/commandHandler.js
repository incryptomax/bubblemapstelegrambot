const constants = require('../../config/constants');
const validation = require('../utils/validation');
const logger = require('../utils/logger');
const userService = require('../services/userService');
const adminService = require('../services/adminService');
const bubblemapsService = require('../services/bubblemapsService');
const formatters = require('../utils/formatters');
const marketDataService = require('../services/marketDataService');
const screenshotService = require('../services/screenshotService');
const tokenRatingService = require('../services/tokenRatingService');
const statisticsService = require('../services/statisticsService');

/**
 * Handle /start command
 * @param {Object} bot - Telegram bot instance
 * @param {Object} msg - Telegram message object
 * @param {Object} user - User document
 */
async function handleStart(bot, msg, user) {
  const chatId = msg.chat.id;
  
  try {
    // Track the interaction
    await userService.trackInteraction(user, constants.interactionTypes.START);
    
    // Send welcome message with inline keyboard
    const keyboard = {
      inline_keyboard: [
        [
          { text: 'Check a token', callback_data: 'check_token' },
        ],
        [
          { text: '⭐️ Favorites', callback_data: 'favorites' },
          { text: '🕒 Recent', callback_data: 'recent' }
        ],
        [
          { text: '📊 Community Statistics', callback_data: 'back_to_stats' }
        ],
        [
          { text: 'Help', callback_data: 'help' }
        ]
      ]
    };
    
    await bot.sendMessage(chatId, constants.messages.welcome, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
    
    logger.info(`User ${user.telegramId} started the bot`);
  } catch (error) {
    logger.error(`Error handling /start command for user ${user.telegramId}:`, error.message);
    await bot.sendMessage(chatId, constants.messages.error);
  }
}

/**
 * Handle /help command
 * @param {Object} bot - Telegram bot instance
 * @param {Object} msg - Telegram message object
 * @param {Object} user - User document
 */
async function handleHelp(bot, msg, user) {
  const chatId = msg.chat.id;
  
  try {
    // Track the interaction
    await userService.trackInteraction(user, constants.interactionTypes.HELP);
    
    // Send help message
    await bot.sendMessage(chatId, constants.messages.help, {
      parse_mode: 'Markdown'
    });
    
    logger.info(`User ${user.telegramId} requested help`);
  } catch (error) {
    logger.error(`Error handling /help command for user ${user.telegramId}: ${error.message}`);
    
    // Try to send a plain text version if Markdown parsing fails
    try {
      // Create a plain text version of the help message by removing Markdown
      const plainHelp = constants.messages.help
        .replace(/\*/g, '')  // Remove asterisks
        .replace(/`/g, '');  // Remove backticks
      
      await bot.sendMessage(chatId, plainHelp);
    } catch (secondError) {
      // If even that fails, send a very simple message
      try {
        await bot.sendMessage(chatId, 
          "🔍 Bubblemaps Token Checker Help\n\n" +
          "Send me a token contract address to check its information.\n" +
          "Commands: /start, /help, /check");
      } catch (finalError) {
        logger.error(`Failed to send any help message to user ${user.telegramId}: ${finalError.message}`);
      }
    }
  }
}

/**
 * Handle /check command
 * @param {Object} bot - Telegram bot instance
 * @param {Object} msg - Telegram message object
 * @param {Object} user - User document
 * @param {Array} args - Command arguments
 */
async function handleCheck(bot, msg, user, args) {
  const chatId = msg.chat.id;
  
  try {
    // Check if contract address is provided
    let contractAddress = args.length > 0 ? validation.extractContractAddress(args[0]) : null;
    
    if (!contractAddress) {
      // Prompt user to enter contract address
      await userService.updateUserState(user, 'awaiting_contract');
      
      await bot.sendMessage(chatId, 'Please enter the contract address you want to check:');
      return;
    }
    
    // Send processing message for EVM addresses as chain detection takes time
    let processingMsg = null;
    if (contractAddress.startsWith('0x')) {
      processingMsg = await bot.sendMessage(chatId, 'Detecting chain for this address...');
    }
    
    // Process the contract check
    await processContractCheck(bot, chatId, user, contractAddress, null, processingMsg);
  } catch (error) {
    logger.error(`Error handling /check command for user ${user.telegramId}:`, error.message);
    await bot.sendMessage(chatId, constants.messages.error);
  }
}

/**
 * Handle /chain command
 * @param {Object} bot - Telegram bot instance
 * @param {Object} msg - Telegram message object
 * @param {Object} user - User document
 * @param {Array} args - Command arguments
 */
async function handleChain(bot, msg, user, args) {
  const chatId = msg.chat.id;
  
  try {
    // Check if chain is provided
    if (args.length > 0) {
      const chain = args[0].toLowerCase();
      
      if (validation.isValidChain(chain)) {
        await userService.updatePreferredChain(user, chain);
        
        // Track interaction
        await userService.trackInteraction(user, constants.interactionTypes.CHANGE_CHAIN, { chain });
        
        // Confirm chain change
        const chainName = constants.chains.find(c => c.id === chain)?.name || chain.toUpperCase();
        await bot.sendMessage(chatId, `${constants.messages.chainSet}${chainName}`);
        
        logger.info(`User ${user.telegramId} changed chain to ${chain}`);
      } else {
        // Send error message with available chains
        const availableChains = constants.chains.map(c => c.id).join(', ');
        await bot.sendMessage(chatId, `Invalid chain. Available chains: ${availableChains}`);
      }
      return;
    }
    
    // No chain provided, show chain selection keyboard
    await showChainSelection(bot, chatId, user);
  } catch (error) {
    logger.error(`Error handling /chain command for user ${user.telegramId}:`, error.message);
    await bot.sendMessage(chatId, constants.messages.error);
  }
}

/**
 * Handle /stats command (admin only)
 * @param {Object} bot - Telegram bot instance
 * @param {Object} msg - Telegram message object
 * @param {Object} user - User document
 */
async function handleStats(bot, msg, user) {
  const chatId = msg.chat.id;
  
  try {
    // Check if user is admin
    if (!user.isAdmin) {
      await bot.sendMessage(chatId, constants.messages.adminOnly);
      return;
    }
    
    // Track interaction
    await userService.trackInteraction(user, constants.interactionTypes.STATS);
    
    // Send processing message
    const processingMsg = await bot.sendMessage(chatId, 'Fetching statistics...');
    
    // Get system stats
    const systemStats = await adminService.getSystemStats();
    
    // Format stats
    const statsMessage = formatters.formatUserStats(systemStats.userStats);
    
    // Send stats
    await bot.sendMessage(chatId, statsMessage, {
      parse_mode: 'Markdown'
    });
    
    // Cleanup processing message
    await bot.deleteMessage(chatId, processingMsg.message_id);
    
    logger.info(`Admin ${user.telegramId} requested stats`);
  } catch (error) {
    logger.error(`Error handling /stats command for user ${user.telegramId}:`, error.message);
    await bot.sendMessage(chatId, constants.messages.error);
  }
}

/**
 * Handle /broadcast command (admin only)
 * @param {Object} bot - Telegram bot instance
 * @param {Object} msg - Telegram message object
 * @param {Object} user - User document
 * @param {Array} args - Command arguments
 */
async function handleBroadcast(bot, msg, user, args) {
  const chatId = msg.chat.id;
  
  try {
    // Check if user is admin
    if (!user.isAdmin) {
      await bot.sendMessage(chatId, constants.messages.adminOnly);
      return;
    }
    
    // Set user state to awaiting broadcast message
    await userService.updateUserState(user, 'awaiting_broadcast_message');
    
    // Send instruction without the cancel button
    await bot.sendMessage(chatId, constants.messages.broadcastInit);
    
    logger.info(`Admin ${user.telegramId} initiated broadcast`);
  } catch (error) {
    logger.error(`Error handling /broadcast command for user ${user.telegramId}:`, error.message);
    await bot.sendMessage(chatId, constants.messages.error);
  }
}

/**
 * Handle /favorites command
 * @param {Object} bot - Telegram bot instance
 * @param {Object} msg - Telegram message object
 * @param {Object} user - User document
 */
async function handleFavorites(bot, msg, user) {
  const chatId = msg.chat.id;
  
  try {
    // Track the interaction
    await userService.trackInteraction(user, constants.interactionTypes.VIEW_FAVORITES);
    
    // Get user's favorites
    const favorites = await userService.getFavorites(user);
    
    if (favorites.length === 0) {
      await bot.sendMessage(chatId, constants.messages.noFavorites, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "⬅️ Back to Menu", callback_data: "start" }]
          ]
        }
      });
      return;
    }
    
    // Create keyboard with favorites
    const keyboard = {
      inline_keyboard: favorites.map(fav => {
        const displayName = fav.name && fav.symbol 
          ? `${fav.name} (${fav.symbol})`
          : `${fav.contractAddress.substring(0, 8)}...`;
          
        return [{
          text: `${displayName} on ${fav.chain.toUpperCase()}`,
          callback_data: `check_token:${fav.chain}:${fav.contractAddress}`
        }];
      })
    };
    
    // Add a "manage favorites" button at the bottom
    keyboard.inline_keyboard.push([
      { text: "Manage Favorites", callback_data: "manage_favorites" }
    ]);
    
    // Add a "back to menu" button
    keyboard.inline_keyboard.push([
      { text: "⬅️ Back to Menu", callback_data: "start" }
    ]);
    
    await bot.sendMessage(chatId, constants.messages.favoritesTitle, {
      reply_markup: keyboard
    });
    
    logger.info(`User ${user.telegramId} viewed favorites`);
  } catch (error) {
    logger.error(`Error handling /favorites command for user ${user.telegramId}:`, error.message);
    await bot.sendMessage(chatId, constants.messages.error);
  }
}

/**
 * Handle /recent command
 * @param {Object} bot - Telegram bot instance
 * @param {Object} msg - Telegram message object
 * @param {Object} user - User document
 */
async function handleRecent(bot, msg, user) {
  const chatId = msg.chat.id;
  
  try {
    // Track the interaction
    await userService.trackInteraction(user, constants.interactionTypes.VIEW_RECENT);
    
    // Get user's recently checked tokens
    const recentTokens = await userService.getRecentlyChecked(user);
    
    if (recentTokens.length === 0) {
      await bot.sendMessage(chatId, constants.messages.noRecent, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "⬅️ Back to Menu", callback_data: "start" }]
          ]
        }
      });
      return;
    }
    
    // Create keyboard with recent tokens
    const keyboard = {
      inline_keyboard: recentTokens.map(token => {
        const displayName = token.name && token.symbol 
          ? `${token.name} (${token.symbol})`
          : `${token.contractAddress.substring(0, 8)}...`;
        
        return [{
          text: `${displayName} on ${token.chain.toUpperCase()}`,
          callback_data: `check_token:${token.chain}:${token.contractAddress}`
        }];
      })
    };
    
    // Add a "back to menu" button
    keyboard.inline_keyboard.push([
      { text: "⬅️ Back to Menu", callback_data: "start" }
    ]);
    
    await bot.sendMessage(chatId, constants.messages.recentTitle, {
      reply_markup: keyboard
    });
    
    logger.info(`User ${user.telegramId} viewed recent tokens`);
  } catch (error) {
    logger.error(`Error handling /recent command for user ${user.telegramId}:`, error.message);
    await bot.sendMessage(chatId, constants.messages.error);
  }
}

/**
 * Handle /topstat command
 * @param {Object} bot - Telegram bot instance
 * @param {Object} msg - Telegram message object
 * @param {Object} user - User document
 */
async function handleTopStat(bot, msg, user) {
  const chatId = msg.chat.id;
  
  try {
    // Track the interaction
    await userService.trackInteraction(user, constants.interactionTypes.VIEW_STATS);
    
    // Send processing message
    const processingMsg = await bot.sendMessage(chatId, 'Fetching community statistics...');
    
    // Get public statistics
    const stats = await statisticsService.getPublicStats();
    
    // Format statistics message
    const statsMessage = formatters.formatPublicStats(stats);
    
    // Create keyboard with options to view specific rankings
    const keyboard = {
      inline_keyboard: [
        [
          { text: `🔝 All-Time Top (${stats.topTokens.length})`, callback_data: 'view_top_tokens' },
          { text: `⛓️ Chains (${stats.popularChains.length})`, callback_data: 'view_popular_chains' }
        ],
        [
          { text: `🔥 Trending 3d (${stats.trendingTokens.length})`, callback_data: 'view_trending_tokens' }
        ],
        [
          { text: "⬅️ Back to Menu", callback_data: "start" }
        ]
      ]
    };
    
    // Delete processing message
    await bot.deleteMessage(chatId, processingMsg.message_id).catch(() => {});
    
    // Send statistics
    await bot.sendMessage(chatId, statsMessage, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
      disable_web_page_preview: true // Disable web page previews for links
    });
    
    logger.info(`User ${user.telegramId} viewed public statistics`);
  } catch (error) {
    logger.error(`Error handling /topstat command for user ${user.telegramId}:`, error.message);
    await bot.sendMessage(chatId, constants.messages.error);
  }
}

/**
 * Process a contract check
 * @param {Object} bot - Telegram bot instance
 * @param {number} chatId - Chat ID
 * @param {Object} user - User document
 * @param {string} contractAddress - Contract address
 * @param {string} chain - Chain ID (optional, will be auto-detected if null)
 * @param {Object} processingMsg - Processing message object (optional)
 */
async function processContractCheck(bot, chatId, user, contractAddress, chain, processingMsg = null) {
  try {
    // Validate contract address
    if (!validation.isValidContractAddress(contractAddress)) {
      if (processingMsg) await bot.deleteMessage(chatId, processingMsg.message_id);
      await bot.sendMessage(chatId, constants.messages.invalidContract);
      return;
    }
    
    // Auto-detect chain if not provided
    let chainToUse = chain;
    let isAutoDetected = false;
    
    if (!chainToUse) {
      if (contractAddress.startsWith('0x')) {
        // For EVM addresses, use the multi-chain detection
        chainToUse = await validation.detectEVMChain(contractAddress);
        isAutoDetected = true;
      } else {
        // For Solana addresses
        chainToUse = 'sol';
        isAutoDetected = true;
      }
    }
    
    // If chain was null and we couldn't detect, use user's preferred chain
    if (!chainToUse) {
      chainToUse = user.preferredChain;
    }
    
    // Update processing message or create one if not provided
    if (processingMsg) {
      await bot.editMessageText(constants.messages.processing, {
        chat_id: chatId,
        message_id: processingMsg.message_id
      });
    } else {
      processingMsg = await bot.sendMessage(chatId, constants.messages.processing);
    }
    
    // Track the interaction
    await userService.trackInteraction(user, constants.interactionTypes.CHECK_TOKEN, {
      token: contractAddress,
      chain: chainToUse
    });
    
    // Check if token is available in Bubblemaps
    const isValid = await bubblemapsService.validateContract(contractAddress, chainToUse);
    
    if (!isValid) {
      await bot.deleteMessage(chatId, processingMsg.message_id);
      await bot.sendMessage(chatId, constants.messages.dataNotAvailable);
      return;
    }
    
    try {
      // Fetch token data and market data first
      const [mapData, metaData, marketData] = await Promise.all([
        bubblemapsService.getTokenMapData(contractAddress, chainToUse),
        bubblemapsService.getTokenMetadata(contractAddress, chainToUse),
        marketDataService.getTokenMarketData(contractAddress, chainToUse)
      ]);
      
      // Generate the bubble map URL
      const mapUrl = bubblemapsService.generateMapUrl(contractAddress, chainToUse);
      
      // Format the token info message
      const tokenInfo = formatters.formatTokenInfo(mapData, metaData, chainToUse, marketData);
      
      // Update recently checked tokens
      await userService.updateRecentlyChecked(
        user, 
        contractAddress, 
        chainToUse, 
        metaData.name || '', 
        metaData.symbol || ''
      );
      
      // Check if token is in favorites
      const isInFavorites = userService.isInFavorites(user, contractAddress, chainToUse);
      
      // Create favorite button
      const favoriteButton = {
        text: isInFavorites ? "⭐️ Remove from Favorites" : "☆ Add to Favorites",
        callback_data: `toggle_favorite:${chainToUse}:${contractAddress}`
      };
      
      // Create reply markup with favorites button
      const replyMarkup = {
        inline_keyboard: [
          [{ text: 'View on BubbleMaps', url: mapUrl }],
          [favoriteButton],
          [
            { text: 'Check Another Token', callback_data: 'check_token' },
            { text: 'Recent Tokens', callback_data: 'recent' }
          ],
          [{ text: '🏠 Back to Menu', callback_data: 'start' }]
        ]
      };
      
      // Delete processing message
      await bot.deleteMessage(chatId, processingMsg.message_id).catch(err => {
        logger.warn(`Error deleting processing message: ${err.message}`);
      });

      try {
        // Get the screenshot using the screenshot service
        const screenshotBuffer = await screenshotService.captureMapScreenshot(contractAddress, chainToUse);
        
        if (screenshotBuffer) {
          // Send the screenshot with token info as caption
          await bot.sendPhoto(chatId, screenshotBuffer, {
            caption: tokenInfo,
            parse_mode: 'Markdown',
            reply_markup: replyMarkup
          });
        } else {
          // If screenshot failed, send text-only message
          await bot.sendMessage(chatId, tokenInfo, {
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
            reply_markup: replyMarkup
          });
        }
      } catch (screenshotError) {
        logger.error(`Error with screenshot: ${screenshotError.message}`);
        
        // If screenshot fails, send text-only message
        await bot.sendMessage(chatId, tokenInfo, {
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
          reply_markup: replyMarkup
        });
      }
      
      logger.info(`User ${user.telegramId} checked token ${contractAddress} on chain ${chainToUse}`);
    } catch (dataError) {
      logger.error(`Error fetching token data: ${dataError.message}`);
      await bot.deleteMessage(chatId, processingMsg.message_id).catch(() => {});
      await bot.sendMessage(chatId, constants.messages.tokenDataError);
    }
  } catch (error) {
    logger.error(`Error processing contract check for user ${user.telegramId}:`, error.message);
    await bot.sendMessage(chatId, constants.messages.error);
  }
}

/**
 * Show chain selection keyboard
 * @param {Object} bot - Telegram bot instance
 * @param {number} chatId - Chat ID
 * @param {Object} user - User document
 */
async function showChainSelection(bot, chatId, user) {
  try {
    // Build chain selection keyboard
    const keyboard = {
      inline_keyboard: constants.chains.map(chain => {
        return [{ text: chain.name, callback_data: `set_chain:${chain.id}` }];
      })
    };
    
    // Add a back button
    keyboard.inline_keyboard.push([
      { text: "⬅️ Back to Menu", callback_data: "start" }
    ]);
    
    // Set user state
    await userService.updateUserState(user, 'awaiting_chain');
    
    // Send message with keyboard
    await bot.sendMessage(chatId, constants.messages.selectChain, {
      reply_markup: keyboard
    });
    
    logger.info(`Showed chain selection to user ${user.telegramId}`);
  } catch (error) {
    logger.error(`Error showing chain selection to user ${user.telegramId}:`, error.message);
    await bot.sendMessage(chatId, constants.messages.error);
  }
}

module.exports = {
  handleStart,
  handleHelp,
  handleCheck,
  handleChain,
  handleStats,
  handleBroadcast,
  handleFavorites,
  handleRecent,
  handleTopStat,
  processContractCheck,
  showChainSelection
}; 