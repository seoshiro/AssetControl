import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { changePassword, getMe, login, logout } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

router.post('/login', loginLimiter, asyncHandler(login));
router.get('/me', authenticate, asyncHandler(getMe));
router.post('/logout', authenticate, asyncHandler(logout));
router.put('/change-password', authenticate, asyncHandler(changePassword));

export default router;
