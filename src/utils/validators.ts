import { body, param, query } from "express-validator";

// Common validation patterns
export const mongoIdValidator = (field: string) =>
    param(field).isMongoId().withMessage(`Invalid ${field} format`);

export const paginationValidators = [
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be a positive integer"),
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),
];

// User validation
export const validateUserId = mongoIdValidator("id");

// Property validation
export const validatePropertyId = mongoIdValidator("id");

export const validatePropertyFilters = [
    query("city").optional().trim().isLength({ min: 2, max: 50 }),
    query("country").optional().trim().isLength({ min: 2, max: 50 }),
    query("minPrice").optional().isFloat({ min: 0 }).toFloat(),
    query("maxPrice").optional().isFloat({ min: 0 }).toFloat(),
    query("propertyType")
        .optional()
        .isIn(["apartment", "house", "villa", "condo", "studio"]),
    query("bedrooms").optional().isInt({ min: 1 }).toInt(),
    query("maxGuests").optional().isInt({ min: 1 }).toInt(),
    query("search").optional().trim().isLength({ min: 2, max: 100 }),
    ...paginationValidators,
];

// Booking validation
export const validateBookingId = mongoIdValidator("id");

export const validateBookingDates = [
    body("checkInDate")
        .isISO8601()
        .toDate()
        .withMessage("Valid check-in date is required")
        .custom((value: Date) => {
            if (value < new Date()) {
                throw new Error("Check-in date cannot be in the past");
            }
            return true;
        }),
    body("checkOutDate")
        .isISO8601()
        .toDate()
        .withMessage("Valid check-out date is required")
        .custom((value: Date, { req }) => {
            const checkInDate = new Date(req.body.checkInDate);
            if (value <= checkInDate) {
                throw new Error("Check-out date must be after check-in date");
            }
            return true;
        }),
];

export const validateBookingStatus = [
    body("status")
        .isIn(["pending", "confirmed", "canceled", "completed"])
        .withMessage("Invalid booking status"),
];

// Image upload validation
export const validateImageUpload = [
    body("images")
        .isArray({ min: 1, max: 10 })
        .withMessage("At least 1 and at most 10 images are required"),
    body("images.*")
        .isURL()
        .withMessage("Each image must be a valid URL"),
];

// Date range validation helper
export const validateDateRange = (
    startDateField: string,
    endDateField: string,
    allowPastDates: boolean = false
) => [
    body(startDateField)
        .isISO8601()
        .toDate()
        .withMessage(`Valid ${startDateField} is required`)
        .custom((value: Date) => {
            if (!allowPastDates && value < new Date()) {
                throw new Error(`${startDateField} cannot be in the past`);
            }
            return true;
        }),
    body(endDateField)
        .isISO8601()
        .toDate()
        .withMessage(`Valid ${endDateField} is required`)
        .custom((value: Date, { req }) => {
            const startDate = new Date(req.body[startDateField]);
            if (value <= startDate) {
                throw new Error(`${endDateField} must be after ${startDateField}`);
            }
            return true;
        }),
];

// Phone number validation
export const validatePhoneNumber = (field: string, required: boolean = false) => {
    const validator = body(field);
    
    if (!required) {
        validator.optional();
    }
    
    return validator
        .isMobilePhone("any")
        .withMessage("Valid phone number is required");
};

// URL validation
export const validateUrl = (field: string, required: boolean = true) => {
    const validator = body(field);
    
    if (!required) {
        validator.optional();
    }
    
    return validator
        .isURL()
        .withMessage(`Valid ${field} URL is required`);
};

// Price validation
export const validatePrice = (field: string, min: number = 0) =>
    body(field)
        .isFloat({ min })
        .withMessage(`${field} must be a positive number greater than ${min}`);

// Location coordinates validation
export const validateCoordinates = [
    body("location.coordinates.lat")
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage("Latitude must be between -90 and 90"),
    body("location.coordinates.lng")
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage("Longitude must be between -180 and 180"),
];