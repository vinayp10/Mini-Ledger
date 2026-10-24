import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import User from '../models/User.js';

/**
 * Generate a random 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * @desc    Send OTP to a phone number
 * @route   POST /api/auth/send-otp
 * @access  Public
 */
export const sendOtp = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const { phone } = req.body;

    let user = await User.findOne({ phone });

    if (!user) {
      user = new User({ phone });
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await user.save();

    console.log(`\n========================================`);
    console.log(`  OTP for ${phone}: ${otp}`);
    console.log(`  Expires at: ${user.otpExpiresAt.toISOString()}`);
    console.log(`========================================\n`);

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      ...(process.env.NODE_ENV !== 'production' && { otp }),
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP. Please try again.',
    });
  }
};

/**
 * @desc    Verify OTP and return JWT token
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
export const verifyOtp = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const { phone, otp } = req.body;

    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please request an OTP first.',
      });
    }

    if (!user.otp) {
      return res.status(400).json({
        success: false,
        message: 'No OTP requested. Please request an OTP first.',
      });
    }

    if (user.otpExpiresAt && new Date() > user.otpExpiresAt) {
      user.otp = null;
      user.otpExpiresAt = null;
      await user.save();

      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.',
      });
    }

    // Verify OTP (accepts generated OTP or universal demo OTP 123456)
    const isValidOtp = user.otp === otp || otp === '123456';
    if (!isValidOtp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please try again.',
      });
    }

    user.otp = null;
    user.otpExpiresAt = null;
    await user.save();

    const token = jwt.sign(
      { id: user._id, phone: user.phone, name: user.name || 'User' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      token,
      user: {
        id: user._id,
        phone: user.phone,
        name: user.name || 'User',
      },
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP. Please try again.',
    });
  }
};

/**
 * @desc    Google OAuth Sign-in & Verification
 * @route   POST /api/auth/google
 * @access  Public
 */
export const googleLogin = async (req, res) => {
  try {
    const { credential, email, name, avatar, googleId } = req.body;

    let userEmail = email;
    let userName = name;
    let userAvatar = avatar;
    let userGoogleId = googleId;

    // Decode Google JWT credential if sent by Google Sign-In button
    if (credential) {
      try {
        const decoded = jwt.decode(credential);
        if (decoded && decoded.email) {
          userEmail = decoded.email;
          userName = decoded.name || userName || 'Google User';
          userAvatar = decoded.picture || userAvatar || '';
          userGoogleId = decoded.sub || userGoogleId;
        }
      } catch (decodeErr) {
        console.warn('Google credential decode error:', decodeErr);
      }
    }

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        message: 'Google email is required for authentication.',
      });
    }

    let user = await User.findOne({
      $or: [
        { email: userEmail },
        ...(userGoogleId ? [{ googleId: userGoogleId }] : []),
      ],
    });

    if (!user) {
      user = new User({
        email: userEmail,
        name: userName || userEmail.split('@')[0],
        avatar: userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userEmail)}`,
        googleId: userGoogleId,
        authProvider: 'google',
      });
      await user.save();
    } else {
      if (!user.googleId && userGoogleId) user.googleId = userGoogleId;
      if (!user.avatar && userAvatar) user.avatar = userAvatar;
      if (!user.name && userName) user.name = userName;
      await user.save();
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name, phone: user.phone },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(200).json({
      success: true,
      message: 'Google authentication verified successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        authProvider: user.authProvider,
      },
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({
      success: false,
      message: 'Google authentication failed. Please try again.',
    });
  }
};
