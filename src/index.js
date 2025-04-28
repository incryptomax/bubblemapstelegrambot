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

// Initialize Telegram bot
let bot;

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
    
    // Create the bot instance
    bot = new TelegramBot(config.telegram.token, config.telegram.options);
    
    // Set up event handlers
    setupEventHandlers();
    
    // Set up the commands
    await bot.setMyCommands([
      { command: 'start', description: 'Start the bot' },
      { command: 'help', description: 'Show help information' },
      { command: 'favorites', description: 'View your favorite tokens' },
      { command: 'recent', description: 'View your recently checked tokens' },
      { command: 'topstat', description: 'View community token statistics' }
    ]);
    
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
  // Handle /start command
  bot.onText(/\/start/, async (msg) => {
    try {
      const user = await userService.getOrCreateUser(msg.from);
      await commandHandler.handleStart(bot, msg, user);
    } catch (error) {
      logger.error('Error handling /start command:', error.message);
    }
  });
  
  // Handle /help command
  bot.onText(/\/help/, async (msg) => {
    try {
      const user = await userService.getOrCreateUser(msg.from);
      await commandHandler.handleHelp(bot, msg, user);
    } catch (error) {
      logger.error('Error handling /help command:', error.message);
    }
  });
  
  // Handle /check command
  bot.onText(/\/check(?:\s+(.+))?/, async (msg, match) => {
    try {
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
      const user = await userService.getOrCreateUser(msg.from);
      await adminHandler.handleStats(bot, msg, user);
    } catch (error) {
      logger.error('Error handling /stats command:', error.message);
    }
  });
  
  // Handle /broadcast command (admin only)
  bot.onText(/\/broadcast/, async (msg) => {
    try {
      const user = await userService.getOrCreateUser(msg.from);
      await adminHandler.handleBroadcast(bot, msg, user);
    } catch (error) {
      logger.error('Error handling /broadcast command:', error.message);
    }
  });
  
  // Handle /favorites command
  bot.onText(/\/favorites/, async (msg) => {
    try {
      const user = await userService.getOrCreateUser(msg.from);
      await commandHandler.handleFavorites(bot, msg, user);
    } catch (error) {
      logger.error('Error handling /favorites command:', error.message);
    }
  });
  
  // Handle /recent command
  bot.onText(/\/recent/, async (msg) => {
    try {
      const user = await userService.getOrCreateUser(msg.from);
      await commandHandler.handleRecent(bot, msg, user);
    } catch (error) {
      logger.error('Error handling /recent command:', error.message);
    }
  });
  
  // Handle /topstat command
  bot.onText(/\/topstat/, async (msg) => {
    try {
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