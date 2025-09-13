import express from "express";
import {
    register,
    login,
    verifyEmail,
    resendEmailVerification,
    forgotPassword,
    resetPassword,
    changePassword,
    refreshToken,
    googleAuth,
    getMe,
    updateProfile,
    logout
} from "../controllers/authController";
import { authenticate } from "../middleware/auth";
import {
    validateRegistration,
    validateLogin,
    validateGoogleAuth,
    validateForgotPassword,
    validateResetPassword,
    validateChangePassword,
    validateResendEmailVerification
} from "../middleware/validation";
import { authLimiter, strictAuthLimiter } from "../middleware/rateLimiter";

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register new user with email and password
// @access  Public
router.post("/register", authLimiter, validateRegistration, register);

// @route   POST /api/auth/login
// @desc    Login user with email and password
// @access  Public
router.post("/login", authLimiter, validateLogin, login);

// @route   GET /api/auth/verify-email
// @desc    Verify email address
// @access  Public
router.get("/verify-email", verifyEmail);

// @route   POST /api/auth/resend-verification
// @desc    Resend email verification
// @access  Public
router.post("/resend-verification", authLimiter, validateResendEmailVerification, resendEmailVerification);

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post("/forgot-password", strictAuthLimiter, validateForgotPassword, forgotPassword);

// @route   POST /api/auth/reset-password/:token
// @desc    Reset password with token
// @access  Public
router.post("/reset-password/:token", authLimiter, validateResetPassword, resetPassword);

// @route   POST /api/auth/change-password
// @desc    Change password (authenticated users)
// @access  Private
router.post("/change-password", authenticate, authLimiter, validateChangePassword, changePassword);

// @route   POST /api/auth/refresh-token
// @desc    Refresh access token
// @access  Public
router.post("/refresh-token", authLimiter, refreshToken);

// @route   POST /api/auth/google
// @desc    Authenticate with Google OAuth
// @access  Public
router.post("/google", authLimiter, validateGoogleAuth, googleAuth);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get("/me", authenticate, getMe);

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put("/profile", authenticate, updateProfile);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post("/logout", authenticate, logout);

export default router;
