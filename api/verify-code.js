// api/verify-code.js - Проверка кода доступа с Telegram
import { accessCodes } from './telegram-webhook.js'; // Импортируем Map с кодами

export default async function handler(req, res) {
  // Разрешаем кросс-доменные запросы
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ valid: false, error: 'Method not allowed' });
  }

  // Получаем тело запроса
  let body = {};
  try {
    body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);
  } catch (err) {
    return res.status(400).json({ valid: false, error: 'Invalid JSON' });
  }

  const { code } = body;

  if (!code) return res.status(400).json({ valid: false, error: 'Code required' });

  // Проверяем, есть ли такой код в Telegram-хранилище
  if (accessCodes.has(code)) {
    // Удаляем код после использования (не даём использовать повторно)
    accessCodes.delete(code);

    return res.status(200).json({
      valid: true,
      message: 'Access granted'
    });
  } else {
    return res.status(200).json({
      valid: false,
      error: 'Invalid or used code'
    });
  }
}
