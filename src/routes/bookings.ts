import express from "express";
import {
    createBooking,
    getUserBookings,
    updateBookingStatus,
    getBooking,
    cancelBooking,
} from "../controllers/bookingController";
import { authenticate, requireRole } from "../middleware/auth";
import { validateBooking } from "../middleware/validation";

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
router.post("/", authenticate, requireRole(["renter"]), validateBooking, createBooking);

// @route   PUT /api/bookings/:id/status
// @desc    Update booking status
// @access  Private
router.put("/:id/status", authenticate, updateBookingStatus);

// @route   PUT /api/bookings/:id/cancel
// @desc    Cancel booking
// @access  Private
router.put("/:id/cancel", authenticate, cancelBooking);

export default router;
