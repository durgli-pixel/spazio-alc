// api/verify-code.js
import admin from 'firebase-admin';

// Инициализация Firebase Admin
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

export default async function handler(req, res) {
    // Разрешаем кросс-доменные запросы
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ valid: false, error: 'Method not allowed' });

    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);

    const { code } = body;
    if (!code) return res.status(400).json({ valid: false, error: 'Code required' });

    try {
        // Ищем документ с кодом
        const docRef = db.collection('accessCodes').doc(code);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return res.status(200).json({ valid: false, error: 'Invalid or used code' });
        }

        const data = docSnap.data();
        // Можно проверять истечение времени:
        const now = Date.now();
        if (data.timestamp && process.env.ACCESS_CODE_EXPIRATION) {
            const expiration = parseInt(process.env.ACCESS_CODE_EXPIRATION, 10) * 1000;
            if (now - data.timestamp > expiration) {
                return res.status(200).json({ valid: false, error: 'Code expired' });
            }
        }

        // Опционально помечаем код как использованный
        await docRef.update({ used: true });

        return res.status(200).json({ valid: true, message: 'Access granted' });
    } catch (err) {
        console.error('Verify code error:', err);
        return res.status(500).json({ valid: false, error: 'Internal server error' });
    }
}
