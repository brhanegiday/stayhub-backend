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

/**
 * @swagger
 * /api/users/profile/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user profile
 *     description: Get public user profile information by user ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "64a1b2c3d4e5f6789012345"
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "64a1b2c3d4e5f6789012345"
 *                     name:
 *                       type: string
 *                       example: "John Doe"
 *                     bio:
 *                       type: string
 *                       example: "Travel enthusiast and property host"
 *                     role:
 *                       type: string
 *                       enum: [user, host, admin]
 *                       example: "host"
 *                     joinedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2023-01-01T00:00:00.000Z"
 *                     profileImage:
 *                       type: string
 *                       example: "https://cloudinary.com/profile.jpg"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/profile/:id", getUserProfile);

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     tags: [Users]
 *     summary: Update user profile
 *     description: Update current authenticated user's profile information
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 description: Full name of the user
 *                 example: "John Doe"
 *               bio:
 *                 type: string
 *                 maxLength: 500
 *                 description: User biography or description
 *                 example: "Travel enthusiast and property host with 5+ years experience"
 *               phone:
 *                 type: string
 *                 description: User's phone number
 *                 example: "+1234567890"
 *               profileImage:
 *                 type: string
 *                 description: URL to user's profile image
 *                 example: "https://cloudinary.com/profile.jpg"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Profile updated successfully"
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put("/profile", authenticate, validateProfileUpdate, updateUserProfile);

/**
 * @swagger
 * /api/users/stats:
 *   get:
 *     tags: [Users]
 *     summary: Get user statistics
 *     description: Get statistics and analytics for the current authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalBookings:
 *                       type: number
 *                       description: Total number of bookings made by user
 *                       example: 15
 *                     totalProperties:
 *                       type: number
 *                       description: Total properties owned (for hosts)
 *                       example: 3
 *                     totalEarnings:
 *                       type: number
 *                       description: Total earnings from properties (for hosts)
 *                       example: 15750.50
 *                     averageRating:
 *                       type: number
 *                       description: Average rating received (for hosts)
 *                       example: 4.8
 *                     totalReviews:
 *                       type: number
 *                       description: Total number of reviews received
 *                       example: 42
 *                     memberSince:
 *                       type: string
 *                       format: date-time
 *                       description: User registration date
 *                       example: "2023-01-01T00:00:00.000Z"
 *                     completedBookings:
 *                       type: number
 *                       description: Number of completed bookings
 *                       example: 12
 *                     cancelledBookings:
 *                       type: number
 *                       description: Number of cancelled bookings
 *                       example: 2
 *       401:
 *         description: Unauthorized - Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/stats", authenticate, getUserStats);

/**
 * @swagger
 * /api/users/account:
 *   delete:
 *     tags: [Users]
 *     summary: Delete user account
 *     description: Permanently delete the current user's account and all associated data
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Account deleted successfully"
 *       401:
 *         description: Unauthorized - Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Cannot delete account with active bookings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/account", authenticate, deleteUserAccount);

export default router;