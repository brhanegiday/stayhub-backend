import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/User";

const generateToken = (userId: string): string => {
    const secret = process.env.JWT_SECRET!;
    const jwtExpire = process.env.JWT_EXPIRE || "7d";

    return jwt.sign({ userId }, secret, { expiresIn: jwtExpire as any });
};

export const googleAuth = async (req: Request, res: Response): Promise<void> => {
    try {
        const { googleId, email, name, avatar, role } = req.body;

        // Validate required fields
        if (!googleId || !email || !name || !avatar || !role) {
            res.status(400).json({
                success: false,
                message: "Missing required fields",
            });
            return;
        }

        // Validate role
        if (!["renter", "host"].includes(role)) {
            res.status(400).json({
                success: false,
                message: 'Invalid role. Must be either "renter" or "host"',
            });
            return;
        }

        // Check if user already exists
        let user = await User.findOne({ googleId });

        if (user) {
            // User exists, generate token and return user data
            const token = generateToken(user._id.toString());

            res.status(200).json({
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
            return;
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

export const getMe = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user as IUser;

        if (!user) {
            res.status(401).json({
                success: false,
                message: "Not authenticated",
            });
            return;
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

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user as IUser;
        const { phone, bio } = req.body;

        if (!user) {
            res.status(401).json({
                success: false,
                message: "Not authenticated",
            });
            return;
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

export const logout = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json({
        success: true,
        message: "Logged out successfully",
    });
};
