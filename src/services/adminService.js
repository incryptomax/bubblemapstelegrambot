const BroadcastMessage = require('../models/BroadcastMessage');
const User = require('../models/User');
const logger = require('../utils/logger');
const userService = require('./userService');

/**
 * Service for admin functionality
 */
class AdminService {
  /**
   * Create a broadcast message and send it to all users
   * @param {Object} admin - Admin user
   * @param {string} message - Message to broadcast
   * @returns {Promise<Object>} - Broadcast document
   */
  async broadcastMessage(admin, message) {
    try {
      // Get all active users
      const users = await userService.getActiveUsers(72); // Consider users active in last 3 days
      
      logger.info(`Broadcasting message to ${users.length} users from admin ${admin.telegramId}`);
      
      // Create broadcast record
      const broadcast = await BroadcastMessage.createBroadcast(admin, message, users);
      
      return broadcast;
    } catch (error) {
      logger.error(`Error creating broadcast:`, error.message);
      throw error;
    }
  }
  
  /**
   * Update broadcast delivery status
   * @param {string} broadcastId - Broadcast document ID
   * @param {string} userId - User ID
   * @param {boolean} success - Whether delivery was successful
   * @param {string} error - Error message if delivery failed
   * @returns {Promise<Object>} - Updated broadcast
   */
  async updateBroadcastStatus(broadcastId, userId, success, error = null) {
    try {
      const broadcast = await BroadcastMessage.findById(broadcastId);
      if (!broadcast) {
        throw new Error(`Broadcast not found: ${broadcastId}`);
      }
      
      return await broadcast.updateDeliveryStatus(userId, success, error);
    } catch (error) {
      logger.error(`Error updating broadcast status:`, error.message);
      // Don't throw, just log the error
      return null;
    }
  }
  
  /**
   * Get system statistics
   * @returns {Promise<Object>} - System statistics
   */
  async getSystemStats() {
    try {
      // Get user statistics
      const userStats = await userService.getUserStats();
      
      // Get broadcast statistics
      const broadcasts = await BroadcastMessage.find()
        .sort({ createdAt: -1 })
        .limit(5);
      
      const totalBroadcasts = await BroadcastMessage.countDocuments();
      
      // Get DB size (approximate)
      const dbStats = {
        users: await User.collection.stats().then(stats => stats.size),
        broadcasts: await BroadcastMessage.collection.stats().then(stats => stats.size)
      };
      
      return {
        userStats,
        broadcastStats: {
          total: totalBroadcasts,
          recent: broadcasts.map(b => ({
            id: b._id,
            date: b.createdAt,
            message: b.message.substring(0, 50) + (b.message.length > 50 ? '...' : ''),
            status: b.status,
            targetCount: b.targetCount,
            deliveredCount: b.deliveredCount,
            failedCount: b.failedCount
          }))
        },
        dbStats
      };
    } catch (error) {
      logger.error('Error getting system statistics:', error.message);
      return {
        userStats: await userService.getUserStats(),
        broadcastStats: {
          total: 0,
          recent: []
        },
        dbStats: {
          users: 0,
          broadcasts: 0
        }
      };
    }
  }
}

module.exports = new AdminService(); 