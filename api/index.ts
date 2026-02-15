import app from '../backend/src/app.js';
import { connectToDatabase } from '../backend/src/db.js';

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
