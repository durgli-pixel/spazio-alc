// api/telegram-webhook.js
import fetch from 'node-fetch';
import { db } from './firebase-admin.js';

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = '-1003463551432';
const CHANNEL_LINK = 'https://t.me/spaziocalc';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(200).json({ ok: true });

    const update = req.body;

    try {
        // Обработка callback кнопок
        if (update.callback_query) {
            await handleCallback(update.callback_query);
            return res.status(200).json({ ok: true });
        }

        // Обработка обычных сообщений
        if (update.message) {
            const chatId = update.message.chat.id;
            const text = update.message.text || '';

            if (text.startsWith('/start')) {
                await sendMessage(chatId,
                    '🎯 Добро пожаловать в SPAZIO Calculator!\n\n' +
                    'Для получения доступа к калькулятору:\n' +
                    '1️⃣ Подпишитесь на наш канал\n' +
                    '2️⃣ Нажмите кнопку "Проверить подписку"',
                    {
                        inline_keyboard: [
                            [{ text: '📢 Подписаться на канал', url: CHANNEL_LINK }],
                            [{ text: '✅ Проверить подписку', callback_data: 'check_subscription' }]
                        ]
                    }
                );
            }
            return res.status(200).json({ ok: true });
        }

        return res.status(200).json({ ok: true });
    } catch (error) {
        console.error('Webhook error:', error);
        return res.status(200).json({ ok: true });
    }
};

// -------------------- Функции --------------------

async function handleCallback(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;

    if (data === 'check_subscription') {
        const isSubscribed = await checkSubscription(userId);

        if (isSubscribed) {
            const code = generateAccessCode();

            // Сохраняем код в Firestore
            await db.collection('accessCodes').doc(code).set({
                userId,
                used: false,
                createdAt: new Date()
            });

            await sendMessage(chatId,
                `✅ Отлично! Вы подписаны на канал!\n\n` +
                `🔗 Перейдите по ссылке, чтобы открыть калькулятор с кодом:\n\n` +
                `https://spaziocalc.vercel.app/spazio-calculator.html?code=${code}`,
                { parse_mode: 'HTML' }
            );

            await answerCallback(callbackQuery.id, '✅ Подписка подтверждена!');
        } else {
            await sendMessage(chatId,
                '❌ Вы не подписаны на канал!\n\nСнач
