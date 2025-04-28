const logger = require('../utils/logger');
const userService = require('../services/userService');
const validation = require('../utils/validation');
const commandHandler = require('./commandHandler');
const adminHandler = require('./adminHandler');
const constants = require('../../config/constants');

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
    } else if (data === 'change_chain') {
      await handleChangeChainCallback(bot, chatId, user);
    } else if (data === 'cancel_broadcast') {
      await handleCancelBroadcastCallback(bot, chatId, messageId, user);
    } else if (data === 'admin_broadcast') {
      await adminHandler.handleBroadcast(bot, callbackQuery.message, user);
    } else if (data === 'admin_stats') {
      await adminHandler.handleStats(bot, callbackQuery.message, user);
    } else if (data.startsWith('set_chain:')) {
      const chain = data.split(':')[1];
      await handleSetChainCallback(bot, chatId, user, chain);
    } else {
      logger.warn(`Unknown callback data from user ${user.telegramId}: ${data}`);
    }
  } catch (error) {
    logger.error(`Error handling callback for user ${user.telegramId}:`, error.message);
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
    
    // Send help message
    await bot.sendMessage(chatId, constants.messages.help, {
      parse_mode: 'Markdown'
    });
    
    logger.info(`User ${user.telegramId} requested help via callback`);
  } catch (error) {
    logger.error(`Error handling help callback for user ${user.telegramId}:`, error.message);
    throw error;
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
    
    // Prompt for contract address
    await bot.sendMessage(chatId, 'Please enter the contract address you want to check:');
    
    logger.info(`User ${user.telegramId} initiated token check via callback`);
  } catch (error) {
    logger.error(`Error handling check_token callback for user ${user.telegramId}:`, error.message);
    throw error;
  }
}

/**
 * Handle change chain callback
 * @param {Object} bot - Telegram bot instance
 * @param {number} chatId - Chat ID
 * @param {Object} user - User document
 */
async function handleChangeChainCallback(bot, chatId, user) {
  try {
    // Show chain selection
    await commandHandler.showChainSelection(bot, chatId, user);
    
    logger.info(`User ${user.telegramId} initiated chain change via callback`);
  } catch (error) {
    logger.error(`Error handling change_chain callback for user ${user.telegramId}:`, error.message);
    throw error;
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
    logger.error(`Error handling set_chain callback for user ${user.telegramId}:`, error.message);
    throw error;
  }
}

/**
 * Handle cancel broadcast callback
 * @param {Object} bot - Telegram bot instance
 * @param {number} chatId - Chat ID
 * @param {number} messageId - Message ID
 * @param {Object} user - User document
 */
async function handleCancelBroadcastCallback(bot, chatId, messageId, user) {
  try {
    // Check if user is admin
    if (!user.isAdmin) {
      await bot.sendMessage(chatId, constants.messages.adminOnly);
      return;
    }
    
    // Reset user state
    await userService.updateUserState(user, 'idle');
    
    // Update the message
    await bot.editMessageText(constants.messages.broadcastCancelled, {
      chat_id: chatId,
      message_id: messageId
    });
    
    logger.info(`Admin ${user.telegramId} cancelled broadcast`);
  } catch (error) {
    logger.error(`Error handling cancel_broadcast callback for user ${user.telegramId}:`, error.message);
    throw error;
  }
}

module.exports = {
  handleCallback
}; 