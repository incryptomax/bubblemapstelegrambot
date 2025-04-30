const logger = require('../utils/logger');
const userService = require('../services/userService');
const adminService = require('../services/adminService');
const formatters = require('../utils/formatters');
const constants = require('../../config/constants');
const moment = require('moment');

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
    const statsMessage = formatters.formatSystemStats(systemStats);
    
    // Create a keyboard with admin actions
    const keyboard = {
      inline_keyboard: [
       
        [
          { text: '👥 View Users', callback_data: 'admin_users' }
        ],
        [
          { text: '📣 Send Broadcast', callback_data: 'admin_broadcast' },
          { text: '🔄 Refresh Stats', callback_data: 'admin_stats' }
        ]
      ]
    };
    
    // Send stats with the admin panel keyboard
    await bot.sendMessage(chatId, statsMessage, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
    
    // Cleanup processing message
    await bot.deleteMessage(chatId, processingMsg.message_id).catch((err) => {
      logger.warn(`Error deleting processing message: ${err.message}`);
    });
    
    logger.info(`Admin ${user.telegramId} requested stats`);
  } catch (error) {
    logger.error(`Error handling stats for admin ${user.telegramId}: ${error.message}`, error);
    await bot.sendMessage(chatId, constants.messages.error);
  }
}

/**
 * Handle callback to show detailed user statistics
 * @param {Object} bot - Telegram bot instance
 * @param {Object} query - Callback query object
 * @param {Object} user - User document
 */
