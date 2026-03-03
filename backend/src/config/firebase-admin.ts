import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Initializes Firebase Admin SDK using environment variables.
 * Supports both a JSON service account file path or inline env vars.
 */
if (!getApps().length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        // Inline JSON from env var (Vercel / CI friendly)
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        initializeApp({ credential: cert(serviceAccount) });
    } else {
        // Individual env vars fallback
        initializeApp({
            credential: cert({
                projectId: process.env.FIREBASE_PROJECT_ID!,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
                privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
            }),
        });
    }
}

export const firebaseAuth = getAuth();
