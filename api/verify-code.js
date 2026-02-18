import { db } from './firebase-admin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ valid: false });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);

    const { code } = body;

    if (!code) {
      return res.status(400).json({ valid: false, error: 'Code required' });
    }

    const docRef = db.collection('accessCodes').doc(code);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(200).json({ valid: false, error: 'Invalid code' });
    }

    const data = doc.data();

    if (data.used) {
      return res.status(200).json({ valid: false, error: 'Code already used' });
    }

    await docRef.update({ used: true });

    return res.status(200).json({ valid: true });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ valid: false, error: 'Server error' });
  }
}
