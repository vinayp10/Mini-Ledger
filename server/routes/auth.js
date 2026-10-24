import { Router } from 'express';
import { sendOtp, verifyOtp, googleLogin } from '../controllers/authController.js';
import { sendOtpRules, verifyOtpRules } from '../middleware/validate.js';

const router = Router();

// POST /api/auth/send-otp
router.post('/send-otp', sendOtpRules, sendOtp);

// POST /api/auth/verify-otp
router.post('/verify-otp', verifyOtpRules, verifyOtp);

// POST /api/auth/google
router.post('/google', googleLogin);

export default router;
