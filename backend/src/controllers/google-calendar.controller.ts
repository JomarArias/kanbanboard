import { Request, Response } from 'express';
import { sendError } from '../utils/http-response.js';
import {
  buildGoogleConsentUrl,
  disconnectGoogleCalendar,
  getGoogleCalendarConnectionStatus,
  saveGoogleTokensFromCallback,
} from '../services/google-oauth.service.js';

export const getGoogleCalendarConnectUrl = async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.user._id.toString();
    const authUrl = await buildGoogleConsentUrl(userId);
    return res.json({ authUrl });
  } catch (error) {
    return sendError(res, 500, 'Error generating Google OAuth URL');
  }
};

export const googleCalendarOAuthCallback = async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;
    const oauthError = req.query.error as string | undefined;

    if (oauthError) {
      return sendError(res, 400, `Google OAuth error: ${oauthError}`);
    }

    if (!code || !state) {
      return sendError(res, 400, 'Missing code or state in OAuth callback');
    }

    const result = await saveGoogleTokensFromCallback(code, state);
    return res.status(200).json({
      ok: true,
      connected: true,
      googleEmail: result.googleEmail || null,
    });
  } catch (error: any) {
    return sendError(res, 400, error?.message || 'Error processing OAuth callback');
  }
};

export const getGoogleCalendarStatus = async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.user._id.toString();
    const status = await getGoogleCalendarConnectionStatus(userId);
    return res.json(status);
  } catch (error) {
    return sendError(res, 500, 'Error fetching Google Calendar connection status', error);
  }
};

export const unlinkGoogleCalendar = async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.user._id.toString();
    const result = await disconnectGoogleCalendar(userId);
    return res.json(result);
  } catch (error) {
    return sendError(res, 500, 'Error disconnecting Google Calendar', error);
  }
};
