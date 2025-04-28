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

  /**
   * Add a token to user's favorites
   * @param {Object} user - User document
   * @param {string} contractAddress - Token contract address
   * @param {string} chain - Chain ID
   * @param {string} name - Token name
   * @param {string} symbol - Token symbol
   * @returns {Promise<Object>} - Updated user
   */
  async addToFavorites(user, contractAddress, chain, name, symbol) {
    try {
      // Check if already in favorites
      const existingIndex = user.favorites.findIndex(
        fav => fav.contractAddress.toLowerCase() === contractAddress.toLowerCase() && fav.chain === chain
      );
      
      if (existingIndex === -1) {
        // Add new favorite
        user.favorites.push({
          contractAddress,
          chain,
          name,
          symbol,
          addedAt: new Date()
        });
      } else {
        // Update existing favorite
        user.favorites[existingIndex].name = name;
        user.favorites[existingIndex].symbol = symbol;
        user.favorites[existingIndex].addedAt = new Date();
      }
      
      await user.save();
      
      // Track interaction
      await this.trackInteraction(user, 'add_favorite', { 
        contractAddress, 
        chain,
        name,
        symbol 
      });
      
      return user;
    } catch (error) {
      logger.error(`Error adding favorite for user ${user.telegramId}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Remove a token from user's favorites
   * @param {Object} user - User document
   * @param {string} contractAddress - Token contract address
   * @param {string} chain - Chain ID
   * @returns {Promise<Object>} - Updated user
   */
  async removeFromFavorites(user, contractAddress, chain) {
    try {
      // Find token in favorites
      const existingIndex = user.favorites.findIndex(
        fav => fav.contractAddress.toLowerCase() === contractAddress.toLowerCase() && fav.chain === chain
      );
      
      if (existingIndex !== -1) {
        // Track interaction before removing
        await this.trackInteraction(user, 'remove_favorite', { 
          contractAddress, 
          chain,
          name: user.favorites[existingIndex].name,
          symbol: user.favorites[existingIndex].symbol 
        });
        
        // Remove from favorites
        user.favorites.splice(existingIndex, 1);
        await user.save();
      }
      
      return user;
    } catch (error) {
      logger.error(`Error removing favorite for user ${user.telegramId}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Get user's favorite tokens
   * @param {Object} user - User document
   * @returns {Array} - Sorted array of favorites
   */
  async getFavorites(user) {
    try {
      // Return favorites sorted by most recently added
      return user.favorites.sort((a, b) => b.addedAt - a.addedAt);
    } catch (error) {
      logger.error(`Error getting favorites for user ${user.telegramId}:`, error.message);
      return [];
    }
  }
  
  /**
   * Update user's recently checked tokens
   * @param {Object} user - User document
   * @param {string} contractAddress - Token contract address
   * @param {string} chain - Chain ID
   * @param {string} name - Token name
   * @param {string} symbol - Token symbol
   * @returns {Promise<Object>} - Updated user
   */
  async updateRecentlyChecked(user, contractAddress, chain, name, symbol) {
    try {
      // Find if token already exists in recently checked
      const existingIndex = user.recentlyChecked.findIndex(
        token => token.contractAddress.toLowerCase() === contractAddress.toLowerCase() && token.chain === chain
      );
      
      if (existingIndex !== -1) {
        // Update existing entry
        user.recentlyChecked[existingIndex].lastCheckedAt = new Date();
        user.recentlyChecked[existingIndex].name = name;
        user.recentlyChecked[existingIndex].symbol = symbol;
        
        // Move to front (most recent)
        const entry = user.recentlyChecked.splice(existingIndex, 1)[0];
        user.recentlyChecked.unshift(entry);
      } else {
        // Add new entry to front
        user.recentlyChecked.unshift({
          contractAddress,
          chain,
          name,
          symbol,
          lastCheckedAt: new Date()
        });
        
        // Keep only the 10 most recent tokens
        if (user.recentlyChecked.length > 10) {
          user.recentlyChecked = user.recentlyChecked.slice(0, 10);
        }
      }
      
      await user.save();
      return user;
    } catch (error) {
      logger.error(`Error updating recently checked for user ${user.telegramId}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Get user's recently checked tokens
   * @param {Object} user - User document
   * @returns {Array} - Sorted array of recently checked tokens
   */
  async getRecentlyChecked(user) {
    try {
      // Return recently checked tokens sorted by most recent
      return user.recentlyChecked.sort((a, b) => b.lastCheckedAt - a.lastCheckedAt);
    } catch (error) {
      logger.error(`Error getting recently checked for user ${user.telegramId}:`, error.message);
      return [];
    }
  }
  
  /**
   * Check if a token is in user's favorites
   * @param {Object} user - User document
   * @param {string} contractAddress - Token contract address
   * @param {string} chain - Chain ID
   * @returns {boolean} - True if in favorites
   */
  isInFavorites(user, contractAddress, chain) {
    return user.favorites.some(
      fav => fav.contractAddress.toLowerCase() === contractAddress.toLowerCase() && fav.chain === chain
    );
  }
}

module.exports = new UserService(); 