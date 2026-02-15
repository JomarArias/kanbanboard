import app from '../backend/src/app.js';
import mongoose from 'mongoose';

let isConnected = false;

const connectToDatabase = async () => {
    if (isConnected) {
        console.log('[DEBUG] Using existing database connection');
        return;
    }

    try {
        const db = await mongoose.connect(process.env.MONGO_URI!);
        isConnected = db.connections[0].readyState === 1;
        console.log('[DEBUG] New database connection established');
    } catch (error) {
        console.error('[ERROR] connecting to database:', error);
    }
};

export default async function handler(req, res) {
    console.log(`[DEBUG] Serverless Handler Invoked: ${req.method} ${req.url}`);
    await connectToDatabase();
    return app(req, res);
}
