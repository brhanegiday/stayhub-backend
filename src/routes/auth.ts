// src/routes/auth.ts
import express from "express";
import { googleAuth, getMe, updateProfile, logout } from "../controllers/authController";
import { validateGoogleAuth } from "../middleware/validation";
import { authenticate } from "../middleware/auth";

const router = express.Router();

// @route   POST /api/auth/google
// @desc    Authenticate with Google OAuth
// @access  Public
router.post("/google", validateGoogleAuth, googleAuth);

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
