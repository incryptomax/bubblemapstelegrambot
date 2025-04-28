const { Markup } = require('telegraf');
const logger = require('../../utils/logger');
const screenshotService = require('../../services/screenshotService');
const quickScreenshotService = require('../../services/quickScreenshotService');
const tokenInfoService = require('../../services/tokenInfoService');
const bubblemapsService = require('../../services/bubblemapsService');
const blockchainService = require('../../services/blockchainService');
const { formatTokenInfo, determineBlockchain } = require('../../utils/tokenUtils');

/**
 * Handle /token command to get token information
 * @param {Object} ctx - Telegraf context
 */
async function handleTokenCommand(ctx) {
  try {
    const args = ctx.message.text.split(' ').slice(1);
    
    if (args.length === 0) {
      return ctx.reply('Please specify a token address. Example: /token 0x...');
    }
    
    const tokenAddress = args[0].trim();
    let chain = args[1]?.trim() || null;
    
    // Automatically determine blockchain if not specified
    if (!chain) {
      chain = determineBlockchain(tokenAddress);
      if (!chain) {
        return ctx.reply('Could not determine blockchain. Please specify it explicitly, example: /token 0x... ethereum');
      }
    }
    
    // Check if blockchain is supported
    if (!blockchainService.isChainSupported(chain)) {
      return ctx.reply(`Blockchain ${chain} is not supported. Supported blockchains: ${blockchainService.getSupportedChains().join(', ')}`);
    }
    
    // Notify user that information is being loaded
    const loadingMessage = await ctx.reply(`Loading information for token ${tokenAddress} on ${chain}...`);
    
    // Get token information
    const tokenInfo = await tokenInfoService.getTokenInfo(tokenAddress, chain);
    
    if (!tokenInfo) {
      await ctx.telegram.editMessageText(
        ctx.chat.id, 
        loadingMessage.message_id, 
        null, 
        `Could not find information for token ${tokenAddress} on ${chain}.`
      );
      return;
    }
    
    // Format token information
    const formattedInfo = formatTokenInfo(tokenInfo, chain);
    
    // Update loading message with token information
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
            Markup.button.callback('⚡ Quick View', `quick_${chain}_${tokenAddress}`)
          ],
          [
            Markup.button.url('Open on BubbleMaps', bubblemapsService.generateMapUrl(tokenAddress, chain))
          ]
        ])
      }
    );
  } catch (error) {
    logger.error(`Error handling /token command: ${error.message}`);
    await ctx.reply('An error occurred while fetching token information. Please try again later.');
  }
}

/**
 * Handle token_chain_address from inline button
 * @param {Object} ctx - Telegraf context
 */
async function handleTokenInfo(ctx) {
  try {
    const callbackData = ctx.callbackQuery.data;
    const [_, chain, token] = callbackData.split('_');
    
    if (!chain || !token) {
      return ctx.answerCallbackQuery('Insufficient data to fetch token information');
    }
    
    // Check if blockchain is supported
    if (!blockchainService.isChainSupported(chain)) {
      return ctx.answerCallbackQuery(`Blockchain ${chain} is not supported`);
    }
    
    // Notify user that information is being loaded
    await ctx.answerCallbackQuery('Loading token information...');
    const loadingMessage = await ctx.reply(`Loading information for token ${token} on ${chain}...`);
    
    // Get token information
    const tokenInfo = await tokenInfoService.getTokenInfo(token, chain);
    
    if (!tokenInfo) {
      await ctx.telegram.editMessageText(
        ctx.chat.id, 
        loadingMessage.message_id, 
        null, 
        `Could not find information for token ${token} on ${chain}.`
      );
      return;
    }
    
    // Format token information
    const formattedInfo = formatTokenInfo(tokenInfo, chain);
    
    // Update loading message with token information
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
            Markup.button.callback('⚡ Quick View', `quick_${chain}_${token}`)
          ],
          [
            Markup.button.url('Open on BubbleMaps', bubblemapsService.generateMapUrl(token, chain))
          ]
        ])
      }
    );
  } catch (error) {
    logger.error(`Error handling token info: ${error.message}`);
    await ctx.reply('An error occurred while fetching token information. Please try again later.');
  }
}

