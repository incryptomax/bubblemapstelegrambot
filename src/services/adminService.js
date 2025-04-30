const BroadcastMessage = require('../models/BroadcastMessage');
const User = require('../models/User');
const logger = require('../utils/logger');
const userService = require('./userService');
const groupService = require('./groupService');

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
      
      // Get group statistics
      const groupStats = await groupService.getGroupStats({ limit: 5 });
      
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
        groupStats,
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
        groupStats: {
          totalGroups: 0,
          activeGroups: 0,
          totalChecks: 0,
          todayChecks: 0,
          topGroups: [],
          dailyActivity: []
        },
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

  /**
   * Get list of users with optional filtering
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number of users to return (default: 20)
   * @param {number} options.skip - Number of users to skip (for pagination)
   * @param {string} options.sortBy - Field to sort by (default: lastActivity)
   * @param {string} options.sortOrder - Sort order (asc or desc, default: desc)
   * @param {boolean} options.activeOnly - Only return active users
   * @returns {Promise<Array>} - Array of user objects
   */
  async getUserList(options = {}) {
    try {
      // Validate and sanitize options
      const {
        limit = 20,
        skip = 0,
        sortBy = 'lastActivity',
        sortOrder = 'desc',
        activeOnly = false
      } = options;
      
      // Ensure limit is a valid number and capped at a reasonable value
      const sanitizedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 50);
      
      // Ensure skip is a valid number
      const sanitizedSkip = Math.max(parseInt(skip) || 0, 0);
      
      // Validate sortBy field to prevent injection
      const validSortFields = ['lastActivity', 'createdAt', 'username', 'firstName', 'isAdmin'];
      const sanitizedSortBy = validSortFields.includes(sortBy) ? sortBy : 'lastActivity';
      
      // Validate sort order
      const sanitizedSortOrder = sortOrder === 'asc' ? 1 : -1;
      
      // Build query
      const query = {};
      if (activeOnly === true) {
        query.isActive = true;
      }
      
      // Log the query being executed
      logger.info(`Executing user list query: limit=${sanitizedLimit}, skip=${sanitizedSkip}, sortBy=${sanitizedSortBy}, sortOrder=${sanitizedSortOrder}, activeOnly=${activeOnly}`);
      
      // Build sort
      const sort = { [sanitizedSortBy]: sanitizedSortOrder };
      
      // Use Promise.all to run both queries concurrently
      const [users, totalUsers] = await Promise.all([
        // Query database with timeout
        Promise.race([
          User.find(query)
            .sort(sort)
            .skip(sanitizedSkip)
            .limit(sanitizedLimit)
            .lean()
            .exec(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Database query timed out')), 10000))
        ]),
        
        // Get total count for pagination
        User.countDocuments(query)
      ]);
      
      return {
        users,
        totalUsers,
        hasMore: totalUsers > sanitizedSkip + sanitizedLimit
      };
    } catch (error) {
      logger.error(`Error getting user list: ${error.message}`, error);
      // Return empty but valid result instead of throwing
      return {
        users: [],
        totalUsers: 0,
        hasMore: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get list of groups with optional filtering
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Groups data with pagination info
   */
  async getGroupsList(options = {}) {
    return await groupService.getGroupsList(options);
  }
}

module.exports = new AdminService(); 