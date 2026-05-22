import { Router } from 'express';
import { deleteAllNotifications, getNotifications, markNotificationRead } from '../controllers/notification.controller.js';

const router = Router();

router.get('/notifications', getNotifications);
router.patch('/notifications/:id/read', markNotificationRead);
router.delete('/notifications', deleteAllNotifications);

export default router;

