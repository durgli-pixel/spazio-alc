// api/check-subscription.js

const BOT_TOKEN = '8530197516:AAFH3d_SepVxkGLs_aHANbxssfHSW8w0R1Q';
const CHANNEL_ID = '-1003463551432';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id required' });
  }

  try {
    // Check subscription via Telegram API
    const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${CHANNEL_ID}&user_id=${user_id}`;
    const response = await fetch(telegramUrl);
    const data = await response.json();

    if (!data.ok) {
      return res.json({ 
        subscribed: false, 
        error: data.description 
      });
    }

    const status = data.result.status;
    const isSubscribed = ['creator', 'administrator', 'member'].includes(status);

    return res.json({ 
      subscribed: isSubscribed,
      status: status
    });

  } catch (error) {
    return res.status(500).json({ 
      subscribed: false, 
      error: error.message 
    });
  }
}
