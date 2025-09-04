import { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";

export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: errors.array(),
        });
        return;
    }

    next();
};

// Validation rules for user authentication
export const validateGoogleAuth = [
    body("googleId").notEmpty().withMessage("Google ID is required"),
    body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
    body("name").trim().isLength({ min: 2, max: 50 }).withMessage("Name must be between 2 and 50 characters"),
    body("avatar").isURL().withMessage("Valid avatar URL is required"),
    body("role").isIn(["renter", "host"]).withMessage("Role must be either renter or host"),
    handleValidationErrors,
];

// Validation rules for property creation
export const validateProperty = [
    body("title").trim().isLength({ min: 5, max: 100 }).withMessage("Title must be between 5 and 100 characters"),
    body("description")
        .trim()
        .isLength({ min: 20, max: 1000 })
        .withMessage("Description must be between 20 and 1000 characters"),
    body("pricePerNight").isFloat({ min: 1 }).withMessage("Price per night must be a positive number"),
    body("location.address").trim().notEmpty().withMessage("Address is required"),
    body("location.city").trim().notEmpty().withMessage("City is required"),
    body("location.country").trim().notEmpty().withMessage("Country is required"),
    body("bedrooms").isInt({ min: 1 }).withMessage("Bedrooms must be at least 1"),
    body("bathrooms").isInt({ min: 1 }).withMessage("Bathrooms must be at least 1"),
    body("maxGuests").isInt({ min: 1 }).withMessage("Max guests must be at least 1"),
    body("propertyType").isIn(["apartment", "house", "villa", "condo", "studio"]).withMessage("Invalid property type"),
    body("images").isArray({ min: 1 }).withMessage("At least one image is required"),
    handleValidationErrors,
];

// Validation rules for booking creation
export const validateBooking = [
    body("propertyId").isMongoId().withMessage("Valid property ID is required"),
    body("checkInDate").isISO8601().toDate().withMessage("Valid check-in date is required"),
    body("checkOutDate").isISO8601().toDate().withMessage("Valid check-out date is required"),
    body("numberOfGuests").isInt({ min: 1 }).withMessage("Number of guests must be at least 1"),
    body("specialRequests")
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage("Special requests must not exceed 500 characters"),
    handleValidationErrors,
];
