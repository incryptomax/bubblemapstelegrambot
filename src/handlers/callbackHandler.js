const logger = require('../utils/logger');
const userService = require('../services/userService');
const validation = require('../utils/validation');
const commandHandler = require('./commandHandler');
const adminHandler = require('./adminHandler');
const constants = require('../../config/constants');
const bubblemapsService = require('../services/bubblemapsService');
const tokenRatingService = require('../services/tokenRatingService');
const formatters = require('../utils/formatters');
const statisticsService = require('../services/statisticsService');

/**
 * Handle callback queries from inline keyboards
 * @param {Object} bot - Telegram bot instance
 * @param {Object} callbackQuery - Callback query object
 * @param {Object} user - User document
 */
async function handleCallback(bot, callbackQuery, user) {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const data = callbackQuery.data;
  
  try {
    logger.info(`Callback from user ${user.telegramId}: ${data}`);
    
    // Acknowledge the callback
    await bot.answerCallbackQuery(callbackQuery.id);
    
    // Handle the callback based on the data
    if (data === 'help') {
      await handleHelpCallback(bot, chatId, user);
    } else if (data === 'check_token') {
      await handleCheckTokenCallback(bot, chatId, user);
    } else if (data === 'admin_broadcast') {
      await adminHandler.handleBroadcast(bot, callbackQuery.message, user);
    } else if (data === 'admin_stats') {
      await adminHandler.handleStats(bot, callbackQuery.message, user);
    } else if (data === 'favorites') {
      await handleFavoritesCallback(bot, chatId, user);
    } else if (data === 'recent') {
      await handleRecentCallback(bot, chatId, user);
    } else if (data === 'manage_favorites') {
      await handleManageFavoritesCallback(bot, chatId, user);
    } else if (data === 'view_top_tokens') {
      await handleViewTopTokensCallback(bot, chatId, user);
    } else if (data === 'view_popular_chains') {
      await handleViewPopularChainsCallback(bot, chatId, user);
    } else if (data === 'view_trending_tokens') {
      await handleViewTrendingTokensCallback(bot, chatId, user);
    } else if (data === 'start') {
      await handleStartCallback(bot, chatId, user);
    } else if (data.startsWith('toggle_favorite:')) {
      await handleToggleFavoriteCallback(bot, chatId, user, data);
    } else if (data.startsWith('remove_favorite:')) {
      await handleRemoveFavoriteCallback(bot, chatId, user, data);
    } else if (data.startsWith('check_token:')) {
      const parts = data.split(':');
      if (parts.length === 3) {
        const chain = parts[1];
        const contractAddress = parts[2];
        await commandHandler.processContractCheck(bot, chatId, user, contractAddress, chain);
      }
    } else if (data.startsWith('set_chain:')) {
      const chain = data.split(':')[1];
      await handleSetChainCallback(bot, chatId, user, chain);
    } else if (data === 'back_to_stats') {
      await handleBackToStatsCallback(bot, chatId, user);
    } else {
      logger.warn(`Unknown callback data from user ${user.telegramId}: ${data}`);
    }
  } catch (error) {
    logger.error(`Error handling callback for user ${user.telegramId}: ${error.message}`);
    await bot.sendMessage(chatId, constants.messages.error);
  }
}

/**
 * Handle help callback
 * @param {Object} bot - Telegram bot instance
 * @param {number} chatId - Chat ID
 * @param {Object} user - User document
 */
