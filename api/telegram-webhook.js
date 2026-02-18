// api/telegram-webhook.js - Telegram Bot Webhook через Firebase

import admin from "firebase-admin";

// === ENV VARIABLES ===
// В Vercel добавьте:
// BOT_TOKEN - ваш Telegram Bot Token
// CHANNEL_ID - ID канала (например -1003463551432)
// CHANNEL_LINK - ссылка на канал
// FIREBASE_PROJECT_ID
// FIREBASE_CLIENT_EMAIL
// FIREBASE_PRIVATE_KEY (в одну строку с \n вместо переносов)

const {
  BOT_TOKEN,
  CHANNEL_ID,
  CHANNEL_LINK,
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
} = process.env;

// Инициализация Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      // Заменяем \n на реальные переносы
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

const db = admin.firestore();

// Хранилище кодов в Firestore
const CODES_COLLECTION = "access_codes";

// Генерация кода доступа
function generateAccessCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "SPAZIO-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Отправка сообщения в Telegram
async function sendMessage(chatId, text, reply_markup = null) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const body = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  };
  if (reply_markup) body.reply_markup = reply_markup;

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Ответ на callback
async function answerCallback(callbackQueryId, text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
    }),
  });
}

// Проверка подписки на канал
async function checkSubscription(userId) {
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${CHANNEL_ID}&user_id=${userId}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.ok) {
      const status = data.result.status;
      return ["creator", "administrator", "member"].includes(status);
    }
    return false;
  } catch (err) {
    console.error("Check subscription error:", err);
    return false;
  }
}

// Обработка callback кнопок
async function handleCallback(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const userId = callbackQuery.from.id;
  const data = callbackQuery.data;

  if (data === "check_subscription") {
    const subscribed = await checkSubscription(userId);

    if (subscribed) {
      const code = generateAccessCode();

      // Сохраняем код в Firestore
      await db.collection(CODES_COLLECTION).doc(code).set({
        userId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await sendMessage(
        chatId,
        `✅ Отлично! Вы подписаны на канал!\n\n` +
          `🔗 Перейдите по ссылке, чтобы открыть калькулятор с кодом:\n\n` +
          `https://spaziocalc.vercel.app/spazio-calculator.html?code=${code}`,
        { parse_mode: "HTML" }
      );

      await answerCallback(callbackQuery.id, "✅ Подписка подтверждена!");
    } else {
      await sendMessage(
        chatId,
        "❌ Вы не подписаны на канал!\nСначала подпишитесь, затем нажмите кнопку снова.",
        {
          inline_keyboard: [
            [{ text: "📢 Подписаться", url: CHANNEL_LINK }],
            [{ text: "🔄 Проверить ещё раз", callback_data: "check_subscription" }],
          ],
        }
      );
      await answerCallback(callbackQuery.id, "❌ Подписка не найдена");
    }
  }
}

// Главный handler
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).json({ ok: true });

  const update = req.body;

  try {
    if (update.message) {
      const msg = update.message;
      const chatId = msg.chat.id;
      const text = msg.text || "";

      if (text.startsWith("/start")) {
        await sendMessage(
          chatId,
          `🎯 Добро пожаловать в SPAZIO Calculator!\n\n` +
            `Для получения доступа:\n1️⃣ Подпишитесь на канал\n2️⃣ Нажмите кнопку "Проверить подписку"`,
          {
            inline_keyboard: [
              [{ text: "📢 Подписаться на канал", url: CHANNEL_LINK }],
              [{ text: "✅ Проверить подписку", callback_data: "check_subscription" }],
            ],
          }
        );
      }
    }

    if (update.callback_query) {
      await handleCallback(update.callback_query);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
