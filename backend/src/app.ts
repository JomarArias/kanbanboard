// src/app.ts
import './config/firebase-admin.js'; // Initialize Firebase Admin on startup
import express from "express";
import cors from "cors";
import cardRoutes from "./routes/card.routes.js";
import auditRoutes from "./routes/audit.routes.js";
import workspaceRoutes from "./routes/workspace.routes.js";
import helmetpkg from "helmet";
import { rateLimit } from "express-rate-limit";
import userRoutes from "./routes/user.routes.js";
import { verifyFirebaseToken, requireUser } from "./middlewares/auth.middleware.js";
import { errorHandler } from "./middlewares/error.middleware.js";

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const helmet = (helmetpkg as any).default || helmetpkg;
app.use(helmet());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

const apiRouter = express.Router();

// User routes (sync, profile, admin) — auth handled per-route inside
apiRouter.use('/users', userRoutes);

// Workspace routes — auth handled inside
apiRouter.use(workspaceRoutes);

// Card & audit routes — require Firebase token for all
apiRouter.use(verifyFirebaseToken, requireUser);
apiRouter.use(cardRoutes);
apiRouter.use(auditRoutes);

app.use('/api', apiRouter);

app.get('/', (_req, res) => {
    res.send('Kanban Backend Running');
});

app.use((req, res) => {
    res.status(404).json({
        message: 'Route not found',
        path: req.url,
        method: req.method
    });
});

app.use(errorHandler);

export default app;
