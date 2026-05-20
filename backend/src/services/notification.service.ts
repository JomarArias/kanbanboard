import { Types } from 'mongoose';
import { Notification } from '../models/Notification.js';
import { getIO } from '../sockets/socket.server.js';

type CreateNotificationInput = {
  userId: string;
  cardId?: string | null;
  type: string;
  title: string;
  message: string;
};

export const createNotification = async (data: CreateNotificationInput) => {
  const notification = await Notification.create({
    userId: data.userId,
    cardId: data.cardId || null,
    type: data.type,
    title: data.title,
    message: data.message,
    isRead: false
  });

  const payload = {
    id: notification._id.toString(),
    title: notification.title,
    message: notification.message,
    type: notification.type,
    cardId: notification.cardId ? notification.cardId.toString() : null,
    createdAt: notification.createdAt
  };

  try {
    getIO().to(`user:${data.userId}`).emit('notification:new', payload);
  } catch (error) {
    console.error('Socket notification emission error:', error);
  }

  return notification;
};

export const listNotificationsByUser = async (userId: string) => {
  return Notification.find({ userId })
    .sort({ createdAt: -1, _id: -1 })
    .lean();
};

export const markNotificationAsRead = async (notificationId: string, userId: string) => {
  if (!Types.ObjectId.isValid(notificationId)) {
    const error: any = new Error('id invalido');
    error.status = 400;
    throw error;
  }

  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { $set: { isRead: true } },
    { new: true }
  );

  if (!notification) {
    const error: any = new Error('Notificacion no encontrada');
    error.status = 404;
    throw error;
  }

  return notification;
};

