require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const logger = require('./utils/logger');
const config = require('./utils/config');
const userService = require('./services/userService');
const commandHandler = require('./handlers/commandHandler');
const messageHandler = require('./handlers/messageHandler');
const callbackHandler = require('./handlers/callbackHandler');
const adminHandler = require('./handlers/adminHandler');
const screenshotService = require('./services/screenshotService');
const validation = require('./utils/validation');
const formatters = require('./utils/formatters');
const constants = require('../config/constants');
const bubblemapsService = require('./services/bubblemapsService');
const marketDataService = require('./services/marketDataService');

// Initialize Telegram bot
let bot;
// Store bot info to ensure it's available throughout the application
let botInfo = { username: 'bubblemapstelegrambot' };

/**
 * Connect to MongoDB database
 */
async function connectToDatabase() {
  try {
    await mongoose.connect(config.mongodb.uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    logger.info('Connected to MongoDB');
    return true;
  } catch (error) {
    logger.error('Error connecting to MongoDB:', error.message);
    return false;
  }
}

/**
 * Initialize the Telegram bot
 */
async function initializeBot() {
  try {
    // Check if the token is available
    if (!config.telegram.token) {
      logger.error('TELEGRAM_BOT_TOKEN is missing in environment variables');
      return false;
    }
    
    // Create the bot instance with polling options that match all updates in groups
    bot = new TelegramBot(config.telegram.token, {
      polling: true,
      // Include group chat messages that don't explicitly mention the bot
      allowed_updates: ['message', 'callback_query', 'inline_query'],
      // Parse mode for messages sent by the bot
      parse_mode: 'Markdown'
    });
    
    // Get bot info and log it
    try {
      const info = await bot.getMe();
      // Store the bot info globally
      botInfo = info;
      logger.info(`Bot initialized: @${botInfo.username} (${botInfo.id})`);
      logger.info(`Bot can be added to groups: ${botInfo.can_join_groups ? 'Yes' : 'No'}`);
      logger.info(`Bot can read group messages: ${botInfo.can_read_all_group_messages ? 'Yes' : 'No'}`);
      logger.info(`Bot supports inline queries: ${botInfo.supports_inline_queries ? 'Yes' : 'No'}`);
    } catch (botInfoError) {
      logger.error(`Failed to get bot info: ${botInfoError.message}`);
      // We'll continue with default botInfo value
    }
    
    // Set up event handlers
    setupEventHandlers();
    
    // Set up the commands only for private chats, not in groups
    await bot.setMyCommands([
      { command: 'start', description: 'Start the bot' },
      { command: 'help', description: 'Show help information' },
      { command: 'favorites', description: 'View your favorite tokens' },
      { command: 'recent', description: 'View your recently checked tokens' },
      { command: 'topstat', description: 'View community token statistics' }
    ], { scope: { type: 'all_private_chats' } });
    
    // For groups, don't register any commands to keep the bot menu-free
    await bot.setMyCommands([], { scope: { type: 'all_group_chats' } });
    await bot.setMyCommands([], { scope: { type: 'all_chat_administrators' } });
    
    logger.info('Bot initialized successfully');
    return true;
  } catch (error) {
    logger.error('Error initializing bot:', error.message);
    return false;
  }
}

/**
 * Set up event handlers for the Telegram bot
 */
function setupEventHandlers() {
  // Helper function to check if a message is from a group chat
  const isGroupChat = (msg) => msg.chat.type === 'group' || msg.chat.type === 'supergroup';
  
  // Handle /start command
  bot.onText(/\/start/, async (msg) => {
    try {
      // Ignore commands in group chats
      if (isGroupChat(msg)) return;
      
      const user = await userService.getOrCreateUser(msg.from);
      await commandHandler.handleStart(bot, msg, user);
    } catch (error) {
      logger.error('Error handling /start command:', error.message);
    }
  });
  
  // Handle /help command
  bot.onText(/\/help/, async (msg) => {
    try {
      // Ignore commands in group chats
      if (isGroupChat(msg)) return;
      
      const user = await userService.getOrCreateUser(msg.from);
      await commandHandler.handleHelp(bot, msg, user);
    } catch (error) {
      logger.error('Error handling /help command:', error.message);
    }
  });
  
  // Handle /check command
  bot.onText(/\/check(?:\s+(.+))?/, async (msg, match) => {
    try {
      // Ignore commands in group chats
      if (isGroupChat(msg)) return;
      
      const user = await userService.getOrCreateUser(msg.from);
      const args = match[1] ? [match[1]] : [];
      await commandHandler.handleCheck(bot, msg, user, args);
    } catch (error) {
      logger.error('Error handling /check command:', error.message);
    }
  });
  
  // Handle /chain command
  bot.onText(/\/chain(?:\s+(.+))?/, async (msg, match) => {
    try {
      // Ignore commands in group chats
      if (isGroupChat(msg)) return;
      
      const user = await userService.getOrCreateUser(msg.from);
      const args = match[1] ? [match[1]] : [];
      await commandHandler.handleChain(bot, msg, user, args);
    } catch (error) {
      logger.error('Error handling /chain command:', error.message);
    }
  });
  
  // Handle /stats command (admin only)
  bot.onText(/\/stats/, async (msg) => {
    try {
      // Ignore commands in group chats
      if (isGroupChat(msg)) return;
      
      const user = await userService.getOrCreateUser(msg.from);
      await adminHandler.handleStats(bot, msg, user);
    } catch (error) {
      logger.error('Error handling /stats command:', error.message);
    }
  });
  
  // Handle /broadcast command (admin only)
  bot.onText(/\/broadcast/, async (msg) => {
    try {
      // Ignore commands in group chats
      if (isGroupChat(msg)) return;
      
      const user = await userService.getOrCreateUser(msg.from);
      await adminHandler.handleBroadcast(bot, msg, user);
    } catch (error) {
      logger.error('Error handling /broadcast command:', error.message);
    }
  });
  
  // Handle /favorites command
  bot.onText(/\/favorites/, async (msg) => {
    try {
      // Ignore commands in group chats
      if (isGroupChat(msg)) return;
      
      const user = await userService.getOrCreateUser(msg.from);
      await commandHandler.handleFavorites(bot, msg, user);
    } catch (error) {
      logger.error('Error handling /favorites command:', error.message);
    }
  });
  
  // Handle /recent command
  bot.onText(/\/recent/, async (msg) => {
    try {
      // Ignore commands in group chats
      if (isGroupChat(msg)) return;
      
      const user = await userService.getOrCreateUser(msg.from);
      await commandHandler.handleRecent(bot, msg, user);
    } catch (error) {
      logger.error('Error handling /recent command:', error.message);
    }
  });
  
  // Handle /topstat command
  bot.onText(/\/topstat/, async (msg) => {
    try {
      // Ignore commands in group chats
      if (isGroupChat(msg)) return;
      
      const user = await userService.getOrCreateUser(msg.from);
      await commandHandler.handleTopStat(bot, msg, user);
    } catch (error) {
      logger.error('Error handling /topstat command:', error.message);
    }
  });
  
  // Handle callback queries (inline keyboard buttons)
  bot.on('callback_query', async (callbackQuery) => {
    try {
      const user = await userService.getOrCreateUser(callbackQuery.from);
      await callbackHandler.handleCallback(bot, callbackQuery, user);
    } catch (error) {
      logger.error('Error handling callback query:', error.message);
    }
  });
  
  // Handle regular text messages
  bot.on('message', async (msg) => {
    try {
      // Skip if it's a command or not a text message
      if (!msg.text || msg.text.startsWith('/')) {
        return;
      }
      
      // Check if message is from a group
      const isGroupChat = msg.chat.type === 'group' || msg.chat.type === 'supergroup';
      
      // For group chats, process differently - just look for contracts without changing user state
      if (isGroupChat) {
        await handleGroupMessage(bot, msg);
        return;
      }
      
      // For private chats, proceed with normal flow
      const user = await userService.getOrCreateUser(msg.from);
      await messageHandler.handleMessage(bot, msg, user);
    } catch (error) {
      logger.error('Error handling message:', error.message);
    }
  });
  
  // Log errors
  bot.on('polling_error', (error) => {
    logger.error('Polling error:', error.message);
  });
}

/**
 * Handle messages sent in group chats
 * @param {Object} bot - Telegram bot instance
 * @param {Object} msg - Message object
 */
async function handleGroupMessage(bot, msg) {
  try {
    const chatId = msg.chat.id;
    const text = msg.text.trim();
    
    // Add debug logging
    logger.debug(`Processing group message in chat ${msg.chat.title || 'Unknown'} (${chatId}): "${text}"`);
    
    // Extract contract address from the message
    const contractAddress = validation.extractContractAddress(text);
    
    if (!contractAddress) {
      // No contract address found, do nothing
      logger.debug(`No contract address found in message: "${text}"`);
      return;
    }
    
    // Log the detected contract in a group
    logger.info(`Contract address detected in group ${msg.chat.title || 'Unknown'} (${chatId}): ${contractAddress}`);
    
    try {
      // Send a brief "processing" message that can be edited later
      const processingMsg = await bot.sendMessage(chatId, '🔍 Contract detected! Analyzing token...', {
        reply_to_message_id: msg.message_id
      });
      
      // Auto-detect chain if not provided
      let chainToUse;
      
      if (contractAddress.startsWith('0x')) {
        // For EVM addresses, use the multi-chain detection
        logger.debug(`Detecting chain for EVM address: ${contractAddress}`);
        chainToUse = await validation.detectEVMChain(contractAddress);
        
        // If we couldn't detect, use default chain
        if (!chainToUse) {
          logger.debug(`Failed to detect chain, using default: ${constants.defaultChain}`);
          chainToUse = constants.defaultChain;
        } else {
          logger.debug(`Detected chain: ${chainToUse}`);
        }
      } else {
        // For Solana addresses
        logger.debug(`Non-EVM address detected, using Solana chain`);
        chainToUse = 'sol';
      }
      
      // Update the processing message
      await bot.editMessageText('⏳ Processing token data...', {
        chat_id: chatId,
        message_id: processingMsg.message_id
      }).catch(err => {
        logger.error(`Error updating processing message: ${err.message}`);
      });
      
      try {
        // Check if token is available in Bubblemaps
        logger.debug(`Validating contract ${contractAddress} on chain ${chainToUse}`);
        const isValid = await bubblemapsService.validateContract(contractAddress, chainToUse);
        
        if (!isValid) {
          logger.debug(`Contract validation failed for ${contractAddress} on chain ${chainToUse}`);
          await bot.editMessageText('❌ Data not available for this token. It may not be computed by Bubblemaps yet.', {
            chat_id: chatId,
            message_id: processingMsg.message_id
          }).catch(err => {
            logger.error(`Error updating validation failure message: ${err.message}`);
          });
          return;
        }
        
        logger.debug(`Contract validation successful for ${contractAddress} on chain ${chainToUse}`);
        
        // Fetch token data, metadata and market data (limited info for group chats)
        const [mapData, metaData, marketData] = await Promise.all([
          bubblemapsService.getTokenMapData(contractAddress, chainToUse),
          bubblemapsService.getTokenMetadata(contractAddress, chainToUse),
          marketDataService.getTokenMarketData(contractAddress, chainToUse)
        ]);
        
        // Generate the bubble map URL
        const mapUrl = bubblemapsService.generateMapUrl(contractAddress, chainToUse);
        logger.debug(`Generated map URL: ${mapUrl}`);
        
        // Format a brief version of token info for group chats
        const briefTokenInfo = formatters.formatBriefTokenInfo(mapData, metaData, chainToUse, marketData);
        
        // Check if we have bot info available
        const botUsername = botInfo?.username || 'bubblemapstelegrambot';
        logger.debug(`Using bot username for deep link: ${botUsername}`);
        
        // Create improved reply markup with two buttons
        const replyMarkup = {
          inline_keyboard: [
            [
              { text: '🔍 Check more details', url: `https://t.me/${botUsername}?start=check_${chainToUse}_${contractAddress}` },
              { text: '🗺️ View BubbleMap', url: mapUrl }
            ]
          ]
        };
        
        try {
          // Get the screenshot using the screenshot service
          logger.debug(`Capturing screenshot for ${contractAddress} on chain ${chainToUse}`);
          const screenshotBuffer = await screenshotService.captureMapScreenshot(contractAddress, chainToUse);
          
          if (screenshotBuffer) {
            logger.debug(`Screenshot captured successfully, size: ${screenshotBuffer.length} bytes`);
            // Delete the processing message
            await bot.deleteMessage(chatId, processingMsg.message_id).catch((err) => {
              logger.error(`Failed to delete processing message: ${err.message}`);
            });
            
            // Send the screenshot with token info as caption
            await bot.sendPhoto(chatId, screenshotBuffer, {
              caption: briefTokenInfo,
              parse_mode: 'Markdown',
              reply_markup: replyMarkup,
              reply_to_message_id: msg.message_id
            }).catch(err => {
              logger.error(`Error sending photo: ${err.message}`);
              // If sending photo fails, try text-only fallback
              bot.sendMessage(chatId, briefTokenInfo, {
                parse_mode: 'Markdown',
                disable_web_page_preview: true,
                reply_markup: replyMarkup,
                reply_to_message_id: msg.message_id
              }).catch(innerErr => {
                logger.error(`Error sending text fallback: ${innerErr.message}`);
              });
            });
          } else {
            logger.debug(`No screenshot captured, sending text-only message`);
            // If screenshot failed, send text-only message
            await bot.editMessageText(briefTokenInfo, {
              chat_id: chatId,
              message_id: processingMsg.message_id,
              parse_mode: 'Markdown',
              disable_web_page_preview: true,
              reply_markup: replyMarkup
            }).catch(err => {
              logger.error(`Error updating message with text: ${err.message}`);
              // If editing fails, try sending a new message
              bot.sendMessage(chatId, briefTokenInfo, {
                parse_mode: 'Markdown',
                disable_web_page_preview: true,
                reply_markup: replyMarkup,
                reply_to_message_id: msg.message_id
              }).catch(innerErr => {
                logger.error(`Error sending fallback message: ${innerErr.message}`);
              });
            });
          }
        } catch (screenshotError) {
          logger.error(`Error with screenshot in group: ${screenshotError.message}`);
          
          // If screenshot fails, send text-only message
          await bot.editMessageText(briefTokenInfo, {
            chat_id: chatId,
            message_id: processingMsg.message_id,
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
            reply_markup: replyMarkup
          }).catch(err => {
            logger.error(`Error updating message after screenshot failure: ${err.message}`);
            // If editing fails, try sending a new message
            bot.sendMessage(chatId, briefTokenInfo, {
              parse_mode: 'Markdown',
              disable_web_page_preview: true,
              reply_markup: replyMarkup,
              reply_to_message_id: msg.message_id
            }).catch(innerErr => {
              logger.error(`Error sending fallback message after screenshot failure: ${innerErr.message}`);
            });
          });
        }
        
        logger.info(`Successfully processed contract ${contractAddress} on chain ${chainToUse} in group ${msg.chat.title || 'Unknown'}`);
      } catch (dataError) {
        logger.error(`Error fetching token data for group: ${dataError.message}`);
        await bot.editMessageText(constants.messages.tokenDataError, {
          chat_id: chatId,
          message_id: processingMsg.message_id
        }).catch(err => {
          logger.error(`Error updating message with error: ${err.message}`);
          // If editing fails, try sending a new message
          bot.sendMessage(chatId, constants.messages.tokenDataError, {
            reply_to_message_id: msg.message_id
          }).catch(innerErr => {
            logger.error(`Error sending fallback error message: ${innerErr.message}`);
          });
        });
      }
    } catch (messageError) {
      logger.error(`Error sending/updating messages in group: ${messageError.message}`);
      // Try a direct message as fallback
      bot.sendMessage(chatId, 'Error processing token data. Please try again later.', {
        reply_to_message_id: msg.message_id
      }).catch(() => {
        logger.error(`Failed to send even the fallback error message to group ${chatId}`);
      });
    }
  } catch (error) {
    logger.error(`Error handling group message: ${error.message}`);
    // In group chats, we might want to stay silent on errors
  }
}

/**
 * Main application entry point
 */
async function main() {
  try {
    // Connect to the database
    const dbConnected = await connectToDatabase();
    if (!dbConnected) {
      logger.error('Failed to connect to the database. Exiting...');
      process.exit(1);
    }
    
    // Initialize bot
    const botInitialized = await initializeBot();
    if (!botInitialized) {
      logger.error('Failed to initialize bot. Exiting...');
      process.exit(1);
    }
    
    logger.info('Application started successfully');
  } catch (error) {
    logger.error('Error in main function:', error.message);
    process.exit(1);
  }
}

// Start the application
main();

// Handle process termination
process.on('SIGINT', async () => {
  logger.info('Received SIGINT. Shutting down gracefully...');
  
  if (bot) {
    bot.stopPolling();
  }
  
  await mongoose.connection.close();
  
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM. Shutting down gracefully...');
  
  if (bot) {
    bot.stopPolling();
  }
  
  await mongoose.connection.close();
  
  process.exit(0);
}); 