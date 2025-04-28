const { Telegraf, session } = require('telegraf');
const config = require('../config');
const logger = require('../utils/logger');
const { handleStart } = require('./handlers/startHandler');
const { handleHelp } = require('./handlers/helpHandler');
const { handleInfo } = require('./handlers/infoHandler');
const { handleAdminCommands } = require('./handlers/adminHandler');
const { handleTokenCommand, handleTokenInfo, handleBubbleMap, handleQuickBubbleMap } = require('./handlers/tokenHandler');
const { handleAbout } = require('./handlers/aboutHandler');

/**
 * Initialize Telegram bot
 * @returns {Telegraf} Telegraf bot instance
 */
async function initBot() {
  const bot = new Telegraf(config.TELEGRAM_BOT_TOKEN);
  
  // Set up logging middleware
  bot.use(async (ctx, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    const user = ctx.from ? `${ctx.from.id} (${ctx.from.username || 'anonymous'})` : 'unknown user';
    logger.info(`${user} - ${ctx.updateType} processed in ${ms}ms`);
  });
  
  setupHandlers(bot);
  return bot;
}

/**
 * Set up handlers for all messages and callbacks
 * @param {Telegraf} bot - Telegraf bot instance
 */
function setupHandlers(bot) {
  // Command handlers
  bot.start(handleStart);
  bot.help(handleHelp);
  bot.command('token', handleTokenCommand);
  
  // Admin handlers
  bot.command('admin', handleAdminCommands);
  
  // Callback handlers
  bot.action(/^token_(.+)_(.+)$/, handleTokenInfo);
  bot.action(/^bubble_(.+)_(.+)$/, handleBubbleMap);
  bot.action(/^quick_(.+)_(.+)$/, handleQuickBubbleMap);
  
  // Handle unknown commands and token addresses
  bot.on('text', async (ctx) => {
    // Check if the message is a token address
    const text = ctx.message.text.trim();
    if (text.startsWith('0x') && text.length >= 40) {
      // If it looks like a token address, handle it as a token command
      ctx.message.text = `/token ${text}`;
      return handleTokenCommand(ctx);
    }
    
    await ctx.reply('I don\'t understand this command. Use /help to see available commands.');
  });
  
  // Handle callback queries
  bot.on('callback_query', async (ctx) => {
    const callbackData = ctx.callbackQuery.data;
    
    try {
      if (callbackData.startsWith('token_')) {
        await handleTokenInfo(ctx);
      } else if (callbackData.startsWith('bubble_')) {
        await handleBubbleMap(ctx);
      } else if (callbackData.startsWith('quick_')) {
        await handleQuickBubbleMap(ctx);
      } else {
        await ctx.answerCallbackQuery('Unknown request');
      }
    } catch (error) {
      logger.error(`Error handling callback query: ${error.message}`);
      await ctx.answerCallbackQuery('An error occurred while processing your request');
    }
  });
  
  // Error handler
  bot.catch((err, ctx) => {
    logger.error(`Error for ${ctx.updateType}: ${err}`);
    ctx.reply('An error occurred while processing your request. Please try again later.');
  });
}

/**
 * Start the bot
 */
function startBot() {
  const bot = initBot();
  bot.launch()
    .then(() => {
      logger.info('Bot successfully started');
    })
    .catch((err) => {
      logger.error(`Error starting bot: ${err}`);
      process.exit(1);
    });
    
  // Handle graceful shutdown
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

module.exports = {
  startBot
};
 