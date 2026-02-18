// api/verify-code.js
import { db } from './firebase-admin.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ valid: false, error: 'Method not allowed' });

    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);
    const { code } = body;

    if (!code) return res.status(400).json({ valid: false, error: 'Code required' });

    try {
        const docRef = db.collection('accessCodes').doc(code);
        const doc = await docRef.get();

        if (!doc.exists) return res.status(200).json({ valid: false, error: 'Invalid code' });

        if (doc.data().used) return res.status(200).json({ valid: false, error: 'Code already used' });

        await docRef.update({ used: true });

        return res.status(200).json({ valid: true, message: 'Access granted' });
    } catch (error) {
        console.error('Verify code error:', error);
        return res.status(500).json({ valid: false, error: 'Server error' });
    }
}
