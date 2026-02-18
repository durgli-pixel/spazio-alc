// api/verify-code.js - Проверка кода доступа

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ 
      valid: false, 
      error: 'Code required' 
    });
  }

  // В production здесь должна быть проверка в БД
  // Сейчас используем простую проверку формата
  const codePattern = /^SPAZIO-[A-Z0-9]{6}$/;
  
  if (codePattern.test(code)) {
    return res.json({ 
      valid: true,
      message: 'Access granted'
    });
  } else {
    return res.json({ 
      valid: false,
      error: 'Invalid code format'
    });
  }
}
