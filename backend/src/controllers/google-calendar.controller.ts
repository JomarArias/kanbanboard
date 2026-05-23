import { Request, Response } from 'express';
import { sendError } from '../utils/http-response.js';
import {
  buildGoogleConsentUrl,
  disconnectGoogleCalendar,
  getGoogleCalendarConnectionStatus,
  saveGoogleTokensFromCallback,
} from '../services/google-oauth.service.js';

const getFrontendProfileUrl = (): string => {
  const baseUrl = process.env.FRONTEND_URL?.trim() || 'http://localhost:4200';
  return `${baseUrl.replace(/\/+$/, '')}/profile`;
};

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
  const profileUrl = getFrontendProfileUrl();

  try {
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;
    const oauthError = req.query.error as string | undefined;

    if (oauthError) {
      return res.redirect(`${profileUrl}?googleCalendar=error`);
    }

    if (!code || !state) {
      return res.redirect(`${profileUrl}?googleCalendar=error`);
    }

    await saveGoogleTokensFromCallback(code, state);
    return res.redirect(`${profileUrl}?googleCalendar=connected`);
  } catch (error: any) {
    return res.redirect(`${profileUrl}?googleCalendar=error`);
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
