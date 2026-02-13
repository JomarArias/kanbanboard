import app from '../src/app.js';
import mongoose from 'mongoose';

let isConnected = false;

const connectToDatabase = async () => {
    if (isConnected) {
        console.log('Using existing database connection');
        return;
    }

    try {
        const db = await mongoose.connect(process.env.MONGO_URI!);
        isConnected = db.connections[0].readyState === 1;
        console.log('New database connection');
    } catch (error) {
        console.error('Error connecting to database:', error);
    }
};

export default async function handler(req: any, res: any) {
    await connectToDatabase();
    return app(req, res);
}
