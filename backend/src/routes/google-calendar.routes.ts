import { Router } from 'express';
import {
  getGoogleCalendarConnectUrl,
  getGoogleCalendarStatus,
  googleCalendarOAuthCallback,
  unlinkGoogleCalendar,
} from '../controllers/google-calendar.controller.js';
import { requireUser, verifyFirebaseToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/callback', googleCalendarOAuthCallback);
router.get('/connect', verifyFirebaseToken, requireUser, getGoogleCalendarConnectUrl);
router.get('/status', verifyFirebaseToken, requireUser, getGoogleCalendarStatus);
router.delete('/disconnect', verifyFirebaseToken, requireUser, unlinkGoogleCalendar);

export default router;
