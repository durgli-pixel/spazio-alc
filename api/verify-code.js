export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ valid: false, error: 'Code required' });
  }

  const codePattern = /^SPAZIO-[A-Z0-9]{6}$/;
  
  if (codePattern.test(code)) {
    return res.json({ valid: true });
  } else {
    return res.json({ valid: false });
  }
}
