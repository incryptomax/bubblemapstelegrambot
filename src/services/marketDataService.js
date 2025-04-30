const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Service for fetching token market data from various sources
 */
class MarketDataService {
  constructor() {
    this.coingeckoBaseUrl = 'https://api.coingecko.com/api/v3';
    this.cache = new Map();
    this.cacheTTL = 10 * 60 * 1000; // 10 minutes in milliseconds
  }

  /**
   * Get token market data from CoinGecko API
   * @param {string} tokenAddress - Contract address of the token
   * @param {string} chainId - Chain ID in CoinGecko format
   * @returns {Promise<Object>} - Market data or null if not found
   */
  async getTokenMarketData(tokenAddress, chainId) {
    try {
      // Convert chain ID to CoinGecko format
      const geckoChain = this._mapChainIdToGeckoId(chainId);
      if (!geckoChain) {
        logger.warn(`Chain ${chainId} not supported by CoinGecko`);
        return null;
      }

      // Check cache first
      const cacheKey = `${geckoChain}:${tokenAddress.toLowerCase()}`;
      const cachedData = this._getCachedData(cacheKey);
      if (cachedData) return cachedData;

      // Fetch data from CoinGecko
      logger.info(`Fetching market data for ${tokenAddress} on ${chainId} from CoinGecko`);
      
      // Get token info to find CoinGecko ID
      const tokenInfo = await this._getTokenInfo(tokenAddress, geckoChain);
      if (!tokenInfo) {
        logger.warn(`Token ${tokenAddress} not found on CoinGecko`);
        return null;
      }

      // Get market data using CoinGecko ID
      const rawMarketData = await this._getMarketData(tokenInfo.id);
      if (!rawMarketData || !rawMarketData.market_data) {
        logger.warn(`Market data for token ${tokenAddress} not available`);
        return null;
      }
      
      // Extract and format the relevant market data
      const marketData = {
        price: rawMarketData.market_data.current_price?.usd || 0,
        price_change_24h: rawMarketData.market_data.price_change_percentage_24h || 0,
        market_cap: rawMarketData.market_data.market_cap?.usd || 0,
        volume_24h: rawMarketData.market_data.total_volume?.usd || 0
      };

      // Cache the result
      this._cacheData(cacheKey, marketData);
      
      return marketData;
    } catch (error) {
      this._handleApiError(error, 'getTokenMarketData', { tokenAddress, chainId });
      return null;
    }
  }

  /**
   * Get token info from CoinGecko
   * @private
   * @param {string} tokenAddress - Contract address
   * @param {string} geckoChain - Chain ID in CoinGecko format
   * @returns {Promise<Object>} - Token info or null
   */
  async _getTokenInfo(tokenAddress, geckoChain) {
    try {
      const response = await axios.get(`${this.coingeckoBaseUrl}/coins/${geckoChain}/contract/${tokenAddress.toLowerCase()}`, {
        timeout: 5000
      });
      
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return null; // Token not found, return null silently
      }
      logger.error(`Error fetching token info for ${tokenAddress} on ${geckoChain}:`, error.message);
      return null;
    }
  }

  /**
   * Get market data for a token using its CoinGecko ID
   * @private
   * @param {string} coinId - CoinGecko coin ID
   * @returns {Promise<Object>} - Market data or null
   */
  async _getMarketData(coinId) {
    try {
      const response = await axios.get(`${this.coingeckoBaseUrl}/coins/${coinId}`, {
        params: {
          localization: false,
          tickers: false,
          market_data: true,
          community_data: false,
          developer_data: false,
          sparkline: false
        },
        timeout: 5000
      });
      
      return response.data;
    } catch (error) {
      logger.error(`Error fetching market data for coin ID ${coinId}:`, error.message);
      return null;
    }
  }

  /**
   * Map internal chain ID to CoinGecko chain ID
   * @private
   * @param {string} chainId - Internal chain ID
   * @returns {string} - CoinGecko chain ID or null if not supported
   */
  _mapChainIdToGeckoId(chainId) {
    const chainMapping = {
      eth: 'ethereum',
      bsc: 'binance-smart-chain',
      ftm: 'fantom',
      avax: 'avalanche',
      cro: 'cronos',
      arbi: 'arbitrum-one',
      poly: 'polygon-pos',
      base: 'base',
      sol: 'solana',
      sonic: null // Not supported by CoinGecko
    };

    return chainMapping[chainId.toLowerCase()] || null;
  }

  /**
   * Get cached data if valid
   * @private
   * @param {string} key - Cache key
   * @returns {Object|null} - Cached data or null
   */
  _getCachedData(key) {
    const cachedItem = this.cache.get(key);
    if (cachedItem && Date.now() - cachedItem.timestamp < this.cacheTTL) {
      logger.debug(`Using cached market data for ${key}`);
      return cachedItem.data;
    }
    return null;
  }

  /**
   * Cache data with timestamp
   * @private
   * @param {string} key - Cache key
   * @param {Object} data - Data to cache
   */
  _cacheData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
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

module.exports = new MarketDataService(); 