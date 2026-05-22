import { Request, Response } from 'express';
import { User } from '../models/User.js';
import { sendError } from '../utils/http-response.js';

export const registerPushToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = res.locals.user;
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';

    if (!token) {
      sendError(res, 400, 'token es requerido');
      return;
    }

    if (token.length > 4096) {
      sendError(res, 400, 'token invalido');
      return;
    }

    await User.updateOne(
      { _id: user._id },
      { $addToSet: { pushTokens: token } }
    );

    res.status(200).json({ ok: true });
  } catch (error) {
    sendError(res, 500, 'Error registrando push token', error);
  }
};
