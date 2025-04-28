const { Markup } = require('telegraf');
const logger = require('../../utils/logger');
const screenshotService = require('../../services/screenshotService');
const quickScreenshotService = require('../../services/quickScreenshotService');
const tokenInfoService = require('../../services/tokenInfoService');
const bubblemapsService = require('../../services/bubblemapsService');
const blockchainService = require('../../services/blockchainService');
const { formatTokenInfo, determineBlockchain } = require('../../utils/tokenUtils');

/**
 * Обработчик команды /token для получения информации о токене
 * @param {Object} ctx - Контекст Telegraf
 */
async function handleTokenCommand(ctx) {
  try {
    const args = ctx.message.text.split(' ').slice(1);
    
    if (args.length === 0) {
      return ctx.reply('Пожалуйста, укажите адрес токена. Например: /token 0x...');
    }
    
    const tokenAddress = args[0].trim();
    let chain = args[1]?.trim() || null;
    
    // Определяем блокчейн автоматически, если не указан
    if (!chain) {
      chain = determineBlockchain(tokenAddress);
      if (!chain) {
        return ctx.reply('Не удалось определить блокчейн. Пожалуйста, укажите его явно, например: /token 0x... ethereum');
      }
    }
    
    // Проверяем поддерживается ли блокчейн
    if (!blockchainService.isChainSupported(chain)) {
      return ctx.reply(`Блокчейн ${chain} не поддерживается. Поддерживаемые блокчейны: ${blockchainService.getSupportedChains().join(', ')}`);
    }
    
    // Сообщаем пользователю, что началась загрузка информации
    const loadingMessage = await ctx.reply(`Загружаю информацию о токене ${tokenAddress} в сети ${chain}...`);
    
    // Получаем информацию о токене
    const tokenInfo = await tokenInfoService.getTokenInfo(tokenAddress, chain);
    
    if (!tokenInfo) {
      await ctx.telegram.editMessageText(
        ctx.chat.id, 
        loadingMessage.message_id, 
        null, 
        `Не удалось найти информацию о токене ${tokenAddress} в сети ${chain}.`
      );
      return;
    }
    
    // Форматируем информацию о токене
    const formattedInfo = formatTokenInfo(tokenInfo, chain);
    
    // Редактируем сообщение о загрузке, добавляя информацию о токене
    await ctx.telegram.editMessageText(
      ctx.chat.id, 
      loadingMessage.message_id, 
      null, 
      formattedInfo,
      { 
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('📊 Bubble Map', `bubble_${chain}_${tokenAddress}`),
            Markup.button.callback('⚡ Быстрый просмотр', `quick_${chain}_${tokenAddress}`)
          ],
          [
            Markup.button.url('Открыть на BubbleMaps', bubblemapsService.generateMapUrl(tokenAddress, chain))
          ]
        ])
      }
    );
  } catch (error) {
    logger.error(`Ошибка при обработке команды /token: ${error.message}`);
    await ctx.reply('Произошла ошибка при получении информации о токене. Пожалуйста, попробуйте позже.');
  }
}

/**
 * Обработчик команды token_chain_address из inline-кнопки
 * @param {Object} ctx - Контекст Telegraf
 */
async function handleTokenInfo(ctx) {
  try {
    const callbackData = ctx.callbackQuery.data;
    const [_, chain, token] = callbackData.split('_');
    
    if (!chain || !token) {
      return ctx.answerCallbackQuery('Недостаточно данных для получения информации о токене');
    }
    
    // Проверяем поддерживается ли блокчейн
    if (!blockchainService.isChainSupported(chain)) {
      return ctx.answerCallbackQuery(`Блокчейн ${chain} не поддерживается`);
    }
    
    // Сообщаем пользователю, что началась загрузка информации
    await ctx.answerCallbackQuery('Загружаю информацию о токене...');
    const loadingMessage = await ctx.reply(`Загружаю информацию о токене ${token} в сети ${chain}...`);
    
    // Получаем информацию о токене
    const tokenInfo = await tokenInfoService.getTokenInfo(token, chain);
    
    if (!tokenInfo) {
      await ctx.telegram.editMessageText(
        ctx.chat.id, 
        loadingMessage.message_id, 
        null, 
        `Не удалось найти информацию о токене ${token} в сети ${chain}.`
      );
      return;
    }
    
    // Форматируем информацию о токене
    const formattedInfo = formatTokenInfo(tokenInfo, chain);
    
    // Редактируем сообщение о загрузке, добавляя информацию о токене
    await ctx.telegram.editMessageText(
      ctx.chat.id, 
      loadingMessage.message_id, 
      null, 
      formattedInfo,
      { 
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('📊 Bubble Map', `bubble_${chain}_${token}`),
            Markup.button.callback('⚡ Быстрый просмотр', `quick_${chain}_${token}`)
          ],
          [
            Markup.button.url('Открыть на BubbleMaps', bubblemapsService.generateMapUrl(token, chain))
          ]
        ])
      }
    );
  } catch (error) {
    logger.error(`Ошибка при обработке токен-инфо: ${error.message}`);
    await ctx.reply('Произошла ошибка при получении информации о токене. Пожалуйста, попробуйте позже.');
  }
}

