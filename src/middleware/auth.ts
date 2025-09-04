import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/User";

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({
                success: false,
                message: "Access token required",
            });
            return;
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            res.status(401).json({
                success: false,
                message: "Access token required",
            });
            return;
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

        const user = (await User.findById(decoded.userId)) as IUser | null;

        if (!user) {
            res.status(401).json({
                success: false,
                message: "Invalid access token",
            });
            return;
        }

        req.user = user;
        next();
    } catch (error) {
        console.error("Auth middleware error:", error);
        res.status(401).json({
            success: false,
            message: "Invalid access token",
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
            });
            return;
        }

        if (!roles.includes(user.role)) {
            res.status(403).json({
                success: false,
                message: "Insufficient permissions",
            });
            return;
        }

        next();
    };
};
