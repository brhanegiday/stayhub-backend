import express from "express";
import {
    getUserProfile,
    updateUserProfile,
    getUserStats,
    deleteUserAccount,
} from "../controllers/userController";
import { authenticate } from "../middleware/auth";
import { body } from "express-validator";
import { handleValidationErrors } from "../middleware/validation";

const router = express.Router();

// Validation for profile update
const validateProfileUpdate = [
    body("name")
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage("Name must be between 2 and 50 characters"),
    body("bio")
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage("Bio must not exceed 500 characters"),
    body("phone")
        .optional()
        .trim()
        .isMobilePhone("any")
        .withMessage("Valid phone number is required"),
    handleValidationErrors,
];

// @route   GET /api/users/profile/:id
// @desc    Get user profile (public)
// @access  Public
router.get("/profile/:id", getUserProfile);

// @route   PUT /api/users/profile
// @desc    Update current user profile
// @access  Private
router.put("/profile", authenticate, validateProfileUpdate, updateUserProfile);

// @route   GET /api/users/stats
// @desc    Get current user statistics
// @access  Private
router.get("/stats", authenticate, getUserStats);

// @route   DELETE /api/users/account
// @desc    Delete user account
// @access  Private
router.delete("/account", authenticate, deleteUserAccount);

export default router;