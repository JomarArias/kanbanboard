import { Router } from 'express';
import {
    syncUser, listUsers, updateUserRole, softDeleteUser,
    reactivateUser, getAuditLogs, getMyProfile, updateMyProfile
} from '../controllers/user.controller.js';
import { verifyFirebaseToken, requireUser, requireAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

// Sync logged-in user to DB after Firebase login
router.post('/sync', verifyFirebaseToken, syncUser);

// Profile (own)
router.get('/me', verifyFirebaseToken, requireUser, getMyProfile);
router.patch('/me', verifyFirebaseToken, requireUser, updateMyProfile);

// Admin: User management
router.get('/', verifyFirebaseToken, requireUser, requireAdmin, listUsers);
router.patch('/:id/role', verifyFirebaseToken, requireUser, requireAdmin, updateUserRole);
router.delete('/:id', verifyFirebaseToken, requireUser, requireAdmin, softDeleteUser);
router.patch('/:id/reactivate', verifyFirebaseToken, requireUser, requireAdmin, reactivateUser);

// Admin: Full audit log with filters
router.get('/audit-logs', verifyFirebaseToken, requireUser, requireAdmin, getAuditLogs);

export default router;
