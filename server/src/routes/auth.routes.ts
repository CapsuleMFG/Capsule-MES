import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, logout, forgotPassword, resetPassword } from '../controllers/auth.controller';

const router = Router();

// Strict rate limit for login: 5 attempts per minute per IP
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limit for forgot-password: 3 per 15 minutes per IP
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { error: 'Too many reset requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, login);
router.post('/logout', logout);
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
