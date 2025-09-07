import { body, param, query } from "express-validator";

// Common validation patterns
export const mongoIdValidator = (field: string) => param(field).isMongoId().withMessage(`Invalid ${field} format`);

export const paginationValidators = [
    query("page").custom((value, { req }) => {
        if (!value) return true; // optional field
        const numValue = parseInt(value);
        if (isNaN(numValue) || numValue < 1) {
            throw new Error("Page must be a positive integer");
        }
        return true;
    }),
    query("limit").custom((value, { req }) => {
        if (!value) return true; // optional field
        const numValue = parseInt(value);
        if (isNaN(numValue) || numValue < 1 || numValue > 100) {
            throw new Error("Limit must be between 1 and 100");
        }
        return true;
    }),
];

// User validation
export const validateUserId = mongoIdValidator("id");

// Property validation
export const validatePropertyId = mongoIdValidator("id");

export const validatePropertyFilters = [
    query("city")
        .trim()
        .isLength({ min: 2, max: 50 })
        .custom((value, { req }) => {
            if (!value) return true; // optional field
            return true;
        }),
    query("country")
        .trim()
        .isLength({ min: 2, max: 50 })
        .custom((value, { req }) => {
            if (!value) return true; // optional field
            return true;
        }),
    query("minPrice").custom((value, { req }) => {
        if (!value) return true; // optional field
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < 0) {
            throw new Error("minPrice must be a positive number");
        }
        return true;
    }),
    query("maxPrice").custom((value, { req }) => {
        if (!value) return true; // optional field
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < 0) {
            throw new Error("maxPrice must be a positive number");
        }
        return true;
    }),
    query("propertyType").custom((value, { req }) => {
        if (!value) return true; // optional field
        const validTypes = ["apartment", "house", "villa", "condo", "studio"];
        if (!validTypes.includes(value)) {
            throw new Error("Invalid property type");
        }
        return true;
    }),
    query("bedrooms").custom((value, { req }) => {
        if (!value) return true; // optional field
        const numValue = parseInt(value);
        if (isNaN(numValue) || numValue < 1) {
            throw new Error("bedrooms must be a positive integer");
        }
        return true;
    }),
    query("maxGuests").custom((value, { req }) => {
        if (!value) return true; // optional field
        const numValue = parseInt(value);
        if (isNaN(numValue) || numValue < 1) {
            throw new Error("maxGuests must be a positive integer");
        }
        return true;
    }),
    query("search")
        .trim()
        .isLength({ min: 2, max: 100 })
        .custom((value, { req }) => {
            if (!value) return true; // optional field
            return true;
        }),
    ...paginationValidators,
];

// Booking validation
export const validateBookingId = mongoIdValidator("id");

export const validateBookingDates = [
    body("checkInDate")
        .isISO8601()
        .toDate()
        .withMessage("Valid check-in date is required")
        .custom((value: Date, { req }: any) => {
            if (value < new Date()) {
                throw new Error("Check-in date cannot be in the past");
            }
            return true;
        }),
    body("checkOutDate")
        .isISO8601()
        .toDate()
        .withMessage("Valid check-out date is required")
        .custom((value: Date, { req }: any) => {
            const checkInDate = new Date(req.body.checkInDate);
            if (value <= checkInDate) {
                throw new Error("Check-out date must be after check-in date");
            }
            return true;
        }),
];

export const validateBookingStatus = [
    body("status").custom((value: any) => {
        const validStatuses = ["pending", "confirmed", "canceled", "completed"];
        if (!validStatuses.includes(value)) {
            throw new Error("Invalid booking status");
        }
        return true;
    }),
];

// Image upload validation
export const validateImageUpload = [
    body("images").custom((value: any) => {
        if (!Array.isArray(value)) {
            throw new Error("Images must be an array");
        }
        if (value.length < 1 || value.length > 10) {
            throw new Error("At least 1 and at most 10 images are required");
        }
        return true;
    }),
    body("images.*").custom((value: any) => {
        const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
        if (!urlPattern.test(value)) {
            throw new Error("Each image must be a valid URL");
        }
        return true;
    }),
];

// Date range validation helper
export const validateDateRange = (startDateField: string, endDateField: string, allowPastDates: boolean = false) => [
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
        .custom((value: Date, { req }: any) => {
            const startDate = new Date(req.body[startDateField]);
            if (value <= startDate) {
                throw new Error(`${endDateField} must be after ${startDateField}`);
            }
            return true;
        }),
];

// Phone number validation
export const validatePhoneNumber = (field: string, required: boolean = false) => {
    return body(field).custom((value: any) => {
        if (!required && !value) return true; // optional field
        if (required && !value) {
            throw new Error("Phone number is required");
        }
        // Basic phone number validation - checks for numbers and common phone formats
        const phonePattern = /^[\+]?[1-9][\d]{0,15}$/;
        if (!phonePattern.test(value.replace(/[\s\-\(\)]/g, ""))) {
            throw new Error("Valid phone number is required");
        }
        return true;
    });
};

// URL validation
export const validateUrl = (field: string, required: boolean = true) => {
    return body(field).custom((value: any) => {
        if (!required && !value) return true; // optional field
        if (required && !value) {
            throw new Error(`${field} URL is required`);
        }
        const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
        if (!urlPattern.test(value)) {
            throw new Error(`Valid ${field} URL is required`);
        }
        return true;
    });
};

// Price validation
export const validatePrice = (field: string, min: number = 0) =>
    body(field).custom((value: any) => {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < min) {
            throw new Error(`${field} must be a positive number greater than ${min}`);
        }
        return true;
    });

// Location coordinates validation
export const validateCoordinates = [
    body("location.coordinates.lat").custom((value: any) => {
        if (value === undefined || value === null) return true; // optional field
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < -90 || numValue > 90) {
            throw new Error("Latitude must be between -90 and 90");
        }
        return true;
    }),
    body("location.coordinates.lng").custom((value: any) => {
        if (value === undefined || value === null) return true; // optional field
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < -180 || numValue > 180) {
            throw new Error("Longitude must be between -180 and 180");
        }
        return true;
    }),
];
