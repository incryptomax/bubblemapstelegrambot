const constants = require('../../config/constants');
const validation = require('../utils/validation');
const logger = require('../utils/logger');
const userService = require('../services/userService');
const adminService = require('../services/adminService');
const bubblemapsService = require('../services/bubblemapsService');
const formatters = require('../utils/formatters');
const marketDataService = require('../services/marketDataService');
const screenshotService = require('../services/screenshotService');

/**
 * Handle /start command
 * @param {Object} bot - Telegram bot instance
 * @param {Object} msg - Telegram message object
 * @param {Object} user - User document
 */
async function handleStart(bot, msg, user) {
  const chatId = msg.chat.id;
  
  try {
    // Track the interaction
    await userService.trackInteraction(user, constants.interactionTypes.START);
    
    // Send welcome message with inline keyboard
    const keyboard = {
      inline_keyboard: [
        [
          { text: 'Check a token', callback_data: 'check_token' },
          { text: 'Change chain', callback_data: 'change_chain' }
        ],
        [
          { text: 'Help', callback_data: 'help' }
        ]
      ]
    };
    
    await bot.sendMessage(chatId, constants.messages.welcome, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
    
    logger.info(`User ${user.telegramId} started the bot`);
  } catch (error) {
    logger.error(`Error handling /start command for user ${user.telegramId}:`, error.message);
    await bot.sendMessage(chatId, constants.messages.error);
  }
}

/**
 * Handle /help command
 * @param {Object} bot - Telegram bot instance
 * @param {Object} msg - Telegram message object
 * @param {Object} user - User document
 */
async function handleHelp(bot, msg, user) {
  const chatId = msg.chat.id;
  
  try {
    // Track the interaction
    await userService.trackInteraction(user, constants.interactionTypes.HELP);
    
    // Send help message
    await bot.sendMessage(chatId, constants.messages.help, {
      parse_mode: 'Markdown'
    });
    
    logger.info(`User ${user.telegramId} requested help`);
  } catch (error) {
    logger.error(`Error handling /help command for user ${user.telegramId}:`, error.message);
    await bot.sendMessage(chatId, constants.messages.error);
  }
}

/**
 * Handle /check command
 * @param {Object} bot - Telegram bot instance
 * @param {Object} msg - Telegram message object
 * @param {Object} user - User document
 * @param {Array} args - Command arguments
 */
async function handleCheck(bot, msg, user, args) {
  const chatId = msg.chat.id;
  
  try {
    // Check if contract address is provided
    let contractAddress = args.length > 0 ? validation.extractContractAddress(args[0]) : null;
    
    if (!contractAddress) {
      // Prompt user to enter contract address
      await userService.updateUserState(user, 'awaiting_contract');
      
      await bot.sendMessage(chatId, 'Please enter the contract address you want to check:');
      return;
    }
    
    // Automatically detect chain for Solana addresses
    const detectedChain = validation.detectChainFromAddress(contractAddress);
    const chainToUse = detectedChain === 'sol' ? 'sol' : user.preferredChain;
    
    // Process the contract check
    await processContractCheck(bot, chatId, user, contractAddress, chainToUse);
  } catch (error) {
    logger.error(`Error handling /check command for user ${user.telegramId}:`, error.message);
    await bot.sendMessage(chatId, constants.messages.error);
  }
}

/**
 * Handle /chain command
 * @param {Object} bot - Telegram bot instance
 * @param {Object} msg - Telegram message object
 * @param {Object} user - User document
 * @param {Array} args - Command arguments
 */
async function handleChain(bot, msg, user, args) {
  const chatId = msg.chat.id;
  
  try {
    // Check if chain is provided
    if (args.length > 0) {
      const chain = args[0].toLowerCase();
      
      if (validation.isValidChain(chain)) {
        await userService.updatePreferredChain(user, chain);
        
        // Track interaction
        await userService.trackInteraction(user, constants.interactionTypes.CHANGE_CHAIN, { chain });
        
        // Confirm chain change
        const chainName = constants.chains.find(c => c.id === chain)?.name || chain.toUpperCase();
        await bot.sendMessage(chatId, `${constants.messages.chainSet}${chainName}`);
        
        logger.info(`User ${user.telegramId} changed chain to ${chain}`);
      } else {
        // Send error message with available chains
        const availableChains = constants.chains.map(c => c.id).join(', ');
        await bot.sendMessage(chatId, `Invalid chain. Available chains: ${availableChains}`);
      }
      return;
    }
    
    // No chain provided, show chain selection keyboard
    await showChainSelection(bot, chatId, user);
  } catch (error) {
    logger.error(`Error handling /chain command for user ${user.telegramId}:`, error.message);
    await bot.sendMessage(chatId, constants.messages.error);
  }
}

/**
 * Handle /stats command (admin only)
 * @param {Object} bot - Telegram bot instance
 * @param {Object} msg - Telegram message object
 * @param {Object} user - User document
 */
async function handleStats(bot, msg, user) {
  const chatId = msg.chat.id;
  
  try {
    // Check if user is admin
    if (!user.isAdmin) {
      await bot.sendMessage(chatId, constants.messages.adminOnly);
      return;
    }
    
    // Track interaction
    await userService.trackInteraction(user, constants.interactionTypes.STATS);
    
    // Send processing message
    const processingMsg = await bot.sendMessage(chatId, 'Fetching statistics...');
    
    // Get system stats
    const systemStats = await adminService.getSystemStats();
    
    // Format stats
    const statsMessage = formatters.formatUserStats(systemStats.userStats);
    
    // Send stats
    await bot.sendMessage(chatId, statsMessage, {
      parse_mode: 'Markdown'
    });
    
    // Cleanup processing message
    await bot.deleteMessage(chatId, processingMsg.message_id);
    
    logger.info(`Admin ${user.telegramId} requested stats`);
  } catch (error) {
    logger.error(`Error handling /stats command for user ${user.telegramId}:`, error.message);
    await bot.sendMessage(chatId, constants.messages.error);
  }
}

/**
 * Handle /broadcast command (admin only)
 * @param {Object} bot - Telegram bot instance
 * @param {Object} msg - Telegram message object
 * @param {Object} user - User document
 * @param {Array} args - Command arguments
 */
async function handleBroadcast(bot, msg, user, args) {
  const chatId = msg.chat.id;
  
  try {
    // Check if user is admin
    if (!user.isAdmin) {
      await bot.sendMessage(chatId, constants.messages.adminOnly);
      return;
    }
    
    // Set user state to awaiting broadcast message
    await userService.updateUserState(user, 'awaiting_broadcast_message');
    
    // Send instruction
    await bot.sendMessage(chatId, constants.messages.broadcastInit, {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Cancel', callback_data: 'cancel_broadcast' }]
        ]
      }
    });
    
    logger.info(`Admin ${user.telegramId} initiated broadcast`);
  } catch (error) {
    logger.error(`Error handling /broadcast command for user ${user.telegramId}:`, error.message);
    await bot.sendMessage(chatId, constants.messages.error);
  }
}

