import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import logger from "../utils/logger";

// General API rate limiter
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: "Too many requests from this IP, please try again later.",
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip} on ${req.originalUrl}`);
        res.status(429).json({
            success: false,
            message: "Too many requests from this IP, please try again later.",
        });
    },
});

// Strict rate limiter for authentication endpoints
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 5, // Limit each IP to 5 login attempts per windowMs
    message: {
        success: false,
        message: "Too many authentication attempts, please try again later.",
    },
    skipSuccessfulRequests: true,
    handler: (req, res) => {
        logger.warn(`Auth rate limit exceeded for IP: ${req.ip} on ${req.originalUrl}`);
        res.status(429).json({
            success: false,
            message: "Too many authentication attempts, please try again later.",
        });
    },
});

// Property creation limiter (prevent spam)
export const propertyLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 10, // Limit each IP to 10 property creations per hour
    message: {
        success: false,
        message: "Too many property creations, please try again later.",
    },
    handler: (req, res) => {
        logger.warn(`Property creation rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            success: false,
            message: "Too many property creations, please try again later.",
        });
    },
});

// Booking creation limiter
export const bookingLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 20, // Limit each IP to 20 booking attempts per hour
    message: {
        success: false,
        message: "Too many booking attempts, please try again later.",
    },
    handler: (req, res) => {
        logger.warn(`Booking rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            success: false,
            message: "Too many booking attempts, please try again later.",
        });
    },
});

// File upload limiter
export const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 30, // Limit each IP to 30 file uploads per 15 minutes
    message: {
        success: false,
        message: "Too many file uploads, please try again later.",
    },
    handler: (req, res) => {
        logger.warn(`Upload rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            success: false,
            message: "Too many file uploads, please try again later.",
        });
    },
});

// Speed limiter to slow down requests after a certain threshold
export const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 50, // Allow 50 requests per 15 minutes at full speed
    delayMs: (hits) => hits * 100, // Add 100ms delay per request after delayAfter
    maxDelayMs: 2000, // Maximum delay of 2 seconds
});

// Trust proxy setting for rate limiting behind reverse proxy
export const trustProxy = process.env.NODE_ENV === "production" ? 1 : false;
