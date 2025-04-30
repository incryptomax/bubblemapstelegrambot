const BroadcastMessage = require('../models/BroadcastMessage');
const User = require('../models/User');
const logger = require('../utils/logger');
const userService = require('./userService');
const moment = require('moment');

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
   * @returns {Promise<Object>} - Stats object
   */
  async getSystemStats() {
    try {
      // Get user stats
      const totalUsers = await User.countDocuments();
      const activeUsers = await User.countDocuments({
        lastActivity: { $gte: moment().subtract(24, 'hours').toDate() }
      });
      
      // Get interaction stats
      const totalInteractions = await User.aggregate([
        { $group: { _id: null, totalInteractions: { $sum: '$interactionCount' } } }
      ]);
      
      // Get interactions for today
      const startOfDay = moment().startOf('day').toDate();
      const todayInteractions = await User.aggregate([
        { 
          $match: { 
            lastActivity: { $gte: startOfDay } 
          } 
        },
        { 
          $group: { 
            _id: null, 
            todayInteractions: { $sum: '$dailyInteractionCount' } 
          } 
        }
      ]);
      
      // Get tokens checked
      const tokensCheckedAgg = await User.aggregate([
        { $group: { _id: null, tokensChecked: { $sum: '$tokenCheckCount' } } }
      ]);
      
      // Get unique tokens checked
      const uniqueTokensAgg = await User.aggregate([
        { $project: { tokenCount: { $size: { $ifNull: ['$tokensChecked', []] } } } },
        { $group: { _id: null, uniqueTokens: { $sum: '$tokenCount' } } }
      ]);
      
      // Get popular chains
      const popularChainsAgg = await User.aggregate([
        { $unwind: '$chainsUsed' },
        { $group: { _id: '$chainsUsed.chainId', count: { $sum: '$chainsUsed.count' } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { id: '$_id', count: 1, _id: 0 } }
      ]);
      
      // Compile user stats
      const userStats = {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalInteractions: (totalInteractions[0]?.totalInteractions) || 0,
        todayInteractions: (todayInteractions[0]?.todayInteractions) || 0,
        tokensChecked: (tokensCheckedAgg[0]?.tokensChecked) || 0,
        uniqueTokens: (uniqueTokensAgg[0]?.uniqueTokens) || 0,
        popularChains: popularChainsAgg || []
      };
      
      return {
        userStats
      };
    } catch (error) {
      logger.error(`Error getting system stats: ${error.message}`, error);
      return {
        userStats: {
          totalUsers: 0,
          activeUsers: 0,
          totalInteractions: 0,
          todayInteractions: 0,
          tokensChecked: 0,
          uniqueTokens: 0,
          popularChains: []
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