// src/app.ts
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import connectDB from "./config/database";
import logger from "./utils/logger";
import { generalLimiter, speedLimiter, trustProxy } from "./middleware/rateLimiter";
import { setupSwagger } from "./config/swagger";

// Import routes
import authRoutes from "./routes/auth";
import propertyRoutes from "./routes/properties";
import bookingRoutes from "./routes/bookings";
import userRoutes from "./routes/users";

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Trust proxy for rate limiting (if behind reverse proxy)
if (trustProxy) {
    app.set("trust proxy", trustProxy);
}

// Security middleware
app.use(helmet());

// Rate limiting middleware
app.use(generalLimiter);
app.use(speedLimiter);

// CORS configuration
const allowedOrigins = ["http://localhost:3000", "https://stayhub-kx4i.onrender.com"];

app.use(
    cors({
        origin: function (origin, callback) {
            // Allow requests with no origin (like mobile apps or curl)
            if (!origin) return callback(null, true);
            if (allowedOrigins.indexOf(origin) === -1) {
                const msg = "The CORS policy for this site does not allow access from the specified Origin.";
                return callback(new Error(msg), false);
            }
            return callback(null, true);
        },
        credentials: true,
    })
);

// Body parser middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Enhanced logging middleware
const morganFormat = process.env.NODE_ENV === "development" ? "dev" : "combined";
app.use(
    morgan(morganFormat, {
        stream: {
            write: (message: string) => logger.http(message.trim()),
        },
    })
);

// Log all requests
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.originalUrl} - IP: ${req.ip}`);
    next();
});

// Setup Swagger documentation
setupSwagger(app);

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/users", userRoutes);

/**
 * @swagger
 * /api/health:
 *   get:
 *     tags: [Health]
 *     summary: Health check endpoint
 *     description: Check if the API is running and healthy
 *     responses:
 *       200:
 *         description: API is running successfully
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
 *                   example: "StayHub API is running"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2023-01-01T00:00:00.000Z"
 *                 environment:
 *                   type: string
 *                   example: "development"
 */
app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "StayHub API is running",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
    });
});

// Global error handler with enhanced logging
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const statusCode = err.status || 500;

    // Log error with context
    logger.error(`${statusCode} - ${err.message} - ${req.originalUrl} - ${req.method} - IP: ${req.ip}`, {
        error: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
    });

    res.status(statusCode).json({
        success: false,
        message: err.message || "Internal Server Error",
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
});

// Handle 404 routes - catch all unmatched routes
app.use((req, res) => {
    logger.warn(`404 - Route not found: ${req.originalUrl} - ${req.method} - IP: ${req.ip}`);
    res.status(404).json({
        success: false,
        message: "API endpoint not found",
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`);
    logger.info(`🔒 Security features enabled: Rate limiting, File validation, Structured logging`);
});

export default app;