async function handleHelpCallback(bot, chatId, user) {
  try {
    // Track the interaction
    await userService.trackInteraction(user, constants.interactionTypes.HELP);
    
    // Create keyboard with back button
    const keyboard = {
      inline_keyboard: [
        [{ text: "⬅️ Back to Menu", callback_data: "start" }]
      ]
    };
    
    // Send help message
    await bot.sendMessage(chatId, constants.messages.help, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
    
    logger.info(`User ${user.telegramId} requested help via callback`);
  } catch (error) {
    logger.error(`Error handling help callback for user ${user.telegramId}: ${error.message}`);
    
    // Try to send a simplified message if the markdown parsing fails
    try {
      await bot.sendMessage(chatId, "Sorry, there was an error displaying the help message. Please try using the /help command instead.");
    } catch (secondError) {
      logger.error(`Failed to send error message to user ${user.telegramId}: ${secondError.message}`);
    }
  }
}

/**
 * Handle check token callback
 * @param {Object} bot - Telegram bot instance
 * @param {number} chatId - Chat ID
 * @param {Object} user - User document
 */
async function handleCheckTokenCallback(bot, chatId, user) {
  try {
    // Set user state to awaiting contract
    await userService.updateUserState(user, 'awaiting_contract');
    
    // Create keyboard with back button
    const keyboard = {
      inline_keyboard: [
        [{ text: "⬅️ Back to Menu", callback_data: "start" }]
      ]
    };
    
    // Prompt for contract address
    await bot.sendMessage(chatId, 'Please enter the contract address you want to check:', {
      reply_markup: keyboard
    });
    
    logger.info(`User ${user.telegramId} initiated token check via callback`);
  } catch (error) {
    logger.error(`Error handling check_token callback for user ${user.telegramId}: ${error.message}`);
    
    // Send a simple error message
    try {
      await bot.sendMessage(chatId, "There was an error processing your request. Please try again.");
    } catch (secondError) {
      logger.error(`Failed to send error message to user ${user.telegramId}: ${secondError.message}`);
    }
  }
}

/**
 * Handle favorites callback
 * @param {Object} bot - Telegram bot instance
 * @param {number} chatId - Chat ID
 * @param {Object} user - User document
 */
async function handleFavoritesCallback(bot, chatId, user) {
  try {
    // Just call the command handler function
    await commandHandler.handleFavorites(bot, { chat: { id: chatId } }, user);
  } catch (error) {
    logger.error(`Error handling favorites callback for user ${user.telegramId}: ${error.message}`);
    await bot.sendMessage(chatId, constants.messages.error);
  }
}

/**
 * Handle recent tokens callback
 * @param {Object} bot - Telegram bot instance
 * @param {number} chatId - Chat ID
 * @param {Object} user - User document
 */
async function handleRecentCallback(bot, chatId, user) {
  try {
    // Just call the command handler function
    await commandHandler.handleRecent(bot, { chat: { id: chatId } }, user);
  } catch (error) {
    logger.error(`Error handling recent callback for user ${user.telegramId}: ${error.message}`);
    await bot.sendMessage(chatId, constants.messages.error);
  }
}

/**
 * Handle toggle favorite callback
 * @param {Object} bot - Telegram bot instance
 * @param {number} chatId - Chat ID
 * @param {Object} user - User document
 * @param {string} data - Callback data
 */
async function handleToggleFavoriteCallback(bot, chatId, user, data) {
  try {
    const [_, chain, contractAddress] = data.split(':');
    
    // Check if token is already in favorites
    const isInFavorites = userService.isInFavorites(user, contractAddress, chain);
    
    let message;
    
    if (isInFavorites) {
      // Remove from favorites
      await userService.removeFromFavorites(user, contractAddress, chain);
      message = constants.messages.removedFromFavorites;
    } else {
      // Add to favorites - first get token metadata
      try {
        const metaData = await bubblemapsService.getTokenMetadata(contractAddress, chain);
        await userService.addToFavorites(user, contractAddress, chain, metaData.name || '', metaData.symbol || '');
        message = constants.messages.addedToFavorites;
      } catch (metaError) {
        // If error fetching metadata, add with empty name/symbol
        logger.error(`Error fetching token metadata for favorites: ${metaError.message}`);
        await userService.addToFavorites(user, contractAddress, chain, '', '');
        message = constants.messages.addedToFavorites;
      }
    }
    
    // Send confirmation message
    await bot.sendMessage(chatId, message);
    
    logger.info(`User ${user.telegramId} toggled favorite status for ${contractAddress} on ${chain}`);
  } catch (error) {
    logger.error(`Error handling toggle_favorite callback for user ${user.telegramId}: ${error.message}`);
    await bot.sendMessage(chatId, constants.messages.error);
  }
}

/**
 * Handle manage favorites callback
 * @param {Object} bot - Telegram bot instance
 * @param {number} chatId - Chat ID
 * @param {Object} user - User document
 */
async function handleManageFavoritesCallback(bot, chatId, user) {
  try {
    // Get user's favorites
    const favorites = await userService.getFavorites(user);
    
    if (favorites.length === 0) {
      await bot.sendMessage(chatId, constants.messages.noFavorites);
      return;
    }
    
    // Create keyboard with favorites that can be removed
    const keyboard = {
      inline_keyboard: favorites.map(fav => {
        const displayName = fav.name && fav.symbol 
          ? `${fav.name} (${fav.symbol})`
          : `${fav.contractAddress.substring(0, 8)}...`;
          
        return [{
          text: `❌ ${displayName} on ${fav.chain.toUpperCase()}`,
          callback_data: `remove_favorite:${fav.chain}:${fav.contractAddress}`
        }];
      })
    };
    
    // Add a "done" button at the bottom
    keyboard.inline_keyboard.push([
      { text: "Done", callback_data: "favorites" }
    ]);
    
    await bot.sendMessage(chatId, constants.messages.manageFavoritesTitle, {
      reply_markup: keyboard
    });
    
    logger.info(`User ${user.telegramId} accessed manage favorites`);
  } catch (error) {
    logger.error(`Error handling manage_favorites callback for user ${user.telegramId}: ${error.message}`);
    await bot.sendMessage(chatId, constants.messages.error);
  }
}

/**
 * Handle remove favorite callback
 * @param {Object} bot - Telegram bot instance
 * @param {number} chatId - Chat ID
 * @param {Object} user - User document
 * @param {string} data - Callback data
 */
async function handleRemoveFavoriteCallback(bot, chatId, user, data) {
  try {
    const [_, chain, contractAddress] = data.split(':');
    
    // Remove from favorites
    await userService.removeFromFavorites(user, contractAddress, chain);
    
    // Send confirmation message
    await bot.sendMessage(chatId, constants.messages.removedFromFavorites);
    
    // Show updated manage favorites view
    await handleManageFavoritesCallback(bot, chatId, user);
    
    logger.info(`User ${user.telegramId} removed ${contractAddress} on ${chain} from favorites`);
  } catch (error) {
    logger.error(`Error handling remove_favorite callback for user ${user.telegramId}: ${error.message}`);
    await bot.sendMessage(chatId, constants.messages.error);
  }
}

/**
 * Handle set chain callback
 * @param {Object} bot - Telegram bot instance
 * @param {number} chatId - Chat ID
 * @param {Object} user - User document
 * @param {string} chain - Chain ID
 */
async function handleSetChainCallback(bot, chatId, user, chain) {
  try {
    // Validate chain
    if (!validation.isValidChain(chain)) {
      await bot.sendMessage(chatId, 'Invalid chain selected. Please try again.');
      return;
    }
    
    // Update user's preferred chain
    await userService.updatePreferredChain(user, chain);
    
    // Track interaction
    await userService.trackInteraction(user, constants.interactionTypes.CHANGE_CHAIN, { chain });
    
    // Reset user state
    await userService.updateUserState(user, 'idle');
    
    // Confirm chain change
    const chainName = constants.chains.find(c => c.id === chain)?.name || chain.toUpperCase();
    await bot.sendMessage(chatId, `${constants.messages.chainSet}${chainName}`);
    
    logger.info(`User ${user.telegramId} changed chain to ${chain} via callback`);
  } catch (error) {
    logger.error(`Error handling set_chain callback for user ${user.telegramId}: ${error.message}`);
    
    // Send a simple error message
    try {
      await bot.sendMessage(chatId, "There was an error processing your request. Please try again.");
    } catch (secondError) {
      logger.error(`Failed to send error message to user ${user.telegramId}: ${secondError.message}`);
    }
  }
}

/**
 * Handle view top tokens callback
 * @param {Object} bot - Telegram bot instance
 * @param {number} chatId - Chat ID
 * @param {Object} user - User document
 */
async function handleViewTopTokensCallback(bot, chatId, user) {
  try {
    // Send processing message
    const processingMsg = await bot.sendMessage(chatId, 'Fetching top tokens...');
    
    // Get top tokens statistics
    const topTokens = await statisticsService.getTopTokens(15);
    
    // Format the message
    const message = formatters.formatTopTokensList(topTokens);
    
    // Create reply markup with return to main stats
    const replyMarkup = {
      inline_keyboard: [
        [{ text: '⬅️ Back to Statistics', callback_data: 'back_to_stats' }]
      ]
    };
    
    // Delete processing message
    await bot.deleteMessage(chatId, processingMsg.message_id).catch(() => {});
    
    // Send the message
    await bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: replyMarkup,
      disable_web_page_preview: true // Disable web page previews for links
    });
    
    logger.info(`User ${user.telegramId} viewed top tokens statistics`);
  } catch (error) {
    logger.error(`Error handling view_top_tokens callback for user ${user.telegramId}: ${error.message}`);
    await bot.sendMessage(chatId, constants.messages.error);
  }
}

