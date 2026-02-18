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
    
    if (!update.message) {
      return res.status(200).json({ ok: true });
    }

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
    // Проверяем подписку
    const isSubscribed = await checkSubscription(userId);
    
    if (isSubscribed) {
      // Генерируем код доступа
      const code = generateAccessCode();
      accessCodes.set(code, { userId, timestamp: Date.now() });
      
      await sendMessage(chatId,
        '✅ Отлично! Вы подписаны на канал!\n\n' +
        `🔑 Ваш код доступа:\n\n<code>${code}</code>\n\n` +
        'Скопируйте этот код и вставьте на сайте калькулятора.',
        { parse_mode: 'HTML' }
      );
      
      await answerCallback(callbackQuery.id, '✅ Подписка подтверждена!');
    } else {
      await sendMessage(chatId,
        '❌ Вы не подписаны на канал!\n\n' +
        'Сначала подпишитесь, затем нажмите "Проверить подписку" снова.',
        {
          inline_keyboard: [[
            { text: '📢 Подписаться на канал', url: CHANNEL_LINK }
          ], [
            { text: '🔄 Проверить ещё раз', callback_data: 'check_subscription' }
          ]]
        }
      );
      
      await answerCallback(callbackQuery.id, '❌ Подписка не найдена');
    }
  }
}

// Проверка подписки
async function checkSubscription(userId) {
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${CHANNEL_ID}&user_id=${userId}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.ok) {
      const status = data.result.status;
      return ['creator', 'administrator', 'member'].includes(status);
    }
    return false;
  } catch (error) {
    console.error('Check subscription error:', error);
    return false;
  }
}

// Генерация кода доступа
function generateAccessCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'SPAZIO-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Отправка сообщения
async function sendMessage(chatId, text, reply_markup = null) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const body = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML'
  };
  
  if (reply_markup) {
    body.reply_markup = reply_markup;
  }
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

// Ответ на callback
async function answerCallback(callbackQueryId, text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text: text
    })
  });
}

// Экспортируем хранилище кодов для проверки
export { accessCodes };