/**
 * Обработчик для создания и отправки скриншота Bubble Map
 * @param {Object} ctx - Контекст Telegraf
 */
async function handleBubbleMap(ctx) {
  try {
    const callbackData = ctx.callbackQuery.data;
    const [_, chain, token] = callbackData.split('_');
    
    if (!chain || !token) {
      return ctx.answerCallbackQuery('Недостаточно данных для создания скриншота');
    }
    
    // Проверяем поддерживается ли блокчейн
    if (!blockchainService.isChainSupported(chain)) {
      return ctx.answerCallbackQuery(`Блокчейн ${chain} не поддерживается`);
    }
    
    // Сообщаем пользователю, что началось создание скриншота
    await ctx.answerCallbackQuery('Создаю скриншот...');
    const loadingMessage = await ctx.reply('⏳ Создаю скриншот Bubble Map... Это может занять до 30 секунд.');
    
    // Создаем скриншот
    try {
      const screenshot = await screenshotService.captureMapScreenshot(token, chain);
      
      // Отправляем скриншот пользователю
      await ctx.replyWithPhoto({ source: screenshot }, {
        caption: `📊 Bubble Map для токена ${token} в сети ${chain}`,
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'Открыть на BubbleMaps', url: bubblemapsService.generateMapUrl(token, chain) }
            ]
          ]
        }
      });
      
      // Удаляем сообщение о загрузке
      await ctx.telegram.deleteMessage(ctx.chat.id, loadingMessage.message_id);
    } catch (screenshotError) {
      logger.error(`Ошибка при создании скриншота: ${screenshotError.message}`);
      
      // Редактируем сообщение о загрузке, сообщая об ошибке
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        loadingMessage.message_id,
        null,
        `Не удалось создать скриншот Bubble Map. Вы можете просмотреть карту напрямую на сайте BubbleMaps:`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'Открыть на BubbleMaps', url: bubblemapsService.generateMapUrl(token, chain) }
              ]
            ]
          }
        }
      );
    }
  } catch (error) {
    logger.error(`Ошибка при создании Bubble Map: ${error.message}`);
    await ctx.reply('Произошла ошибка при создании Bubble Map. Пожалуйста, попробуйте позже.');
  }
}

/**
 * Обработчик для создания и отправки быстрого скриншота Bubble Map
 * @param {Object} ctx - Контекст Telegraf
 */
async function handleQuickBubbleMap(ctx) {
  try {
    const callbackData = ctx.callbackQuery.data;
    const [_, chain, token] = callbackData.split('_');
    
    if (!chain || !token) {
      return ctx.answerCallbackQuery('Недостаточно данных для создания скриншота');
    }
    
    // Проверяем поддерживается ли блокчейн
    if (!blockchainService.isChainSupported(chain)) {
      return ctx.answerCallbackQuery(`Блокчейн ${chain} не поддерживается`);
    }
    
    // Сообщаем пользователю, что началось создание скриншота
    await ctx.answerCallbackQuery('Создаю быстрый скриншот...');
    const loadingMessage = await ctx.reply('⏳ Создаю быстрый скриншот Bubble Map... Это займет менее 10 секунд.');
    
    // Создаем быстрый скриншот
    const screenshot = await quickScreenshotService.captureQuickScreenshot(token, chain);
    
    // Отправляем скриншот пользователю
    await ctx.replyWithPhoto({ source: screenshot }, {
      caption: `📊 Bubble Map для токена ${token} в сети ${chain} (быстрый режим)`,
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'Подробный анализ', callback_data: `bubble_${chain}_${token}` },
            { text: 'Открыть на BubbleMaps', url: bubblemapsService.generateMapUrl(token, chain) }
          ]
        ]
      }
    });
    
    // Удаляем сообщение о загрузке
    await ctx.telegram.deleteMessage(ctx.chat.id, loadingMessage.message_id);
  } catch (error) {
    logger.error(`Ошибка при создании быстрого скриншота: ${error.message}`);
    await ctx.reply('Произошла ошибка при создании быстрого скриншота. Пожалуйста, попробуйте позже.');
  }
}

module.exports = {
  handleTokenCommand,
  handleTokenInfo,
  handleBubbleMap,
  handleQuickBubbleMap
}; 