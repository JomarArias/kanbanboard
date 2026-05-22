import { Router } from 'express';
import { registerPushToken } from '../controllers/push-token.controller.js';

const router = Router();

router.post('/push-tokens', registerPushToken);

export default router;
