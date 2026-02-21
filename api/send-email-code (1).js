// api/send-email-code.js - Resend API с детальным логированием

const RESEND_API_KEY = 're_7x8GA7BC_75wvyqm6p41Qhn9dxhVWNe2e';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Введите корректный email' 
      });
    }

    // Генерация кода
    const code = generateCode();
    
    console.log('Sending email to:', email);
    console.log('Generated code:', code);

    // Отправка через Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'SPAZIO <onboarding@resend.dev>',
        to: [email],
        subject: 'Ваш код доступа SPAZIO Calculator',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; background-color: #f5f5f5;">
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #ffffff;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="background: #FED631; width: 80px; height: 80px; margin: 0 auto 20px; border-radius: 18px; display: inline-flex; align-items: center; justify-content: center;">
                  <span style="font-size: 36px; font-weight: 800; color: #000;">SP</span>
                </div>
                <h1 style="color: #1d1d1f; font-size: 28px; margin: 0; font-weight: 600;">SPAZIO Calculator</h1>
              </div>
              
              <div style="background: #f9f9f9; border-radius: 16px; padding: 32px; text-align: center;">
                <h2 style="color: #1d1d1f; font-size: 20px; margin: 0 0 24px 0; font-weight: 600;">Ваш код доступа</h2>
                
                <div style="background: #ffffff; border: 2px solid #FED631; border-radius: 12px; padding: 24px; margin: 24px 0;">
                  <div style="font-family: 'Courier New', monospace; font-size: 28px; letter-spacing: 4px; color: #1d1d1f; font-weight: bold;">
                    ${code}
                  </div>
                </div>
                
                <p style="color: #666; font-size: 15px; margin: 24px 0 0 0; line-height: 1.6;">
                  Введите этот код на сайте<br/>
                  <strong style="color: #1d1d1f;">spaziocalc.vercel.app</strong>
                </p>
                
                <div style="background: #FFF9E6; border-radius: 8px; padding: 16px; margin: 24px 0 0 0;">
                  <p style="color: #856404; font-size: 13px; margin: 0;">
                    ⏱ Бесплатный триал на 30 дней
                  </p>
                </div>
              </div>
              
              <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e5e5;">
                <p style="color: #999; font-size: 13px; margin: 0; line-height: 1.6;">
                  Если вы не запрашивали этот код, просто проигнорируйте это письмо.
                </p>
              </div>
            </div>
          </body>
          </html>
        `
      })
    });

    const data = await resendResponse.json();
    
    console.log('Resend response status:', resendResponse.status);
    console.log('Resend response data:', JSON.stringify(data));

    if (resendResponse.ok) {
      console.log('✅ Email sent successfully!');
      return res.json({ 
        success: true, 
        message: 'Код отправлен на ' + email + '!',
        emailId: data.id
      });
    } else {
      console.error('❌ Resend API error:', data);
      
      // Детальная ошибка для разных случаев
      let errorMessage = 'Ошибка отправки';
      
      if (data.message) {
        errorMessage = data.message;
      }
      
      if (data.name === 'validation_error') {
        errorMessage = 'Некорректный email адрес';
      }
      
      return res.status(500).json({ 
        success: false, 
        error: errorMessage,
        details: data,
        code: code // Временно показываем код при ошибке
      });
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Ошибка сервера: ' + error.message
    });
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

function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}
