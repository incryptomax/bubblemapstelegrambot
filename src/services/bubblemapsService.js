const axios = require('axios');
const config = require('../utils/config');
const logger = require('../utils/logger');

/**
 * Service for interacting with Bubblemaps API
 */
class BubblemapsService {
  /**
   * Get token map data from Bubblemaps API
   * @param {string} token - Contract address
   * @param {string} chain - Chain ID
   * @returns {Promise<Object>} - Map data
   */
  async getTokenMapData(token, chain) {
    try {
      logger.info(`Fetching map data for token ${token} on chain ${chain}`);
      
      const response = await axios.get(config.endpoints.mapData, {
        params: {
          token,
          chain
        },
        timeout: 10000 // 10 seconds timeout
      });
      
      return response.data;
    } catch (error) {
      this._handleApiError(error, 'getTokenMapData', { token, chain });
      return null;
    }
  }
  
  /**
   * Get token metadata from Bubblemaps API
   * @param {string} token - Contract address
   * @param {string} chain - Chain ID
   * @returns {Promise<Object>} - Token metadata
   */
  async getTokenMetadata(token, chain) {
    try {
      logger.info(`Fetching metadata for token ${token} on chain ${chain}`);
      
      const response = await axios.get(config.endpoints.mapMetadata, {
        params: {
          token,
          chain
        },
        timeout: 10000 // 10 seconds timeout
      });
      
      // Check if the response indicates data is not available
      if (response.data.status === 'KO') {
        logger.warn(`Metadata not available for token ${token} on chain ${chain}: ${response.data.message}`);
        return null;
      }
      
      return response.data;
    } catch (error) {
      this._handleApiError(error, 'getTokenMetadata', { token, chain });
      return null;
    }
  }
  
  /**
   * Generate a URL to view the map on Bubblemaps
   * @param {string} token - Contract address
   * @param {string} chain - Chain ID
   * @returns {string} - URL to the map
   */
  generateMapUrl(token, chain) {
    return `${config.endpoints.bubblemapsUrl}${chain}/token/${token}`;
  }
  
  /**
   * Validate if a contract is supported
   * @param {string} token - Contract address
   * @param {string} chain - Chain ID
   * @returns {Promise<boolean>} - True if supported, false otherwise
   */
  async validateContract(token, chain) {
    try {
      const metadata = await this.getTokenMetadata(token, chain);
      return metadata && metadata.status === 'OK';
    } catch (error) {
      logger.error(`Error validating contract ${token} on chain ${chain}:`, error.message);
      return false;
    }
  }
  
  /**
   * Handle API errors
   * @private
   * @param {Error} error - Error object
   * @param {string} method - Method name
   * @param {Object} params - Request parameters
   */
  _handleApiError(error, method, params) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      logger.error(`${method} API error ${error.response.status}:`, 
        error.response.data, params);
    } else if (error.request) {
      // The request was made but no response was received
      logger.error(`${method} API no response:`, error.message, params);
    } else {
      // Something happened in setting up the request
      logger.error(`${method} API request error:`, error.message, params);
    }
  }
}

module.exports = new BubblemapsService(); 