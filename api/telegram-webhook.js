// api/telegram-webhook.js
import admin from 'firebase-admin';

// ======= ENV VARIABLES =======
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const CHANNEL_LINK = process.env.CHANNEL_LINK;

// ======= FIREBASE INIT =======
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

// ======= HANDLER =======
export default async function handler(req, res) {
  try {
    const update = req.body;

    // --- CALLBACK BUTTON ---
    if (update.callback_query) {
      await handleCallback(update.callback_query);
      return res.status(200).json({ ok: true });
    }

    // --- MESSAGE / START ---
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text || '';

      if (text.startsWith('/start')) {
        await sendMessage(chatId,
          '🎯 Добро пожаловать в SPAZIO Calculator!\n\n' +
          'Подпишитесь на канал и нажмите кнопку "Проверить подписку"',
          {
            inline_keyboard: [
              [{ text: '📢 Подписаться на канал', url: CHANNEL_LINK }],
              [{ text: '✅ Проверить подписку', callback_data: 'check_subscription' }]
            ]
          }
        );
      }
    }

    res.status(200).json({ ok: true });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ ok: false });
  }
}

// ======= CALLBACK HANDLER =======
async function handleCallback(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const userId = callbackQuery.from.id;

  if (callbackQuery.data === 'check_subscription') {
    const subscribed = await checkSubscription(userId);

    if (subscribed) {
      const code = generateAccessCode();

      // Сохраняем код в Firebase
      await db.collection('access_codes').doc(code).set({
        userId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await sendMessage(chatId,
        `✅ Отлично! Вы подписаны на канал!\n\n` +
        `🔑 Ваш код доступа:\n${code}\n\n` +
        `Перейдите по ссылке, чтобы открыть калькулятор:\n` +
        `https://spaziocalc.vercel.app/spazio-calculator.html?code=${code}`
      );
    } else {
      await sendMessage(chatId,
        '❌ Вы не подписаны на канал!\n\nСначала подпишитесь, затем нажмите "Проверить подписку" снова.',
        {
          inline_keyboard: [
            [{ text: '📢 Подписаться на канал', url: CHANNEL_LINK }],
            [{ text: '🔄 Проверить ещё раз', callback_data: 'check_subscription' }]
          ]
        }
      );
    }

    await answerCallback(callbackQuery.id, 'Подписка проверена');
  }
}

// ======= CHECK SUBSCRIPTION =======
async function checkSubscription(userId) {
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${CHANNEL_ID}&user_id=${userId}`;
    const resp = await fetch(url);
    const data = await resp.json();

    if (data.ok) {
      const status = data.result.status;
      return ['creator', 'administrator', 'member'].includes(status);
    }
    return false;
  } catch (err) {
    console.error('Subscription check error:', err);
    return false;
  }
}

// ======= GENERATE CODE =======
function generateAccessCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'SPAZIO-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ======= TELEGRAM UTILS =======
async function sendMessage(chatId, text, reply_markup = null) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const body = { chat_id: chatId, text, parse_mode: 'HTML' };
  if (reply_markup) body.reply_markup = reply_markup;

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function answerCallback(callbackQueryId, text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
}
