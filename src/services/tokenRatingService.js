/**
 * Token Rating Service - Calculates token health metrics based on BubbleMaps data
 */
const logger = require('../utils/logger');
const TokenRating = require('../models/TokenRating');
const User = require('../models/User');
const Interaction = require('../models/Interaction');
const constants = require('../../config/constants');

/**
 * Service for handling token ratings (likes/dislikes)
 */
const tokenRatingService = {
  /**
   * Calculate token health rating
   * @param {Object} mapData - BubbleMaps token map data
   * @param {Object} metaData - BubbleMaps token metadata
   * @returns {Object} - Token health rating metrics
   */
  calculateTokenHealthRating(mapData, metaData) {
    try {
      // Return null if no valid data
      if (!mapData || !mapData.nodes || !metaData) {
        return null;
      }

      // Calculate individual rating components
      const decentralizationScore = this.calculateDecentralizationScore(mapData);
      const holderStabilityScore = this.calculateHolderStabilityScore(mapData);
      const riskConcentrationScore = this.calculateRiskConcentrationScore(mapData);
      const addressActivityScore = this.calculateAddressActivityScore(mapData);

      // Calculate overall health score (weighted average)
      const overallHealthScore = this.calculateOverallHealthScore(
        decentralizationScore,
        holderStabilityScore,
        riskConcentrationScore,
        addressActivityScore
      );

      // Generate rating label based on health score
      const ratingLabel = this.getRatingLabel(overallHealthScore);

      return {
        overallHealthScore,
        ratingLabel,
        components: {
          decentralizationScore,
          holderStabilityScore,
          riskConcentrationScore,
          addressActivityScore
        },
        metadata: {
          totalHolders: mapData.nodes.length,
          totalSupply: metaData.totalSupply || 0,
          tokenSymbol: metaData.symbol || '',
          tokenName: metaData.name || ''
        }
      };
    } catch (error) {
      logger.error('Error calculating token health rating:', error.message);
      return null;
    }
  },

  /**
   * Calculate decentralization score based on distribution of tokens
   * @param {Object} mapData - BubbleMaps token map data
   * @returns {number} - Decentralization score (0-100)
   */
  calculateDecentralizationScore(mapData) {
    try {
      const { nodes } = mapData;
      const totalNodes = nodes.length;
      
      if (totalNodes === 0) return 0;

      // Sort nodes by token value (descending)
      const sortedNodes = [...nodes].sort((a, b) => (b.value || 0) - (a.value || 0));
      
      // Calculate percentage held by top holders
      const top10Percent = this.calculatePercentageHeldByTopN(sortedNodes, 10);
      const top20Percent = this.calculatePercentageHeldByTopN(sortedNodes, 20);
      const top50Percent = this.calculatePercentageHeldByTopN(sortedNodes, 50);
      
      // Calculate Gini coefficient for token distribution
      const giniCoefficient = this.calculateGiniCoefficient(sortedNodes);
      
      // Calculate decentralization score
      // Higher concentration by top holders reduces score
      // Higher Gini coefficient (more inequality) reduces score
      const score = 100 - (
        (top10Percent * 0.4) + // Top 10 holders have the most impact
        (top20Percent * 0.3) + // Top 20 holders have significant impact
        (top50Percent * 0.1) + // Top 50 have less impact
        (giniCoefficient * 20)  // Gini coefficient provides overall inequality measure
      );
      
      return Math.max(0, Math.min(100, Math.round(score)));
    } catch (error) {
      logger.error('Error calculating decentralization score:', error.message);
      return 0;
    }
  },

  /**
   * Calculate holder stability score (placeholder - actual implementation would require historical data)
   * For demonstration, this will generate a random but consistent score per address
   * @param {Object} mapData - BubbleMaps token map data
   * @returns {number} - Holder stability score (0-100)
   */
  calculateHolderStabilityScore(mapData) {
    try {
      const { nodes, edges } = mapData;
      
      if (!nodes || nodes.length === 0) return 0;
      
      // In a real implementation, we would use historical data
      // For now, calculate based on the ratio of edges to nodes
      // More connections between nodes may indicate more trading/movement
      
      const edgeCount = edges ? edges.length : 0;
      const nodeCount = nodes.length;
      const ratio = nodeCount > 0 ? edgeCount / nodeCount : 0;
      
      // Lower ratio could indicate more stability (less movement between addresses)
      const baseScore = Math.max(0, 100 - (ratio * 10));
      
      // Adjust based on the number of large holders
      // More large holders can indicate better distribution and potentially more stability
      const largeHolders = nodes.filter(node => (node.value || 0) > 0.005).length;
      const largeHolderRatio = nodeCount > 0 ? largeHolders / nodeCount : 0;
      const adjustment = largeHolderRatio * 20;
      
      const finalScore = baseScore + adjustment;
      return Math.max(0, Math.min(100, Math.round(finalScore)));
    } catch (error) {
      logger.error('Error calculating holder stability score:', error.message);
      return 0;
    }
  },

  /**
   * Calculate risk concentration score
   * @param {Object} mapData - BubbleMaps token map data
   * @returns {number} - Risk concentration score (0-100, higher is better/less risky)
   */
  calculateRiskConcentrationScore(mapData) {
    try {
      const { nodes } = mapData;
      
      if (!nodes || nodes.length === 0) return 0;
      
      // Sort nodes by value (descending)
      const sortedNodes = [...nodes].sort((a, b) => (b.value || 0) - (a.value || 0));
      
      // Calculate percentage held by single largest holder
      const largestHolderPct = sortedNodes.length > 0 ? (sortedNodes[0].value || 0) * 100 : 0;
      
      // Calculate percentage held by top 5 holders
      const top5Percent = this.calculatePercentageHeldByTopN(sortedNodes, 5);
      
      // Calculate risk score (inverse - higher percentage means higher risk)
      // Largest holder has more impact than next 4 combined
      const riskScore = 100 - ((largestHolderPct * 0.6) + (top5Percent * 0.4));
      
      return Math.max(0, Math.min(100, Math.round(riskScore)));
    } catch (error) {
      logger.error('Error calculating risk concentration score:', error.message);
      return 0;
    }
  },

  /**
   * Calculate address activity score
   * This is a placeholder that estimates activity based on network structure
   * @param {Object} mapData - BubbleMaps token map data
   * @returns {number} - Address activity score (0-100)
   */
  calculateAddressActivityScore(mapData) {
    try {
      const { nodes, edges } = mapData;
      
      if (!nodes || nodes.length === 0) return 0;
      
      // Calculate average connections per node
      const nodeCount = nodes.length;
      const edgeCount = edges ? edges.length : 0;
      const avgConnections = nodeCount > 0 ? edgeCount / nodeCount : 0;
      
      // Calculate network density
      const maxPossibleEdges = nodeCount * (nodeCount - 1) / 2;
      const networkDensity = maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;
      
      // More connections and higher density can indicate more activity
      const baseScore = Math.min(100, (avgConnections * 10) + (networkDensity * 50));
      
      // Adjust for network size (larger networks might naturally have lower density)
      const sizeAdjustment = Math.min(20, Math.log10(nodeCount) * 10);
      
      const finalScore = baseScore + sizeAdjustment;
      return Math.max(0, Math.min(100, Math.round(finalScore)));
    } catch (error) {
      logger.error('Error calculating address activity score:', error.message);
      return 0;
    }
  },

  /**
   * Calculate overall health score as weighted average of component scores
   * @param {number} decentralizationScore - Decentralization score
   * @param {number} holderStabilityScore - Holder stability score
   * @param {number} riskConcentrationScore - Risk concentration score
   * @param {number} addressActivityScore - Address activity score
   * @returns {number} - Overall health score (0-100)
   */
  calculateOverallHealthScore(
    decentralizationScore,
    holderStabilityScore,
    riskConcentrationScore,
    addressActivityScore
  ) {
    // Weights for each component (sum to 1)
    const weights = {
      decentralization: 0.4,    // Most important factor
      holderStability: 0.25,    // Important for long-term health
      riskConcentration: 0.25,  // Important for short-term stability
      addressActivity: 0.1      // Least important but still relevant
    };
    
    // Calculate weighted average
    const weightedScore = (
      (decentralizationScore * weights.decentralization) +
      (holderStabilityScore * weights.holderStability) +
      (riskConcentrationScore * weights.riskConcentration) +
      (addressActivityScore * weights.addressActivity)
    );
    
    return Math.round(weightedScore);
  },

  /**
   * Calculate Gini coefficient for token distribution
   * This measures inequality in distribution (0 = perfect equality, 1 = perfect inequality)
   * @param {Array} sortedNodes - Nodes sorted by value (descending)
   * @returns {number} - Gini coefficient (0-1)
   */
  calculateGiniCoefficient(sortedNodes) {
    if (!sortedNodes || sortedNodes.length === 0) return 0;
    
    const totalNodes = sortedNodes.length;
    const values = sortedNodes.map(node => node.value || 0);
    
    let sumOfAbsoluteDifferences = 0;
    let sumOfValues = 0;
    
    // Calculate sum of absolute differences between all pairs
    for (let i = 0; i < totalNodes; i++) {
      for (let j = 0; j < totalNodes; j++) {
        sumOfAbsoluteDifferences += Math.abs(values[i] - values[j]);
      }
      sumOfValues += values[i];
    }
    
    // Calculate Gini coefficient
    if (sumOfValues === 0) return 0;
    return sumOfAbsoluteDifferences / (2 * totalNodes * sumOfValues);
  },

  /**
   * Calculate percentage of tokens held by top N holders
   * @param {Array} sortedNodes - Nodes sorted by value (descending)
   * @param {number} n - Number of top holders to include
   * @returns {number} - Percentage held by top N holders (0-100)
   */
  calculatePercentageHeldByTopN(sortedNodes, n) {
    if (!sortedNodes || sortedNodes.length === 0) return 0;
    
    const topN = sortedNodes.slice(0, Math.min(n, sortedNodes.length));
    const topNTotal = topN.reduce((total, node) => total + (node.value || 0), 0);
    
    const totalValue = sortedNodes.reduce((total, node) => total + (node.value || 0), 0);
    
    if (totalValue === 0) return 0;
    return (topNTotal / totalValue) * 100;
  },

  /**
   * Get rating label based on health score
   * @param {number} score - Overall health score
   * @returns {string} - Rating label
   */
  getRatingLabel(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Moderate';
    if (score >= 40) return 'Risky';
    if (score >= 20) return 'Poor';
    return 'Critical';
  },

  /**
   * Get token rating by contract address and chain
   * @param {string} contractAddress - Token contract address
   * @param {string} chain - Blockchain chain
   * @returns {Promise<Object>} - Token rating object
   */
  async getTokenRating(contractAddress, chain) {
    try {
      const rating = await TokenRating.findOne({ contractAddress, chain });
      return rating;
    } catch (error) {
      logger.error(`Error getting token rating: ${error.message}`);
      return null;
    }
  },

  /**
   * Toggle like for a token
   * @param {Object} user - User document
   * @param {string} contractAddress - Token contract address
   * @param {string} chain - Blockchain chain
   * @param {string} name - Token name (optional)
   * @param {string} symbol - Token symbol (optional)
   * @returns {Promise<Object>} - Updated token rating
   */
  async toggleLike(user, contractAddress, chain, name = '', symbol = '') {
    try {
      // Get or create token rating
      let tokenRating = await TokenRating.findOrCreate(contractAddress, chain, name, symbol);
      
      // Check if user has already liked the token
      const hasLiked = tokenRating.likedBy.some(userId => userId.equals(user._id));
      
      // Check if user has disliked the token
      const hasDisliked = tokenRating.dislikedBy.some(userId => userId.equals(user._id));
      
      // Handle rating logic
      if (hasLiked) {
        // User already liked it, so remove the like
        tokenRating.likedBy = tokenRating.likedBy.filter(userId => !userId.equals(user._id));
        tokenRating.likesCount--;
        
        // Log interaction
        await Interaction.log(user, constants.interactionTypes.UNLIKE_TOKEN, {
          contract: contractAddress,
          chain: chain
        });
      } else {
        // Add like
        tokenRating.likedBy.push(user._id);
        tokenRating.likesCount++;
        
        // If user had disliked, remove the dislike
        if (hasDisliked) {
          tokenRating.dislikedBy = tokenRating.dislikedBy.filter(userId => !userId.equals(user._id));
          tokenRating.dislikesCount--;
        }
        
        // Log interaction
        await Interaction.log(user, constants.interactionTypes.LIKE_TOKEN, {
          contract: contractAddress,
          chain: chain
        });
      }
      
      tokenRating.lastUpdated = Date.now();
      await tokenRating.save();
      
      return tokenRating;
    } catch (error) {
      logger.error(`Error toggling like for token: ${error.message}`);
      throw error;
    }
  },

  /**
   * Toggle dislike for a token
   * @param {Object} user - User document
   * @param {string} contractAddress - Token contract address
   * @param {string} chain - Blockchain chain
   * @param {string} name - Token name (optional)
   * @param {string} symbol - Token symbol (optional)
   * @returns {Promise<Object>} - Updated token rating
   */
  async toggleDislike(user, contractAddress, chain, name = '', symbol = '') {
    try {
      // Get or create token rating
      let tokenRating = await TokenRating.findOrCreate(contractAddress, chain, name, symbol);
      
      // Check if user has already disliked the token
      const hasDisliked = tokenRating.dislikedBy.some(userId => userId.equals(user._id));
      
      // Check if user has liked the token
      const hasLiked = tokenRating.likedBy.some(userId => userId.equals(user._id));
      
      // Handle rating logic
      if (hasDisliked) {
        // User already disliked it, so remove the dislike
        tokenRating.dislikedBy = tokenRating.dislikedBy.filter(userId => !userId.equals(user._id));
        tokenRating.dislikesCount--;
        
        // Log interaction
        await Interaction.log(user, constants.interactionTypes.UNDISLIKE_TOKEN, {
          contract: contractAddress,
          chain: chain
        });
      } else {
        // Add dislike
        tokenRating.dislikedBy.push(user._id);
        tokenRating.dislikesCount++;
        
        // If user had liked, remove the like
        if (hasLiked) {
          tokenRating.likedBy = tokenRating.likedBy.filter(userId => !userId.equals(user._id));
          tokenRating.likesCount--;
        }
        
        // Log interaction
        await Interaction.log(user, constants.interactionTypes.DISLIKE_TOKEN, {
          contract: contractAddress,
          chain: chain
        });
      }
      
      tokenRating.lastUpdated = Date.now();
      await tokenRating.save();
      
      return tokenRating;
    } catch (error) {
      logger.error(`Error toggling dislike for token: ${error.message}`);
      throw error;
    }
  },

  /**
   * Get user's rating for a token
   * @param {Object} user - User document
   * @param {string} contractAddress - Token contract address
   * @param {string} chain - Blockchain chain
   * @returns {Promise<string|null>} - 'like', 'dislike', or null
   */
  async getUserRatingForToken(user, contractAddress, chain) {
    try {
      const tokenRating = await TokenRating.findOne({ contractAddress, chain });
      
      if (!tokenRating) {
        return null;
      }
      
      if (tokenRating.likedBy.some(userId => userId.equals(user._id))) {
        return 'like';
      }
      
      if (tokenRating.dislikedBy.some(userId => userId.equals(user._id))) {
        return 'dislike';
      }
      
      return null;
    } catch (error) {
      logger.error(`Error getting user rating for token: ${error.message}`);
      return null;
    }
  },

  /**
   * Get top rated tokens
   * @param {number} limit - Number of tokens to return
   * @returns {Promise<Array>} - Array of top rated tokens
   */
  async getTopRatedTokens(limit = 10) {
    try {
      return await TokenRating.getTopRatedTokens(limit);
    } catch (error) {
      logger.error(`Error getting top rated tokens: ${error.message}`);
      return [];
    }
  }
};

module.exports = tokenRatingService; 