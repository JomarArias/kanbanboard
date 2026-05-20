import { Request, Response } from 'express';
import { sendError } from '../utils/http-response.js';
import * as notificationService from '../services/notification.service.js';

export const getNotifications = async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.user._id.toString();
    const notifications = await notificationService.listNotificationsByUser(userId);
    return res.json(notifications);
  } catch (error) {
    return sendError(res, 500, 'Error listando notificaciones', error);
  }
};

export const markNotificationRead = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = res.locals.user._id.toString();

    const notification = await notificationService.markNotificationAsRead(id, userId);
    return res.json(notification);
  } catch (error: any) {
    if (error?.status === 400) return sendError(res, 400, error.message);
    if (error?.status === 404) return sendError(res, 404, error.message);
    return sendError(res, 500, 'Error actualizando notificacion', error);
  }
};

