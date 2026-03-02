import { Request, Response, NextFunction } from 'express';
import { firebaseAuth } from '../config/firebase-admin.js';
import { User } from '../models/User.js';

/**
 * Verifies Firebase ID token from Authorization header.
 * Replaces Auth0's `checkJwt`.
 */
export const verifyFirebaseToken = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ message: 'Missing or invalid Authorization header' });
        return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await firebaseAuth.verifyIdToken(idToken);
        (req as any).firebaseUid = decodedToken.uid;
        (req as any).firebaseEmail = decodedToken.email;
        (req as any).firebaseName = decodedToken.name;
        (req as any).firebasePicture = decodedToken.picture;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Invalid or expired Firebase token' });
    }
};

/**
 * Loads the MongoDB user from DB using firebaseUid.
 * Replaces Auth0's `requireUser`. Must be used AFTER verifyFirebaseToken.
 */
export const requireUser = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const firebaseUid = (req as any).firebaseUid;
        if (!firebaseUid) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const user = await User.findOne({ firebaseUid, isDeleted: { $ne: true } });
        if (!user) {
            res.status(403).json({ message: 'User not found or deactivated. Please sync your account.' });
            return;
        }
        res.locals.user = user;
        next();
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Middleware to restrict routes to admin users only.
 * Must be used AFTER requireUser.
 */
export const requireAdmin = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const user = res.locals.user;
    if (!user || user.role !== 'admin') {
        res.status(403).json({ message: 'Admin access required' });
        return;
    }
    next();
};
