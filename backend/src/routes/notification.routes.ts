import { Router } from 'express';
import { getNotifications, markNotificationRead } from '../controllers/notification.controller.js';

const router = Router();

router.get('/notifications', getNotifications);
router.patch('/notifications/:id/read', markNotificationRead);

export default router;

