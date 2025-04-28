/**
 * Token Rating Service - Calculates token health metrics based on BubbleMaps data
 */
const logger = require('../utils/logger');

class TokenRatingService {
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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }
}

module.exports = new TokenRatingService(); 