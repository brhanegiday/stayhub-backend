import express from "express";
import { getMe, googleAuth, logout, updateProfile } from "../controllers/authController";
import { authenticate } from "../middleware/auth";
import { validateGoogleAuth } from "../middleware/validation";
import { authLimiter } from "../middleware/rateLimiter";

const router = express.Router();

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
