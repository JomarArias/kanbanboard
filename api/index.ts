import app from '../backend/src/app.js';
import mongoose from 'mongoose';

// Mongoose connection options for serverless
const MONGODB_URI = process.env.MONGO_URI;

if (!MONGODB_URI) {
    throw new Error(
        'Please define the MONGO_URI environment variable inside .env.local'
    );
}

// Global cached connection
let cached = (global as any).mongoose;

if (!cached) {
    cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
    if (cached.conn) {
        console.log('[DEBUG] Using existing database connection');
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false, // Disable mongoose buffering
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
        };

        console.log('[DEBUG] Creating new database connection');
        cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
            return mongoose;
        });
    }

    try {
        cached.conn = await cached.promise;
        console.log('[DEBUG] New database connection established');
    } catch (e) {
        cached.promise = null;
        console.error('[ERROR] Database connection failed:', e);
        throw e;
    }

    return cached.conn;
}

export default async function handler(req, res) {
    console.log(`[DEBUG] Serverless Handler Invoked: ${req.method} ${req.url}`);

    // Strip /api prefix if present to match routes mounted on /
    if (req.url.startsWith('/api')) {
        req.url = req.url.replace('/api', '');
    }
    if (req.url === '') req.url = '/';

    console.log(`[DEBUG] Modified URL for Express: ${req.url}`);

    await connectToDatabase();
    return app(req, res);
}
