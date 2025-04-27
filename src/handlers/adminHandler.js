const logger = require('../utils/logger');
const userService = require('../services/userService');
const adminService = require('../services/adminService');
const formatters = require('../utils/formatters');
const constants = require('../../config/constants');

/**
 * Handle admin command to get statistics
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
    
    // Show additional admin options
    await showAdminOptions(bot, chatId);
    
    // Cleanup processing message
    await bot.deleteMessage(chatId, processingMsg.message_id);
    
    logger.info(`Admin ${user.telegramId} requested stats`);
  } catch (error) {
    logger.error(`Error handling stats for admin ${user.telegramId}:`, error.message);
    await bot.sendMessage(chatId, constants.messages.error);
  }
}

/**
 * Handle admin command to send a broadcast message
 * @param {Object} bot - Telegram bot instance
 * @param {Object} msg - Telegram message object
 * @param {Object} user - User document
 */
async function handleBroadcast(bot, msg, user) {
  const chatId = msg.chat.id;
  
  try {
    // Check if user is admin
    if (!user.isAdmin) {
      await bot.sendMessage(chatId, constants.messages.adminOnly);
      return;
    }
    
    // Set user state to awaiting broadcast message
    await userService.updateUserState(user, 'awaiting_broadcast_message');
    
    // Send instruction
    await bot.sendMessage(chatId, constants.messages.broadcastInit, {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Cancel', callback_data: 'cancel_broadcast' }]
        ]
      }
    });
    
    logger.info(`Admin ${user.telegramId} initiated broadcast`);
  } catch (error) {
    logger.error(`Error handling broadcast initiation for admin ${user.telegramId}:`, error.message);
    await bot.sendMessage(chatId, constants.messages.error);
  }
}

/**
 * Send broadcast message to users
 * @param {Object} bot - Telegram bot instance
 * @param {Object} user - Admin user document
 * @param {string} message - Message to broadcast
 */
async function sendBroadcast(bot, user, message) {
  try {
    // Create broadcast
    const broadcast = await adminService.broadcastMessage(user, message);
    
    // Track interaction
    await userService.trackInteraction(user, constants.interactionTypes.BROADCAST, { 
      messageId: broadcast._id 
    });
    
    // Send confirmation
    await bot.sendMessage(user.telegramId, `Broadcasting message to ${broadcast.targetCount} users...`);
    
    // Send the broadcast to each user
    let successCount = 0;
    let failCount = 0;
    
    for (const detail of broadcast.deliveryDetails) {
      try {
        await bot.sendMessage(detail.userId, `*Announcement*\n\n${message}`, {
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
    await bot.sendMessage(user.telegramId, `Broadcast complete!\n${successCount} messages delivered, ${failCount} failed.`);
    
    logger.info(`Admin ${user.telegramId} sent broadcast to ${broadcast.targetCount} users`);
    
    return { successCount, failCount, totalCount: broadcast.targetCount };
  } catch (error) {
    logger.error(`Error sending broadcast for admin ${user.telegramId}:`, error.message);
    throw error;
  }
}

/**
 * Show admin options
 * @param {Object} bot - Telegram bot instance
 * @param {number} chatId - Chat ID
 */
async function showAdminOptions(bot, chatId) {
  try {
    const keyboard = {
      inline_keyboard: [
        [
          { text: 'Send Broadcast', callback_data: 'admin_broadcast' },
          { text: 'Refresh Stats', callback_data: 'admin_stats' }
        ]
      ]
    };
    
    await bot.sendMessage(chatId, '*Admin Panel*\n\nSelect an admin action:', {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  } catch (error) {
    logger.error(`Error showing admin options:`, error.message);
    throw error;
  }
}

module.exports = {
  handleStats,
  handleBroadcast,
  sendBroadcast,
  showAdminOptions
}; 