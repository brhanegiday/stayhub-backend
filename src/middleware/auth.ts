import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/User";
import { verifyAccessToken, extractTokenFromHeader } from "../utils/jwt";

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        const token = extractTokenFromHeader(authHeader || '');

        if (!token) {
            res.status(401).json({
                success: false,
                message: "Access token required",
                code: "TOKEN_MISSING"
            });
            return;
        }

        let decoded;
        try {
            decoded = verifyAccessToken(token);
        } catch (jwtError: any) {
            let message = "Invalid access token";
            let code = "TOKEN_INVALID";

            if (jwtError.name === 'TokenExpiredError') {
                message = "Access token expired";
                code = "TOKEN_EXPIRED";
            } else if (jwtError.name === 'JsonWebTokenError') {
                message = "Malformed access token";
                code = "TOKEN_MALFORMED";
            }

            res.status(401).json({
                success: false,
                message,
                code
            });
            return;
        }

        const user = await User.findById(decoded.userId).select('+isVerified +authProvider +lastLogin');

        if (!user) {
            res.status(401).json({
                success: false,
                message: "User not found",
                code: "USER_NOT_FOUND"
            });
            return;
        }

        // Check if user is verified (only for local auth)
        if (user.authProvider === 'local' && !user.isVerified) {
            res.status(403).json({
                success: false,
                message: "Please verify your email address",
                code: "EMAIL_NOT_VERIFIED"
            });
            return;
        }

        req.user = user;
        next();
    } catch (error) {
        console.error("Auth middleware error:", error);
        res.status(500).json({
            success: false,
            message: "Authentication failed",
            code: "AUTH_ERROR"
        });
    }
};

export const requireRole = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const user = req.user as IUser;
        if (!user) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
                code: "AUTH_REQUIRED"
            });
            return;
        }

        if (!roles.includes(user.role)) {
            res.status(403).json({
                success: false,
                message: "Insufficient permissions",
                code: "INSUFFICIENT_PERMISSIONS"
            });
            return;
        }

        next();
    };
};

// Optional authentication - doesn't fail if no token provided
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        const token = extractTokenFromHeader(authHeader || '');

        if (!token) {
            req.user = undefined;
            next();
            return;
        }

        try {
            const decoded = verifyAccessToken(token);
            const user = await User.findById(decoded.userId).select('+isVerified +authProvider +lastLogin');

            if (user && (user.authProvider !== 'local' || user.isVerified)) {
                req.user = user;
            } else {
                req.user = undefined;
            }
        } catch (jwtError) {
            req.user = undefined;
        }

        next();
    } catch (error) {
        console.error("Optional auth middleware error:", error);
        req.user = undefined;
        next();
    }
};

// Middleware to require verified email
export const requireVerifiedEmail = (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user as IUser;

    if (!user) {
        res.status(401).json({
            success: false,
            message: "Authentication required",
            code: "AUTH_REQUIRED"
        });
        return;
    }

    if (user.authProvider === 'local' && !user.isVerified) {
        res.status(403).json({
            success: false,
            message: "Please verify your email address",
            code: "EMAIL_NOT_VERIFIED"
        });
        return;
    }

    next();
};