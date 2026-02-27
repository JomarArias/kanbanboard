import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGO_URI;

let cached = (global as any).mongoose;

if (!cached) {
    cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {

    if (!MONGODB_URI) {
        throw new Error(
            'Please define the MONGO_URI environment variable'
        );
    }

    if (cached.conn) {
        console.log('[DEBUG] Using existing database connection (backend/src/db.ts)');
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            serverSelectionTimeoutMS: 5000,
        };

        console.log('[DEBUG] Creating new database connection (backend/src/db.ts)');
        cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
            return mongoose;
        });
    }

    try {
        cached.conn = await cached.promise;
        console.log('[DEBUG] New database connection established (backend/src/db.ts)');
    } catch (e) {
        cached.promise = null;
        console.error('[ERROR] Database connection failed:', e);
        throw e;
    }

    return cached.conn;
}
