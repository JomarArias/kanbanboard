// src/app.ts
import express from "express";
import cors from "cors";
import cardRoutes from "./routes/card.routes.js";
import auditRoutes from "./routes/audit.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

// Debug Middleware
app.use((req, res, next) => {
    console.log(`[DEBUG] Incoming Request: ${req.method} ${req.url}`);
    console.log(`[DEBUG] BaseURL: ${req.baseUrl}, OriginalUrl: ${req.originalUrl}`);
    next();
});

const apiRouter = express.Router();
apiRouter.use(cardRoutes);
apiRouter.use(auditRoutes);

app.use('/api', apiRouter);

app.get('/', (req, res) => {
    res.send('Kanban Backend Running');
});

app.use((req, res) => {
    console.log(`404 Not Found: ${req.method} ${req.url}`);
    res.status(404).json({
        message: 'Route not found',
        path: req.url,
        method: req.method
    });
});

export default app;
