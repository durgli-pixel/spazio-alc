const BOT_TOKEN = '8530197516:AAFH3d_SepVxkGLs_aHANbxssfHSW8w0R1Q';
const CHANNEL_ID = '-1003463551432';
const CHANNEL_LINK = 'https://t.me/spaziocalc';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true });
  }

  try {
    const update = req.body;

    if (update.message) {
      const chatId = update.message.chat.id;
      const userId = update.message.from.id;
      const text = (update.message.text || '').trim();

      if (text === '/start' || text.startsWith('/start')) {
        await sendMessage(chatId,
          '🎯 *Добро пожаловать в SPAZIO Calculator!*\n\n' +
          'Для получения кода доступа:\n' +
          '1️⃣ Подпишитесь на наш канал\n' +
          '2️⃣ Нажмите "Получить код"',
          {
            inline_keyboard: [[
              { text: '📢 Подписаться на канал', url: CHANNEL_LINK }
            ], [
              { text: '🔑 Получить код доступа', callback_data: 'get_code' }
            ]]
          }
        );
      }
      else if (text === '/code') {
        await handleCodeRequest(chatId, userId);
      }
    }

    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const chatId = callbackQuery.message.chat.id;
      const userId = callbackQuery.from.id;

      if (callbackQuery.data === 'get_code') {
        await handleCodeRequest(chatId, userId);
        await answerCallback(callbackQuery.id, '');
      }
    }

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(200).json({ ok: true });
  }
}

async function handleCodeRequest(chatId, userId) {
  const isSubscribed = await checkSubscription(userId);

  if (isSubscribed) {
    const code = generateCode();
    
    await sendMessage(chatId,
      '✅ *Вы подписаны на канал!*\n\n' +
      '🔑 *Ваш код доступа:*\n\n' +
      '`' + code + '`\n\n' +
      '📱 Введите код на сайте:\n' +
      'spaziocalc.vercel.app\n\n' +
      '⏱ Триал: 30 дней бесплатно'
    );
  } else {
    await sendMessage(chatId,
      '❌ *Вы не подписаны на канал!*\n\n' +
      'Сначала подпишитесь, затем нажмите "Получить код".',
      {
        inline_keyboard: [[
          { text: '📢 Подписаться', url: CHANNEL_LINK }
        ], [
          { text: '🔄 Попробовать снова', callback_data: 'get_code' }
        ]]
      }
    );
  }
}

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
    return false;
  }
}

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'SPAZIO-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function sendMessage(chatId, text, replyMarkup = null) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const body = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown'
  };
  
  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

async function answerCallback(callbackQueryId, text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text: text })
  });
}
