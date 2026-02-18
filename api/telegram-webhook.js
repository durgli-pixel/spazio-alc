// api/telegram-webhook.js
import admin from 'firebase-admin';
import fetch from 'node-fetch';

// Переменные среды Vercel
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID || '-1003463551432';
const CHANNEL_LINK = process.env.CHANNEL_LINK || 'https://t.me/spaziocalc';

// Инициализация Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    })
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(200).json({ ok: true });

    const update = req.body;

    // Сообщения
    if (update.message) {
      const message = update.message;
      const chatId = message.chat.id;
      const text = message.text || '';

      if (text.startsWith('/start')) {
        await sendMessage(chatId,
          `🎯 Добро пожаловать в SPAZIO Calculator!\n\n` +
          `Для получения доступа к калькулятору:\n` +
          `1️⃣ Подпишитесь на наш канал\n` +
          `2️⃣ Нажмите кнопку "Проверить подписку"`,
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

    // Callback кнопки
    if (update.callback_query) {
      await handleCallback(update.callback_query);
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(200).json({ ok: true }); // Не падаем с 500
  }
}

// Обработка callback
async function handleCallback(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const userId = callbackQuery.from.id;
  const data = callbackQuery.data;

  if (data === 'check_subscription') {
    const isSubscribed = await checkSubscription(userId);

    if (isSubscribed) {
      // Генерируем код доступа
      const code = generateAccessCode();

      // Сохраняем в Firestore
      await db.collection('accessCodes').doc(code).set({
        userId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        used: false
      });

      await sendMessage(chatId,
        `✅ Отлично! Вы подписаны на канал!\n\n` +
        `🔑 Ваш код доступа:\n<code>${code}</code>\n\n` +
        `Откройте калькулятор: https://spaziocalc.vercel.app/spazio-calculator.html?code=${code}`,
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

// Проверка подписки через Telegram API
async function checkSubscription(userId) {
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${CHANNEL_ID}&user_id=${userId}`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (!data.ok) return false;

    const status = data.result.status;
    return ['creator', 'administrator', 'member'].includes(status);
  } catch (err) {
    console.error('Check subscription error:', err);
    return false;
  }
}

// Генерация случайного кода
function generateAccessCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'SPAZIO-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Отправка сообщения в Telegram
async function sendMessage(chatId, text, reply_markup = null) {
  const body = { chat_id: chatId, text, parse_mode: 'HTML' };
  if (reply_markup) body.reply_markup = reply_markup;

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

// Ответ на callback
async function answerCallback(callbackQueryId, text) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text })
  });
}
