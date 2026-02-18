// api/telegram-webhook.js - Telegram Bot Webhook

const BOT_TOKEN = '8530197516:AAFH3d_SepVxkGLs_aHANbxssfHSW8w0R1Q';
const CHANNEL_ID = '-1003463551432';
const CHANNEL_LINK = 'https://t.me/spaziocalc';

// Хранилище кодов (в production использовать БД)
const accessCodes = new Map();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true });
  }

  try {
    const update = req.body;

    // ⚡ Обработка callback кнопок
    if (update.callback_query) {
      await handleCallback(update.callback_query);
      return res.status(200).json({ ok: true });
    }

    // ⚡ Обработка сообщений
    if (update.message) {
      const message = update.message;
      const chatId = message.chat.id;
      const userId = message.from.id;
      const text = message.text || '';

      // Команда /start
      if (text.startsWith('/start')) {
        await sendMessage(chatId, 
          '🎯 Добро пожаловать в SPAZIO Calculator!\n\n' +
          'Для получения доступа к калькулятору:\n' +
          '1️⃣ Подпишитесь на наш канал\n' +
          '2️⃣ Нажмите кнопку "Проверить подписку"',
          {
            inline_keyboard: [[
              { text: '📢 Подписаться на канал', url: CHANNEL_LINK }
            ], [
              { text: '✅ Проверить подписку', callback_data: 'check_subscription' }
            ]]
          }
        );
      }
    }

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(200).json({ ok: true });
  }
}

// Обработка callback кнопок
async function handleCallback(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const userId = callbackQuery.from.id;
  const data = callbackQuery.data;

  if (data === 'check_subscription') {
    const isSubscribed = await checkSubscription(userId);

    if (isSubscribed) {
      const code = generateAccessCode();
      accessCodes.set(code, { userId, timestamp: Date.now() });

      await
