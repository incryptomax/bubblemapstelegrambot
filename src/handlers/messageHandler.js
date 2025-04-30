const validation = require('../utils/validation');
const logger = require('../utils/logger');
const userService = require('../services/userService');
const adminService = require('../services/adminService');
const commandHandler = require('./commandHandler');
const constants = require('../../config/constants');

/**
 * Handle regular text messages based on user state
 * @param {Object} bot - Telegram bot instance
 * @param {Object} msg - Telegram message object
 * @param {Object} user - User document
 */
async function handleMessage(bot, msg, user) {
  const chatId = msg.chat.id;
  const text = msg.text.trim();
  
  try {
    switch (user.state) {
      case 'awaiting_contract':
        await handleAwaitingContract(bot, msg, user, text);
        break;
        
      case 'awaiting_chain':
        await handleAwaitingChain(bot, msg, user, text);
        break;
        
      case 'awaiting_broadcast_message':
        await handleAwaitingBroadcast(bot, msg, user, text);
        break;
        
      default:
        await handleDefaultState(bot, msg, user, text);
        break;
    }
  } catch (error) {
    logger.error(`Error handling message for user ${user.telegramId}:`, error.message);
    await bot.sendMessage(chatId, constants.messages.error);
  }
}

/**
 * Handle message in 'awaiting_contract' state
 * @param {Object} bot - Telegram bot instance
 * @param {Object} msg - Telegram message object
 * @param {Object} user - User document
 * @param {string} text - Message text
 */
async function handleAwaitingContract(bot, msg, user, text) {
  const chatId = msg.chat.id;
  
  try {
    // Extract contract address
    const contractAddress = validation.extractContractAddress(text);
    
    if (!contractAddress) {
      await bot.sendMessage(chatId, constants.messages.invalidContract);
      return;
    }
    
    // Reset user state
    await userService.updateUserState(user, 'idle');
    
    // Send processing message for EVM addresses as chain detection takes time
    let processingMsg = null;
    if (contractAddress.startsWith('0x')) {
      processingMsg = await bot.sendMessage(chatId, 'Detecting chain for this address...');
    }
    
    // Process the contract check
    await commandHandler.processContractCheck(bot, chatId, user, contractAddress, null, processingMsg);
  } catch (error) {
    logger.error(`Error handling awaiting_contract state for user ${user.telegramId}:`, error.message);
    await bot.sendMessage(chatId, constants.messages.error);
    
    // Reset user state
    await userService.updateUserState(user, 'idle');
  }
}

/**
 * Handle message in 'awaiting_chain' state
 * @param {Object} bot - Telegram bot instance
 * @param {Object} msg - Telegram message object
 * @param {Object} user - User document
 * @param {string} text - Message text
 */
async function handleAwaitingChain(bot, msg, user, text) {
  const chatId = msg.chat.id;
  
  try {
    const chain = text.toLowerCase();
    
    if (validation.isValidChain(chain)) {
      // Update user's preferred chain
      await userService.updatePreferredChain(user, chain);
      
      // Track interaction
      await userService.trackInteraction(user, constants.interactionTypes.CHANGE_CHAIN, { chain });
      
      // Reset user state
      await userService.updateUserState(user, 'idle');
      
      // Confirm chain change
      const chainName = constants.chains.find(c => c.id === chain)?.name || chain.toUpperCase();
      await bot.sendMessage(chatId, `${constants.messages.chainSet}${chainName}`);
      
      logger.info(`User ${user.telegramId} changed chain to ${chain}`);
    } else {
      // Invalid chain
      await bot.sendMessage(chatId, `Invalid chain. Please select from the list or use /chain to see options.`);
      
      // Show chain selection again
      await commandHandler.showChainSelection(bot, chatId, user);
    }
  } catch (error) {
    logger.error(`Error handling awaiting_chain state for user ${user.telegramId}:`, error.message);
    await bot.sendMessage(chatId, constants.messages.error);
    
    // Reset user state
    await userService.updateUserState(user, 'idle');
  }
}

/**
 * Handle message in 'awaiting_broadcast_message' state
 * @param {Object} bot - Telegram bot instance
 * @param {Object} msg - Telegram message object
 * @param {Object} user - User document
 * @param {string} text - Message text
 */
async function handleAwaitingBroadcast(bot, msg, user, text) {
  const chatId = msg.chat.id;
  
  try {
    // Check if user is admin
    if (!user.isAdmin) {
      await bot.sendMessage(chatId, constants.messages.adminOnly);
      await userService.updateUserState(user, 'idle');
      return;
    }
    
    // Reset user state
    await userService.updateUserState(user, 'idle');
    
    // Create broadcast
    const broadcast = await adminService.broadcastMessage(user, text);
    
    // Track interaction
    await userService.trackInteraction(user, constants.interactionTypes.BROADCAST, { 
      messageId: broadcast._id 
    });
    
    // Send confirmation
    await bot.sendMessage(chatId, `Broadcasting message to ${broadcast.targetCount} users...`);
    
    // Send the broadcast to each user
    let successCount = 0;
    let failCount = 0;
    
    for (const detail of broadcast.deliveryDetails) {
      try {
        await bot.sendMessage(detail.userId, `*Announcement*\n\n${text}`, {
          parse_mode: 'Markdown'
        });
        
        // Update status
        await broadcast.updateDeliveryStatus(detail.userId, true);
        successCount++;
      } catch (error) {
        logger.error(`Error sending broadcast to user ${detail.userId}:`, error.message);
        await broadcast.updateDeliveryStatus(detail.userId, false, error.message);
        failCount++;
      }
      
      // Small delay to avoid hitting rate limits
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Send summary
    await bot.sendMessage(chatId, `Broadcast complete!\n${successCount} messages delivered, ${failCount} failed.`);
    
    logger.info(`Admin ${user.telegramId} sent broadcast to ${broadcast.targetCount} users`);
  } catch (error) {
    logger.error(`Error handling awaiting_broadcast state for user ${user.telegramId}:`, error.message);
    await bot.sendMessage(chatId, constants.messages.error);
    
    // Reset user state
    await userService.updateUserState(user, 'idle');
  }
}

/**
 * Handle message in default state
 * @param {Object} bot - Telegram bot instance
 * @param {Object} msg - Telegram message object
 * @param {Object} user - User document
 * @param {string} text - Message text
 */
async function handleDefaultState(bot, msg, user, text) {
  const chatId = msg.chat.id;
  
  try {
    // Check if the message contains a valid contract address
    const contractAddress = validation.extractContractAddress(text);
    
    if (contractAddress) {
      // Send processing message for EVM addresses as chain detection takes time
      let processingMsg = null;
      if (contractAddress.startsWith('0x')) {
        processingMsg = await bot.sendMessage(chatId, 'Detecting chain for this address...');
      }
      
      // Process the contract check with auto-detection
      await commandHandler.processContractCheck(bot, chatId, user, contractAddress, null, processingMsg);
    } else {
      // User sent something else, provide guidance
      await bot.sendMessage(chatId, "I couldn't identify a contract address in your message. Please send a valid contract address or use /help to see available commands.", {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔍Check a token', callback_data: 'check_token' }
            ],
            [
              { text: '❓Help', callback_data: 'help' }
            ]
          ]
        }
      });
    }
  } catch (error) {
    logger.error(`Error handling default state for user ${user.telegramId}:`, error.message);
    await bot.sendMessage(chatId, constants.messages.error);
  }
}

module.exports = {
  handleMessage
}; 