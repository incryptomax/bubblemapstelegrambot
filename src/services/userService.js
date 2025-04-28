const User = require('../models/User');
const Interaction = require('../models/Interaction');
const logger = require('../utils/logger');
const validation = require('../utils/validation');

/**
 * Service for user management and interaction tracking
 */
class UserService {
  /**
   * Get or create user from Telegram user data
   * @param {Object} telegramUser - Telegram user object
   * @returns {Promise<Object>} - User document
   */
  async getOrCreateUser(telegramUser) {
    try {
      const { id, username, first_name, last_name } = telegramUser;
      
      // Check if user is admin
      const isAdmin = validation.isAdmin(id);
      
      const userData = {
        telegramId: id.toString(),
        username: username || '',
        firstName: first_name || '',
        lastName: last_name || '',
        isAdmin
      };
      
      const user = await User.findOrCreate(userData);
      
      // Update lastActivity
      await user.updateActivity();
      
      return user;
    } catch (error) {
      logger.error('Error getting or creating user:', error.message);
      throw error;
    }
  }
  
  /**
   * Track user interaction
   * @param {Object} user - User document
   * @param {string} type - Interaction type
   * @param {Object} data - Additional data
   * @returns {Promise<Object>} - Interaction document
   */
  async trackInteraction(user, type, data = {}) {
    try {
      return await Interaction.log(user, type, data);
    } catch (error) {
      logger.error(`Error tracking interaction (${type}):`, error.message);
      // Don't throw, just log the error
      return null;
    }
  }
  
  /**
   * Get all active users
   * @param {number} hoursActive - Hours to consider a user active
   * @returns {Promise<Array>} - Array of active users
   */
  async getActiveUsers(hoursActive = 24) {
    try {
      const activeTime = new Date();
      activeTime.setHours(activeTime.getHours() - hoursActive);
      
      return await User.find({
        isActive: true,
        lastActivity: { $gte: activeTime }
      });
    } catch (error) {
      logger.error('Error getting active users:', error.message);
      return [];
    }
  }
  
  /**
   * Get user statistics
   * @returns {Promise<Object>} - User statistics
   */
  async getUserStats() {
    try {
      // Get total users
      const totalUsers = await User.countDocuments();
      
      // Get active users in last 24 hours
      const activeTime = new Date();
      activeTime.setHours(activeTime.getHours() - 24);
      const activeUsers = await User.countDocuments({
        lastActivity: { $gte: activeTime }
      });
      
      // Get today's interactions
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayInteractions = await Interaction.countDocuments({
        createdAt: { $gte: todayStart }
      });
      
      // Get total interactions
      const totalInteractions = await Interaction.countDocuments();
      
      // Get token check statistics
      const tokenStats = await Interaction.aggregate([
        { $match: { type: 'check_token' } },
        { $group: { _id: '$data.token', count: { $sum: 1 } } }
      ]);
      
      const tokensChecked = await Interaction.countDocuments({ type: 'check_token' });
      const uniqueTokens = tokenStats.length;
      
      // Get popular chains
      const popularChains = await Interaction.aggregate([
        { $match: { type: 'check_token' } },
        { $group: { _id: '$data.chain', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]).then(results => 
        results.map(item => ({ id: item._id, count: item.count }))
      );
      
      return {
        totalUsers,
        activeUsers,
        todayInteractions,
        totalInteractions,
        tokensChecked,
        uniqueTokens,
        popularChains
      };
    } catch (error) {
      logger.error('Error getting user statistics:', error.message);
      return {
        totalUsers: 0,
        activeUsers: 0,
        todayInteractions: 0,
        totalInteractions: 0,
        tokensChecked: 0,
        uniqueTokens: 0,
        popularChains: []
      };
    }
  }
  
  /**
   * Update user's preferred chain
   * @param {Object} user - User document
   * @param {string} chain - Chain ID
   * @returns {Promise<Object>} - Updated user
   */
  async updatePreferredChain(user, chain) {
    try {
      return await user.setPreferredChain(chain);
    } catch (error) {
      logger.error(`Error updating preferred chain for user ${user.telegramId}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Update user state
   * @param {Object} user - User document
   * @param {string} state - New state
   * @returns {Promise<Object>} - Updated user
   */
  async updateUserState(user, state) {
    try {
      return await user.setState(state);
    } catch (error) {
      logger.error(`Error updating state for user ${user.telegramId}:`, error.message);
      throw error;
    }
  }
}

module.exports = new UserService(); 