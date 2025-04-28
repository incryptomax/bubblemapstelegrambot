require('dotenv').config();
const constants = require('../../config/constants');
const logger = require('./logger');

/**
 * Configuration loader with environment variable validation
 */
const config = {
  // Bot configuration
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN,
    options: {
      polling: true
    }
  },
  
  // Database configuration
  mongodb: {
    uri: process.env.MONGODB_URI
  },
  
  // Admin configuration
  admin: {
    userIds: process.env.ADMIN_USER_IDS ? 
      process.env.ADMIN_USER_IDS.split(',').map(id => id.trim()) : 
      []
  },
  
  // API endpoints from constants
  endpoints: constants.endpoints,
  
  // Chain configuration from constants
  chains: constants.chains,
  defaultChain: constants.defaultChain
};

// Validate required configuration
function validateConfig() {
  let isValid = true;
  
  if (!config.telegram.token) {
    logger.error('Missing TELEGRAM_BOT_TOKEN in environment variables');
    isValid = false;
  }
  
  if (!config.mongodb.uri) {
    logger.error('Missing MONGODB_URI in environment variables');
    isValid = false;
  }
  
  if (config.admin.userIds.length === 0) {
    logger.warn('No admin users configured. Set ADMIN_USER_IDS in environment variables.');
  }
  
  return isValid;
}

// Initialize and validate configuration
config.isValid = validateConfig();

module.exports = config; 