/**
 * Handle view popular chains callback
 * @param {Object} bot - Telegram bot instance
 * @param {number} chatId - Chat ID
 * @param {Object} user - User document
 */
async function handleViewPopularChainsCallback(bot, chatId, user) {
  try {
    // Send processing message
    const processingMsg = await bot.sendMessage(chatId, 'Fetching popular chains...');
    
    // Get popular chains statistics
    const popularChains = await statisticsService.getPopularChains();
    
    // Format the message
    const message = formatters.formatPopularChainsList(popularChains);
    
    // Create reply markup with return to main stats
    const replyMarkup = {
      inline_keyboard: [
        [{ text: '⬅️ Back to Statistics', callback_data: 'back_to_stats' }]
      ]
    };
    
    // Delete processing message
    await bot.deleteMessage(chatId, processingMsg.message_id).catch(() => {});
    
    // Send the message
    await bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: replyMarkup,
      disable_web_page_preview: true // Disable web page previews for links
    });
    
    logger.info(`User ${user.telegramId} viewed popular chains statistics`);
  } catch (error) {
    logger.error(`Error handling view_popular_chains callback for user ${user.telegramId}: ${error.message}`);
    await bot.sendMessage(chatId, constants.messages.error);
  }
}

/**
 * Handle view trending tokens callback
 * @param {Object} bot - Telegram bot instance
 * @param {number} chatId - Chat ID
 * @param {Object} user - User document
 */
