import { Router } from 'express';
import { verifyFirebaseToken, requireUser } from '../middlewares/auth.middleware.js';
import {
  cancelMyMeetingRequest,
  createMeetingRequest,
  getMyMeetingRequestById,
  listMyMeetingRequests,
} from '../controllers/meeting-request.controller.js';

const router = Router();

router.use(verifyFirebaseToken, requireUser);

router.post('/meeting-requests', createMeetingRequest);
router.get('/meeting-requests', listMyMeetingRequests);
router.get('/meeting-requests/:id', getMyMeetingRequestById);
router.patch('/meeting-requests/:id/cancel', cancelMyMeetingRequest);

export default router;