/**
 * Handle creation and sending of Bubble Map screenshot
 * @param {Object} ctx - Telegraf context
 */
async function handleBubbleMap(ctx) {
  try {
    const callbackData = ctx.callbackQuery.data;
    const [_, chain, token] = callbackData.split('_');
    
    if (!chain || !token) {
      return ctx.answerCallbackQuery('Insufficient data to create screenshot');
    }
    
    // Check if blockchain is supported
    if (!blockchainService.isChainSupported(chain)) {
      return ctx.answerCallbackQuery(`Blockchain ${chain} is not supported`);
    }
    
    // Notify user that screenshot creation has started
    await ctx.answerCallbackQuery('Creating screenshot...');
    const loadingMessage = await ctx.reply('⏳ Creating Bubble Map screenshot... This may take up to 30 seconds.');
    
    // Create screenshot
    try {
      const screenshot = await screenshotService.captureMapScreenshot(token, chain);
      
      // Send screenshot to user
      await ctx.replyWithPhoto({ source: screenshot }, {
        caption: `📊 Bubble Map for token ${token} on ${chain}`,
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'Open on BubbleMaps', url: bubblemapsService.generateMapUrl(token, chain) }
            ]
          ]
        }
      });
      
      // Delete loading message
      await ctx.telegram.deleteMessage(ctx.chat.id, loadingMessage.message_id);
    } catch (screenshotError) {
      logger.error(`Error creating screenshot: ${screenshotError.message}`);
      
      // Update loading message with error
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        loadingMessage.message_id,
        null,
        `Could not create Bubble Map screenshot. You can view the map directly on BubbleMaps:`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'Open on BubbleMaps', url: bubblemapsService.generateMapUrl(token, chain) }
              ]
            ]
          }
        }
      );
    }
  } catch (error) {
    logger.error(`Error creating Bubble Map: ${error.message}`);
    await ctx.reply('An error occurred while creating Bubble Map. Please try again later.');
  }
}

/**
 * Handle creation and sending of quick Bubble Map screenshot
 * @param {Object} ctx - Telegraf context
 */
async function handleQuickBubbleMap(ctx) {
  try {
    const callbackData = ctx.callbackQuery.data;
    const [_, chain, token] = callbackData.split('_');
    
    if (!chain || !token) {
      return ctx.answerCallbackQuery('Insufficient data to create screenshot');
    }
    
    // Check if blockchain is supported
    if (!blockchainService.isChainSupported(chain)) {
      return ctx.answerCallbackQuery(`Blockchain ${chain} is not supported`);
    }
    
    // Notify user that screenshot creation has started
    await ctx.answerCallbackQuery('Creating quick screenshot...');
    const loadingMessage = await ctx.reply('⏳ Creating quick Bubble Map screenshot... This will take less than 10 seconds.');
    
    // Create quick screenshot
    const screenshot = await quickScreenshotService.captureQuickScreenshot(token, chain);
    
    // Send screenshot to user
    await ctx.replyWithPhoto({ source: screenshot }, {
      caption: `📊 Bubble Map for token ${token} on ${chain} (quick view)`,
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'Detailed Analysis', callback_data: `bubble_${chain}_${token}` },
            { text: 'Open on BubbleMaps', url: bubblemapsService.generateMapUrl(token, chain) }
          ]
        ]
      }
    });
    
    // Delete loading message
    await ctx.telegram.deleteMessage(ctx.chat.id, loadingMessage.message_id);
  } catch (error) {
    logger.error(`Error creating quick Bubble Map: ${error.message}`);
    await ctx.reply('An error occurred while creating quick Bubble Map. Please try again later.');
  }
}

module.exports = {
  handleTokenCommand,
  handleTokenInfo,
  handleBubbleMap,
  handleQuickBubbleMap
}; 