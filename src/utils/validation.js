const constants = require('../../config/constants');
const bubblemapsService = require('../services/bubblemapsService');
const logger = require('./logger');

/**
 * Validation utilities
 */
module.exports = {
  /**
   * Validate if the provided string is a valid contract address
   * @param {string} address - The contract address to validate
   * @returns {boolean} - True if valid, false otherwise
   */
  isValidContractAddress: (address) => {
    if (!address || typeof address !== 'string') {
      return false;
    }
    
    // Basic Ethereum/EVM address validation (0x followed by 40 hex characters)
    const evmRegex = /^0x[a-fA-F0-9]{40}$/;
    
    // For Solana, addresses are base58 encoded and typically 32-44 characters
    const solanaRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    
    return evmRegex.test(address) || solanaRegex.test(address);
  },
  
  /**
   * Detect chain type from contract address format
   * @param {string} address - The contract address
   * @returns {string} - Chain ID (e.g., 'sol' for Solana or default chain for EVM)
   */
  detectChainFromAddress: (address) => {
    if (!address || typeof address !== 'string') {
      return constants.defaultChain;
    }
    
    // Check if it's a Solana address (base58 encoded, 32-44 characters)
    const solanaRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    if (solanaRegex.test(address) && !address.startsWith('0x')) {
      return 'sol';
    }
    
    // Default to user's preferred chain for EVM addresses
    return constants.defaultChain;
  },
  
  /**
   * Detect chain for EVM address by checking multiple chains in parallel
   * @param {string} address - Contract address (EVM format)
   * @returns {Promise<string>} - Detected chain ID or default chain if detection fails
   */
  detectEVMChain: async (address) => {
    // Only process EVM addresses
    if (!address || typeof address !== 'string' || !address.startsWith('0x')) {
      return constants.defaultChain;
    }
    
    try {
      logger.info(`Attempting to detect chain for EVM address: ${address}`);
      
      // List of chains to check (excluding Solana)
      const chainsToCheck = constants.chains
        .filter(chain => chain.id !== 'sol')
        .map(chain => chain.id);
      
      // Check all chains in parallel
      const results = await Promise.allSettled(
        chainsToCheck.map(chain => 
          bubblemapsService.validateContract(address, chain)
        )
      );
      
      // Find the first chain that returns valid data
      for (let i = 0; i < results.length; i++) {
        if (results[i].status === 'fulfilled' && results[i].value === true) {
          const detectedChain = chainsToCheck[i];
          logger.info(`Chain detected for ${address}: ${detectedChain}`);
          return detectedChain;
        }
      }
      
      // If no chain is detected, log and return default
      logger.info(`No chain detected for ${address}, using default: ${constants.defaultChain}`);
      return constants.defaultChain;
    } catch (error) {
      logger.error(`Error in detectEVMChain for ${address}:`, error.message);
      return constants.defaultChain;
    }
  },
  
  /**
   * Validate if the provided chain ID is supported
   * @param {string} chain - The chain ID to validate
   * @returns {boolean} - True if valid, false otherwise
   */
  isValidChain: (chain) => {
    if (!chain || typeof chain !== 'string') {
      return false;
    }
    
    return constants.chains.some(c => c.id === chain.toLowerCase());
  },
  
  /**
   * Check if a user is an admin
   * @param {number|string} userId - Telegram user ID
   * @returns {boolean} - True if user is admin, false otherwise
   */
  isAdmin: (userId) => {
    if (!userId) return false;
    
    const adminIds = process.env.ADMIN_USER_IDS ? 
      process.env.ADMIN_USER_IDS.split(',').map(id => id.trim()) : 
      [];
      
    return adminIds.includes(userId.toString());
  },
  
  /**
   * Extract contract address from message text
   * @param {string} text - Message text that may contain a contract address
   * @returns {string|null} - Extracted contract address or null if not found
   */
  extractContractAddress: (text) => {
    if (!text || typeof text !== 'string') {
      return null;
    }
    
    // Try to find EVM address pattern (0x followed by 40 hex characters)
    const evmMatch = text.match(/0x[a-fA-F0-9]{40}/);
    if (evmMatch) {
      return evmMatch[0];
    }
    
    // Try to find Solana address pattern
    const solanaMatch = text.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
    if (solanaMatch) {
      return solanaMatch[0];
    }
    
    return null;
  }
}; 