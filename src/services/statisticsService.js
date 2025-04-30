/**
 * Statistics Service - Aggregates and processes statistics about token usage
 */
const mongoose = require('mongoose');
const Interaction = require('../models/Interaction');
const User = require('../models/User');
const logger = require('../utils/logger');
const constants = require('../../config/constants');
const TokenRating = require('../models/TokenRating');

class StatisticsService {
  /**
   * Get public statistics for general display
   * @returns {Promise<Object>} - Public statistics
   */
  async getPublicStats() {
    try {
      // Get basic usage statistics
      const totalUsers = await User.countDocuments();
      const activeUsers = await this.getActiveUsersCount(7); // Active in last 7 days
      const totalChecks = await Interaction.countDocuments({ type: constants.interactionTypes.CHECK_TOKEN });
      
      // Get top tokens by check count
      const topTokens = await this.getTopTokens(10);
      
      // Get popular chains
      const popularChains = await this.getPopularChains();
      
      // Get trending tokens (last 3 days)
      const trendingTokens = await this.getTrendingTokens(5, 3);
      
      // Get top rated tokens
      const topRatedTokens = await this.getTopRatedTokens(5);
      
      return {
        totalUsers,
        activeUsers,
        totalChecks,
        topTokens,
        popularChains,
        trendingTokens,
        topRatedTokens
      };
    } catch (error) {
      logger.error('Error getting public statistics:', error.message);
      return {
        totalUsers: 0,
        activeUsers: 0,
        totalChecks: 0,
        topTokens: [],
        popularChains: [],
        trendingTokens: [],
        topRatedTokens: []
      };
    }
  }
  
  /**
   * Get top tokens by check count
   * @param {number} limit - Number of tokens to get
   * @returns {Promise<Array>} - Top tokens
   */
  async getTopTokens(limit = 10) {
    try {
      const topTokens = await Interaction.aggregate([
        { $match: { type: constants.interactionTypes.CHECK_TOKEN } },
        { 
          $group: { 
            _id: { 
              token: '$data.token', 
              chain: '$data.chain' 
            },
            count: { $sum: 1 },
            lastChecked: { $max: '$createdAt' }
          } 
        },
        { $sort: { count: -1 } },
        { $limit: limit }
      ]);
      
      // Format the results
      const formattedTokens = topTokens.map(item => ({
        token: item._id.token,
        chain: item._id.chain,
        checkCount: item.count,
        lastChecked: item.lastChecked
      }));
      
      // Try to find symbols for tokens
      for (const token of formattedTokens) {
        try {
          // Check if token exists in TokenRating collection (which has symbol data)
          const ratingData = await TokenRating.findOne({
            contractAddress: token.token,
            chain: token.chain
          });
          
          if (ratingData && ratingData.symbol) {
            token.symbol = ratingData.symbol;
          }
        } catch (error) {
          logger.debug(`Could not fetch symbol for token ${token.token}: ${error.message}`);
        }
      }
      
      return formattedTokens;
    } catch (error) {
      logger.error('Error getting top tokens:', error.message);
      return [];
    }
  }
  
  /**
   * Get popular chains based on token checks
   * @returns {Promise<Array>} - Popular chains
   */
  async getPopularChains() {
    try {
      const popularChains = await Interaction.aggregate([
        { $match: { type: constants.interactionTypes.CHECK_TOKEN } },
        { $group: { _id: '$data.chain', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      
      // Format and enhance with chain details
      return popularChains.map(chain => {
        const chainInfo = constants.chains.find(c => c.id === chain._id) || { id: chain._id, name: chain._id.toUpperCase() };
        return {
          id: chain._id,
          name: chainInfo.name,
          checkCount: chain.count
        };
      });
    } catch (error) {
      logger.error('Error getting popular chains:', error.message);
      return [];
    }
  }
  
  /**
   * Get count of active users within a given time period
   * @param {number} days - Days to consider
   * @returns {Promise<number>} - Active users count
   */
  async getActiveUsersCount(days = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      return await User.countDocuments({
        lastActivity: { $gte: cutoffDate }
      });
    } catch (error) {
      logger.error(`Error getting active users count: ${error.message}`);
      return 0;
    }
  }
  
  /**
   * Get trending tokens based on recent activity
   * @param {number} limit - Number of tokens to get
   * @param {number} days - Days to consider for trending
   * @returns {Promise<Array>} - Trending tokens
   */
  async getTrendingTokens(limit = 5, days = 3) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const trendingTokens = await Interaction.aggregate([
        { 
          $match: { 
            type: constants.interactionTypes.CHECK_TOKEN,
            createdAt: { $gte: cutoffDate }
          } 
        },
        { 
          $group: { 
            _id: { 
              token: '$data.token', 
              chain: '$data.chain' 
            },
            count: { $sum: 1 } 
          } 
        },
        { $sort: { count: -1 } },
        { $limit: limit }
      ]);
      
      // Format the results
      const formattedTokens = trendingTokens.map(item => ({
        token: item._id.token,
        chain: item._id.chain,
        checkCount: item.count
      }));
      
      // Try to find symbols for tokens
      for (const token of formattedTokens) {
        try {
          // Check if token exists in TokenRating collection (which has symbol data)
          const ratingData = await TokenRating.findOne({
            contractAddress: token.token,
            chain: token.chain
          });
          
          if (ratingData && ratingData.symbol) {
            token.symbol = ratingData.symbol;
          }
        } catch (error) {
          logger.debug(`Could not fetch symbol for trending token ${token.token}: ${error.message}`);
        }
      }
      
      return formattedTokens;
    } catch (error) {
      logger.error('Error getting trending tokens:', error.message);
      return [];
    }
  }

  /**
   * Get top rated tokens by community
   * @param {number} limit - Maximum number of tokens to return
   * @returns {Promise<Array>} Array of top rated tokens
   */
  async getTopRatedTokens(limit = 10) {
    try {
      const tokens = await TokenRating.getTopRatedTokens(limit);
      return tokens;
    } catch (error) {
      logger.error(`Error getting top rated tokens: ${error.message}`);
      return [];
    }
  }
}

module.exports = new StatisticsService(); 