async function handleUserStats(bot, query, user) {
  const chatId = query.message.chat.id;
  
  try {
    // Check if user is admin
    if (!user.isAdmin) {
      await bot.answerCallbackQuery(query.id, { text: constants.messages.adminOnly });
      return;
    }
    
    // Send processing message
    await bot.answerCallbackQuery(query.id, { text: 'Fetching user statistics...' });
    
    // Get system stats
    const systemStats = await adminService.getSystemStats();
    
    // Format user stats
    const statsMessage = formatters.formatUserStats(systemStats.userStats);
    
    // Create a back button
    const keyboard = {
      inline_keyboard: [
        [
          { text: '◀️ Back to Admin Panel', callback_data: 'admin_stats' }
        ]
      ]
    };
    
    // Edit message to show user stats
    await bot.editMessageText(statsMessage, {
      chat_id: chatId,
      message_id: query.message.message_id,
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
    
    logger.info(`Admin ${user.telegramId} viewed detailed user stats`);
  } catch (error) {
    logger.error(`Error handling user stats for admin ${user.telegramId}: ${error.message}`, error);
    await bot.answerCallbackQuery(query.id, { text: 'Error fetching user statistics' });
  }
}

/**
 * Handle callback to show detailed group statistics
 * @param {Object} bot - Telegram bot instance
 * @param {Object} query - Callback query object
 * @param {Object} user - User document
 */
async function handleGroupStats(bot, query, user) {
  const chatId = query.message.chat.id;
  
  try {
    // Check if user is admin
    if (!user.isAdmin) {
      await bot.answerCallbackQuery(query.id, { text: constants.messages.adminOnly });
      return;
    }
    
    // Send processing message
    await bot.answerCallbackQuery(query.id, { text: 'Fetching group statistics...' });
    
    // Get system stats
    const systemStats = await adminService.getSystemStats();
    
    // Format group stats
    const statsMessage = formatters.formatGroupStats(systemStats.groupStats);
    
    // Create a back button
    const keyboard = {
      inline_keyboard: [
        [
          { text: '👥 View Group List', callback_data: 'admin_groups' }
        ],
        [
          { text: '◀️ Back to Admin Panel', callback_data: 'admin_stats' }
        ]
      ]
    };
    
    // Edit message to show group stats
    await bot.editMessageText(statsMessage, {
      chat_id: chatId,
      message_id: query.message.message_id,
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
    
    logger.info(`Admin ${user.telegramId} viewed detailed group stats`);
  } catch (error) {
    logger.error(`Error handling group stats for admin ${user.telegramId}: ${error.message}`, error);
    await bot.answerCallbackQuery(query.id, { text: 'Error fetching group statistics' });
  }
}

/**
 * Handle admin command to view group list
 * @param {Object} bot - Telegram bot instance
 * @param {Object} query - Callback query object
 * @param {Object} user - User document
 * @param {Object} options - Pagination options
 */
async function handleGroupList(bot, query, user, options = {}) {
  const chatId = query.message.chat.id;
  
  try {
    // Check if user is admin
    if (!user.isAdmin) {
      await bot.answerCallbackQuery(query.id, { text: constants.messages.adminOnly });
      return;
    }
    
    // Send processing message
    await bot.answerCallbackQuery(query.id, { text: 'Fetching group list...' });
    
    // Default options
    const {
      page = 1,
      limit = 10,
      activeOnly = true
    } = options;
    
    // Calculate skip value for pagination
    const skip = (page - 1) * limit;
    
    try {
      // Get group list from service
      const groupListData = await adminService.getGroupsList({
        limit,
        skip,
        activeOnly,
        sortBy: 'tokensChecked',
        sortOrder: 'desc'
      });
      
      logger.info(`Successfully retrieved ${groupListData.groups.length} groups for admin ${user.telegramId}, page ${page}`);
      
      // Format group list
      let message = `*👥 Community List (${groupListData.totalGroups} groups)*\n\n`;
      
      if (groupListData.groups.length === 0) {
        message += 'No communities found.';
      } else {
        groupListData.groups.forEach((group, index) => {
          const displayName = group.name || 'Unknown Group';
          const displayUsername = group.username ? `@${group.username}` : '';
          const lastActive = group.lastActivity ? moment(group.lastActivity).fromNow() : 'Unknown';
          
          message += `*${skip + index + 1}.* ${displayName} ${displayUsername}\n`;
          message += `   👁️ ${group.tokensChecked} checks • Members: ${group.memberCount || 'Unknown'}\n`;
          message += `   🕒 Last active: ${lastActive}\n\n`;
        });
      }
      
      // Create pagination keyboard
      const keyboard = {
        inline_keyboard: []
      };
      
      // Add navigation buttons if needed
      const paginationButtons = [];
      
      if (page > 1) {
        paginationButtons.push({
          text: '⬅️ Previous',
          callback_data: `admin_groups:${page - 1}:${limit}:${activeOnly ? 1 : 0}`
        });
      }
      
      if (groupListData.hasMore) {
        paginationButtons.push({
          text: 'Next ➡️',
          callback_data: `admin_groups:${page + 1}:${limit}:${activeOnly ? 1 : 0}`
        });
      }
      
      if (paginationButtons.length > 0) {
        keyboard.inline_keyboard.push(paginationButtons);
      }
      
      // Add filter button
      keyboard.inline_keyboard.push([
        {
          text: activeOnly ? '🔍 Show All Groups' : '🔍 Show Active Only',
          callback_data: `admin_groups:1:${limit}:${activeOnly ? 0 : 1}`
        }
      ]);
      
      // Add back button
      keyboard.inline_keyboard.push([
        {
          text: '◀️ Back to Admin Panel',
          callback_data: 'admin_stats'
        }
      ]);
      
      // Edit message to show group list
      await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
      
      logger.info(`Admin ${user.telegramId} viewed group list, page ${page}`);
    } catch (error) {
      logger.error(`Error getting group list: ${error.message}`, error);
      await bot.answerCallbackQuery(query.id, { 
        text: 'Error loading group list. Try again later.',
        show_alert: true
      });
    }
  } catch (error) {
    logger.error(`Error handling group list for admin ${user.telegramId}: ${error.message}`, error);
    await bot.answerCallbackQuery(query.id, { text: 'Error fetching group list' });
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
          { text: '📣 Send Broadcast', callback_data: 'admin_broadcast' },
          { text: '📊 Refresh Stats', callback_data: 'admin_stats' }
        ],
        [
          { text: '👥 View User List', callback_data: 'admin_users' }
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

/**
 * Handle admin command to view user list
 * @param {Object} bot - Telegram bot instance
 * @param {Object} msg - Telegram message object
 * @param {Object} user - User document
 * @param {Object} options - Pagination options
 */
async function handleUserList(bot, msg, user, options = {}) {
  const chatId = msg.chat.id;
  
  try {
    // Check if user is admin
    if (!user.isAdmin) {
      await bot.sendMessage(chatId, constants.messages.adminOnly);
      return;
    }
    
    // Track interaction
    await userService.trackInteraction(user, constants.interactionTypes.VIEW_USER_LIST, {
      page: options.page || 1,
      activeOnly: options.activeOnly || false
    });
    
    // Send processing message
    const processingMsg = await bot.sendMessage(chatId, 'Fetching user list...');
    
    // Default options
    const {
      page = 1,
      limit = 10,
      activeOnly = false
    } = options;
    
    // Calculate skip value for pagination
    const skip = (page - 1) * limit;
    
    try {
      // Get user list from service
      const userListData = await adminService.getUserList({
        limit,
        skip,
        activeOnly,
        sortBy: 'lastActivity',
        sortOrder: 'desc'
      });
      
      logger.info(`Successfully retrieved ${userListData.users.length} users for admin ${user.telegramId}, page ${page}`);
      
      // Format user list
      const userListMessage = formatters.formatUserList(userListData.users);
      
      // Create pagination keyboard
      const keyboard = {
        inline_keyboard: []
      };
      
      // Add navigation buttons if needed
      const paginationButtons = [];
      
      if (page > 1) {
        paginationButtons.push({
          text: '⬅️ Previous',
          callback_data: `admin_users:${page - 1}:${limit}:${activeOnly ? 1 : 0}`
        });
      }
      
      if (userListData.hasMore) {
        paginationButtons.push({
          text: 'Next ➡️',
          callback_data: `admin_users:${page + 1}:${limit}:${activeOnly ? 1 : 0}`
        });
      }
      
      if (paginationButtons.length > 0) {
        keyboard.inline_keyboard.push(paginationButtons);
      }
      
      // Add filter buttons
      keyboard.inline_keyboard.push([
        {
          text: activeOnly ? '👁️ Show All Users' : '✅ Show Active Only',
          callback_data: `admin_users:1:${limit}:${activeOnly ? 0 : 1}`
        }
      ]);
      
      // Add back button
      keyboard.inline_keyboard.push([
        { text: '⬅️ Back to Admin Panel', callback_data: 'admin_stats' }
      ]);
      
      // Delete processing message
      await bot.deleteMessage(chatId, processingMsg.message_id).catch((err) => {
        logger.warn(`Error deleting processing message: ${err.message}`);
      });
      
      // Add page info to message - plain text, no formatting
      const pageInfo = `Page ${page} · ${userListData.users.length} of ${userListData.totalUsers} users`;
      
      // Send user list with proper error handling for Markdown
      try {
        await bot.sendMessage(chatId, `${userListMessage}\n\n${pageInfo}`, {
          parse_mode: 'MarkdownV2',
          reply_markup: keyboard
        });
      } catch (markdownError) {
        logger.error(`Error sending formatted user list: ${markdownError.message}`);
        
        // If there's a parsing error, try sending as plain text
        try {
          const plainTextMessage = userListMessage
            .replace(/\\/g, '') // Remove escape characters
            .replace(/\*/g, '')  // Remove bold formatting
            .replace(/\_/g, '')  // Remove italic formatting
            .replace(/\[/g, '')  // Remove link formatting
            .replace(/\]/g, '')  // Remove link formatting
            .replace(/\(/g, '')  // Remove link formatting
            .replace(/\)/g, ''); // Remove link formatting
          
          await bot.sendMessage(chatId, `${plainTextMessage}\n\n${pageInfo}`, {
            reply_markup: keyboard
          });
        } catch (plainTextError) {
          logger.error(`Failed to send plain text message: ${plainTextError.message}`);
          await bot.sendMessage(chatId, 'Error displaying user list. Please try again later.', {
            reply_markup: keyboard
          });
        }
      }
      
      logger.info(`Admin ${user.telegramId} viewed user list (page ${page})`);
    } catch (innerError) {
      // Log detailed error about the specific part that failed
      logger.error(`Error processing user list for admin ${user.telegramId}: ${innerError.message}`, innerError);
      
      // Clean up the processing message
      if (processingMsg) {
        await bot.deleteMessage(chatId, processingMsg.message_id).catch(() => {});
      }
      
      // Send a more specific error message
      await bot.sendMessage(chatId, `Error loading user list: ${innerError.message}`, {
        reply_markup: {
          inline_keyboard: [[{ text: '⬅️ Back to Admin Panel', callback_data: 'admin_stats' }]]
        }
      });
    }
  } catch (error) {
    logger.error(`Error handling user list for admin ${user.telegramId}: ${error.message}`, error);
    
    // Send a generic error message
    await bot.sendMessage(chatId, constants.messages.error, {
      reply_markup: {
        inline_keyboard: [[{ text: '⬅️ Back to Admin Panel', callback_data: 'admin_stats' }]]
      }
    });
  }
}

module.exports = {
  handleStats,
  handleBroadcast,
  sendBroadcast,
  showAdminOptions,
  handleUserList,
  handleGroupList
}; 