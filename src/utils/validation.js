const constants = require('../../config/constants');

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