async function handleViewTrendingTokensCallback(bot, chatId, user) {
  try {
    // Send processing message
    const processingMsg = await bot.sendMessage(chatId, 'Fetching trending tokens...');
    
    // Get trending tokens statistics
    const trendingTokens = await statisticsService.getTrendingTokens(10, 3);
    
    // Format the message
    const message = formatters.formatTrendingTokens(trendingTokens);
    
    // Create reply markup with return to main stats
    const replyMarkup = {
      inline_keyboard: [
        [{ text: '⬅️ Back to Statistics', callback_data: 'back_to_stats' }]
      ]
    };
    
    // Delete processing message
    await bot.deleteMessage(chatId, processingMsg.message_id).catch(() => {});
    
    // Send the message
    await bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: replyMarkup,
      disable_web_page_preview: true // Disable web page previews for links
    });
    
    logger.info(`User ${user.telegramId} viewed trending tokens statistics`);
  } catch (error) {
    logger.error(`Error handling view_trending_tokens callback for user ${user.telegramId}: ${error.message}`);
    await bot.sendMessage(chatId, constants.messages.error);
  }
}

/**
 * Handle back to statistics callback
 * @param {Object} bot - Telegram bot instance
 * @param {number} chatId - Chat ID
 * @param {Object} user - User document
 */
async function handleBackToStatsCallback(bot, chatId, user) {
  try {
    // Simply call the topstat command handler
    await commandHandler.handleTopStat(bot, { chat: { id: chatId } }, user);
    logger.info(`User ${user.telegramId} returned to main statistics`);
  } catch (error) {
    logger.error(`Error handling back_to_stats callback for user ${user.telegramId}: ${error.message}`);
    await bot.sendMessage(chatId, constants.messages.error);
  }
}

/**
 * Handle start callback (back to main menu)
 * @param {Object} bot - Telegram bot instance
 * @param {number} chatId - Chat ID
 * @param {Object} user - User document
 */
async function handleStartCallback(bot, chatId, user) {
  try {
    // Just call the command handler function for start
    await commandHandler.handleStart(bot, { chat: { id: chatId } }, user);
    logger.info(`User ${user.telegramId} returned to main menu`);
  } catch (error) {
    logger.error(`Error handling start callback for user ${user.telegramId}: ${error.message}`);
    await bot.sendMessage(chatId, constants.messages.error);
  }
}

module.exports = {
  handleCallback
}; 