import { Request, Response } from "express";
import jwt, { SignOptions } from "jsonwebtoken";
import User, { IUser } from "../models/User";

export interface AuthenticatedRequest extends Request {
    user?: IUser;
}

const generateToken = (userId: string): string => {
    const secret = process.env.JWT_SECRET as string;
    const JWT_EXPIRE = (process.env.JWT_EXPIRE || "7d") as "7d" | "1h" | "30m";

    if (!secret) {
        throw new Error("JWT_SECRET environment variable is not defined");
    }

    const options: SignOptions = {
        expiresIn: JWT_EXPIRE,
    };

    return jwt.sign({ userId }, secret, options);
};

export const googleAuth = async (req: Request, res: Response) => {
    try {
        const { googleId, email, name, avatar, role } = req.body;

        // Validate required fields
        if (!googleId || !email || !name || !avatar || !role) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields",
            });
        }

        // Validate role
        if (!["renter", "host"].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role. Must be either "renter" or "host"',
            });
        }

        // Check if user already exists
        let user = await User.findOne({ googleId });

        if (user) {
            // User exists, generate token and return user data
            const token = generateToken(user._id.toString());

            return res.status(200).json({
                success: true,
                message: "Login successful",
                data: {
                    user: {
                        id: user._id,
                        email: user.email,
                        name: user.name,
                        avatar: user.avatar,
                        role: user.role,
                        phone: user.phone,
                        bio: user.bio,
                        isVerified: user.isVerified,
                    },
                    token,
                },
            });
        }

        // Create new user
        user = new User({
            googleId,
            email,
            name,
            avatar,
            role,
        });

        await user.save();

        const token = generateToken(user._id.toString());

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    avatar: user.avatar,
                    role: user.role,
                    phone: user.phone,
                    bio: user.bio,
                    isVerified: user.isVerified,
                },
                token,
            },
        });
    } catch (error: any) {
        console.error("Google auth error:", error);
        res.status(500).json({
            success: false,
            message: "Authentication failed",
            error: error.message,
        });
    }
};

export const getMe = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Not authenticated",
            });
        }

        res.status(200).json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    avatar: user.avatar,
                    role: user.role,
                    phone: user.phone,
                    bio: user.bio,
                    isVerified: user.isVerified,
                },
            },
        });
    } catch (error: any) {
        console.error("Get me error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const { phone, bio } = req.body;

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Not authenticated",
            });
        }

        const updatedUser = await User.findByIdAndUpdate(user._id, { phone, bio }, { new: true, runValidators: true });

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: {
                user: {
                    id: updatedUser!._id,
                    email: updatedUser!.email,
                    name: updatedUser!.name,
                    avatar: updatedUser!.avatar,
                    role: updatedUser!.role,
                    phone: updatedUser!.phone,
                    bio: updatedUser!.bio,
                    isVerified: updatedUser!.isVerified,
                },
            },
        });
    } catch (error: any) {
        console.error("Update profile error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update profile",
            error: error.message,
        });
    }
};

export const logout = async (req: AuthenticatedRequest, res: Response) => {
    res.status(200).json({
        success: true,
        message: "Logged out successfully",
    });
};
