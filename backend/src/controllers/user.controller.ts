import { Request, Response } from 'express';
import { User } from '../models/User.js';
import { AuditLog } from '../models/audit-log.js';
import { sendError } from '../utils/http-response.js';

// ─── Profile Endpoints ────────────────────────────────────────────────────────

export const getMyProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = res.locals.user;
        const profile = await User.findById(user._id).select('-firebaseUid');
        if (!profile) { sendError(res, 404, 'User not found'); return; }
        res.json(profile);
    } catch (error) {
        sendError(res, 500, 'Error fetching profile', error);
    }
};

export const updateMyProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = res.locals.user;
        const { name, picture } = req.body;

        if (!name || name.trim().length < 2) {
            sendError(res, 400, 'Name must be at least 2 characters'); return;
        }

        const updated = await User.findByIdAndUpdate(
            user._id,
            { name: name.trim(), picture: picture?.trim() || user.picture },
            { new: true }
        ).select('-firebaseUid');

        res.json(updated);
    } catch (error) {
        sendError(res, 500, 'Error updating profile', error);
    }
};

/**
 * Called after Firebase login to sync/create the user in MongoDB.
 * Uses the Firebase UID from the verified token, not from the body.
 */
export const syncUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const firebaseUid = (req as any).firebaseUid;

        if (!firebaseUid) {
            res.status(400).json({ message: 'Missing Firebase UID in token' });
            return;
        }

        const email: string = (req as any).firebaseEmail || req.body.email || '';
        const name: string = (req as any).firebaseName || req.body.name || 'User';
        const picture: string = (req as any).firebasePicture || req.body.picture || '';

        let user = await User.findOne({ firebaseUid });

        if (!user && email) {
            // Check if user exists by email (e.g. migrated from Auth0)
            user = await User.findOne({ email });
            if (user) {
                user.firebaseUid = firebaseUid;
                await user.save();
            }
        }

        if (!user) {
            user = new User({
                firebaseUid,
                email: email || `${firebaseUid}@placeholder.com`,
                name: name || 'Anonymous',
                picture: picture || '',
            });
            await user.save();
        } else {
            // Block deactivated accounts before granting access
            if (user.isDeleted) {
                res.status(403).json({ message: 'User not found or deactivated. Please sync your account.' });
                return;
            }
            // Update name/picture from latest token
            user.name = name || user.name;
            user.picture = picture || user.picture;
            await user.save();
        }

        res.status(200).json({ message: 'User synchronized successfully', user });
    } catch (error) {
        console.error('Error in syncUser:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// ─── Admin Endpoints ──────────────────────────────────────────────────────────

export const listUsers = async (req: Request, res: Response): Promise<void> => {
    try {
        const users = await User.find({}).select('-firebaseUid').sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        sendError(res, 500, 'Error fetching users', error);
    }
};

export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        const currentUser = res.locals.user;

        if (!['admin', 'member'].includes(role)) {
            sendError(res, 400, 'Role must be admin or member');
            return;
        }

        // Safety: cannot demote yourself
        if (currentUser._id.toString() === id && role !== 'admin') {
            sendError(res, 400, 'No puedes quitarte a ti mismo el rol de admin');
            return;
        }

        // Safety: ensure at least one admin remains
        if (role === 'member') {
            const adminCount = await User.countDocuments({ role: 'admin', isDeleted: { $ne: true } });
            const targetUser = await User.findById(id);
            if (targetUser?.role === 'admin' && adminCount <= 1) {
                sendError(res, 400, 'No se puede degradar: el sistema debe tener al menos un administrador');
                return;
            }
        }

        const user = await User.findByIdAndUpdate(id, { role }, { new: true }).select('-firebaseUid');
        if (!user) {
            sendError(res, 404, 'User not found');
            return;
        }

        res.json(user);
    } catch (error) {
        sendError(res, 500, 'Error updating user role', error);
    }
};

export const softDeleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const currentUser = res.locals.user;

        if (currentUser._id.toString() === id) {
            sendError(res, 400, 'No puedes desactivar tu propia cuenta');
            return;
        }

        const user = await User.findByIdAndUpdate(
            id,
            { isDeleted: true, deletedAt: new Date() },
            { new: true }
        ).select('-firebaseUid');

        if (!user) {
            sendError(res, 404, 'User not found');
            return;
        }

        res.json({ message: 'User deactivated', user });
    } catch (error) {
        sendError(res, 500, 'Error deactivating user', error);
    }
};

export const reactivateUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const user = await User.findByIdAndUpdate(
            id,
            { isDeleted: false, deletedAt: null },
            { new: true }
        ).select('-firebaseUid');

        if (!user) {
            sendError(res, 404, 'User not found');
            return;
        }

        res.json({ message: 'User reactivated', user });
    } catch (error) {
        sendError(res, 500, 'Error reactivating user', error);
    }
};

export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
    try {
        const { action, from, to, limit = 100, userId, workspaceId } = req.query;

        const filter: any = {};
        if (action) filter.action = action;
        if (userId) filter.performedBy = userId;
        if (workspaceId) filter.workspaceId = workspaceId;
        if (from || to) {
            filter.timestamp = {};
            if (from) filter.timestamp.$gte = new Date(from as string);
            if (to) filter.timestamp.$lte = new Date(to as string);
        }

        const logs = await AuditLog.find(filter)
            .populate('performedBy', 'name picture email')
            .populate('workspaceId', 'name')
            .sort({ timestamp: -1 })
            .limit(Number(limit));

        res.json(logs);
    } catch (error) {
        sendError(res, 500, 'Error fetching audit logs', error);
    }
};