/**
 * Process a contract check
 * @param {Object} bot - Telegram bot instance
 * @param {number} chatId - Chat ID
 * @param {Object} user - User document
 * @param {string} contractAddress - Contract address
 * @param {string} chain - Chain ID
 */
async function processContractCheck(bot, chatId, user, contractAddress, chain) {
  try {
    // Validate contract address
    if (!validation.isValidContractAddress(contractAddress)) {
      await bot.sendMessage(chatId, constants.messages.invalidContract);
      return;
    }
    
    // Send processing message
    const processingMsg = await bot.sendMessage(chatId, constants.messages.processing);
    
    // Track the interaction
    await userService.trackInteraction(user, constants.interactionTypes.CHECK_TOKEN, {
      token: contractAddress,
      chain
    });
    
    // Check if token is available in Bubblemaps
    const isValid = await bubblemapsService.validateContract(contractAddress, chain);
    
    if (!isValid) {
      await bot.deleteMessage(chatId, processingMsg.message_id);
      await bot.sendMessage(chatId, constants.messages.dataNotAvailable);
      return;
    }
    
    try {
      // Fetch token data and market data first
      const [mapData, metaData, marketData] = await Promise.all([
        bubblemapsService.getTokenMapData(contractAddress, chain),
        bubblemapsService.getTokenMetadata(contractAddress, chain),
        marketDataService.getTokenMarketData(contractAddress, chain)
      ]);
      
      // Generate the bubble map URL
      const mapUrl = bubblemapsService.generateMapUrl(contractAddress, chain);
      
      // Format the token info message
      const tokenInfo = formatters.formatTokenInfo(mapData, metaData, chain, marketData);
      
      // Delete processing message
      await bot.deleteMessage(chatId, processingMsg.message_id).catch(err => {
        logger.warn(`Error deleting processing message: ${err.message}`);
      });

      try {
        // Get the screenshot using the screenshot service
        const screenshotBuffer = await screenshotService.captureMapScreenshot(contractAddress, chain);
        
        if (screenshotBuffer) {
          // Send the screenshot with token info as caption
          await bot.sendPhoto(chatId, screenshotBuffer, {
            caption: tokenInfo,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: 'View on BubbleMaps', url: mapUrl }],
                [{ text: 'Check Another Token', callback_data: 'check_token' }]
              ]
            }
          });
        } else {
          // If screenshot failed, send text-only message
          await bot.sendMessage(chatId, tokenInfo, {
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
            reply_markup: {
              inline_keyboard: [
                [{ text: 'View on BubbleMaps', url: mapUrl }],
                [{ text: 'Check Another Token', callback_data: 'check_token' }]
              ]
            }
          });
        }
      } catch (screenshotError) {
        logger.error(`Error with screenshot: ${screenshotError.message}`);
        
        // If screenshot fails, send text-only message
        await bot.sendMessage(chatId, tokenInfo, {
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
          reply_markup: {
            inline_keyboard: [
              [{ text: 'View on BubbleMaps', url: mapUrl }],
              [{ text: 'Check Another Token', callback_data: 'check_token' }]
            ]
          }
        });
      }
      
      logger.info(`User ${user.telegramId} checked token ${contractAddress} on chain ${chain}`);
    } catch (dataError) {
      logger.error(`Error fetching token data: ${dataError.message}`);
      await bot.deleteMessage(chatId, processingMsg.message_id).catch(() => {});
      await bot.sendMessage(chatId, constants.messages.tokenDataError);
    }
  } catch (error) {
    logger.error(`Error processing contract check for user ${user.telegramId}:`, error.message);
    await bot.sendMessage(chatId, constants.messages.error);
  }
}

/**
 * Show chain selection keyboard
 * @param {Object} bot - Telegram bot instance
 * @param {number} chatId - Chat ID
 * @param {Object} user - User document
 */
async function showChainSelection(bot, chatId, user) {
  try {
    // Build chain selection keyboard
    const keyboard = {
      inline_keyboard: constants.chains.map(chain => {
        return [{ text: chain.name, callback_data: `set_chain:${chain.id}` }];
      })
    };
    
    // Set user state
    await userService.updateUserState(user, 'awaiting_chain');
    
    // Send message with keyboard
    await bot.sendMessage(chatId, constants.messages.selectChain, {
      reply_markup: keyboard
    });
    
    logger.info(`Showed chain selection to user ${user.telegramId}`);
  } catch (error) {
    logger.error(`Error showing chain selection to user ${user.telegramId}:`, error.message);
    await bot.sendMessage(chatId, constants.messages.error);
  }
}

module.exports = {
  handleStart,
  handleHelp,
  handleCheck,
  handleChain,
  handleStats,
  handleBroadcast,
  processContractCheck,
  showChainSelection
}; 