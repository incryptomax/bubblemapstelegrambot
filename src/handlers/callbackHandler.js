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
    
    // Send help message
    await bot.sendMessage(chatId, constants.messages.help, {
      parse_mode: 'Markdown'
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
    
    // Prompt for contract address
    await bot.sendMessage(chatId, 'Please enter the contract address you want to check:');
    
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

module.exports = {
  handleCallback
}; 