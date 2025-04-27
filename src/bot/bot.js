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
    const user = ctx.from ? `${ctx.from.id} (${ctx.from.username || 'безымянный'})` : 'неизвестный пользователь';
    logger.info(`${user} - ${ctx.updateType} processed in ${ms}ms`);
  });
  
  setupHandlers(bot);
  return bot;
}

/**
 * Настройка обработчиков для всех сообщений и колбэков
 * @param {Telegraf} bot - Экземпляр бота Telegraf
 */
function setupHandlers(bot) {
  // Обработчики команд
  bot.start(handleStart);
  bot.help(handleHelp);
  bot.command('token', handleTokenCommand);
  
  // Обработчики для администраторов
  bot.command('admin', handleAdminCommands);
  
  // Обработчики колбэков
  bot.action(/^token_(.+)_(.+)$/, handleTokenInfo);
  bot.action(/^bubble_(.+)_(.+)$/, handleBubbleMap);
  bot.action(/^quick_(.+)_(.+)$/, handleQuickBubbleMap);
  
  // Обработчик для неизвестных команд
  bot.on('text', async (ctx) => {
    // Проверяем, является ли сообщение адресом токена
    const text = ctx.message.text.trim();
    if (text.startsWith('0x') && text.length >= 40) {
      // Если похоже на адрес токена, вызываем соответствующий обработчик
      ctx.message.text = `/token ${text}`;
      return handleTokenCommand(ctx);
    }
    
    await ctx.reply('Я не понимаю эту команду. Используйте /help для просмотра доступных команд.');
  });
  
  // Маршрутизация callback-запросов
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
        await ctx.answerCallbackQuery('Неизвестный запрос');
      }
    } catch (error) {
      logger.error(`Ошибка при обработке callback-запроса: ${error.message}`);
      await ctx.answerCallbackQuery('Произошла ошибка при обработке запроса');
    }
  });
  
  // Обработчик ошибок
  bot.catch((err, ctx) => {
    logger.error(`Ошибка для ${ctx.updateType}: ${err}`);
    ctx.reply('Произошла ошибка при обработке запроса. Пожалуйста, попробуйте позже.');
  });
}

/**
 * Запуск бота
 */
function startBot() {
  const bot = initBot();
  bot.launch()
    .then(() => {
      logger.info('Бот успешно запущен');
    })
    .catch((err) => {
      logger.error(`Ошибка при запуске бота: ${err}`);
      process.exit(1);
    });
    
  // Обработка завершения работы
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

module.exports = {
  startBot
};
 