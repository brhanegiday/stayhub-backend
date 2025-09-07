import express from "express";
import {
    cancelBooking,
    createBooking,
    getBooking,
    getUserBookings,
    updateBookingStatus,
} from "../controllers/bookingController";
import { authenticate, requireRole } from "../middleware/auth";
import { validateBooking } from "../middleware/validation";
import { bookingLimiter } from "../middleware/rateLimiter";

const router = express.Router();

// @route   GET /api/bookings
// @desc    Get user bookings
// @access  Private
router.get("/", authenticate, getUserBookings);

// @route   GET /api/bookings/:id
// @desc    Get single booking
// @access  Private
router.get("/:id", authenticate, getBooking);

// @route   POST /api/bookings
// @desc    Create new booking
// @access  Private (Renter only)
router.post("/", bookingLimiter, authenticate, requireRole(["renter"]), validateBooking, createBooking);

// @route   PUT /api/bookings/:id/status
// @desc    Update booking status
// @access  Private
router.put("/:id/status", authenticate, updateBookingStatus);

// @route   PUT /api/bookings/:id/cancel
// @desc    Cancel booking
// @access  Private
router.put("/:id/cancel", authenticate, cancelBooking);

export default router;
