import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User, { IUser } from "../models/User";
import { generateTokenPair, verifyRefreshToken, hashToken } from "../utils/jwt";
import { emailService } from "../utils/email";

const generateTokenResponse = (user: IUser) => {
    const { accessToken, refreshToken } = generateTokenPair(user._id.toString(), user.email, user.role);

    return {
        user: {
            id: user._id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            role: user.role,
            phone: user.phone,
            bio: user.bio,
            isVerified: user.isVerified,
            authProvider: user.authProvider,
            lastLogin: user.lastLogin,
        },
        accessToken,
        refreshToken,
    };
};

const setCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
});

// Register with email and password
export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, name, role } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            res.status(400).json({
                success: false,
                message: "User with this email already exists",
            });
            return;
        }

        // Create new user
        const user = new User({
            email,
            password,
            name,
            role,
            authProvider: "local",
            isVerified: false,
        });

        // Generate email verification token
        const verificationToken = user.generateEmailVerificationToken();
        await user.save();

        // Send verification email
        try {
            await emailService.sendEmailVerification(user.email, user.name, verificationToken);
        } catch (emailError) {
            console.error("Failed to send verification email:", emailError);
            // Don't fail registration if email fails
        }

        res.status(201).json({
            success: true,
            message: "User registered successfully. Please check your email to verify your account.",
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    isVerified: user.isVerified,
                    authProvider: user.authProvider,
                },
            },
        });
    } catch (error: any) {
        console.error("Registration error:", error);
        res.status(500).json({
            success: false,
            message: "Registration failed",
            error: error.message,
        });
    }
};

// Login with email and password
export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, rememberMe } = req.body;

        // Find user and include password field for verification
        const user = await User.findOne({ email, authProvider: "local" }).select("+password +loginAttempts +lockUntil");

        if (!user) {
            res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
            return;
        }

        // Check if account is locked
        if (user.isLocked()) {
            res.status(423).json({
                success: false,
                message: "Account temporarily locked due to too many failed login attempts. Please try again later.",
            });
            return;
        }

        // Verify password
        const isValidPassword = await user.comparePassword(password);

        if (!isValidPassword) {
            // Increment login attempts
            await user.incLoginAttempts();
            res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
            return;
        }

        // Check if email is verified
        if (!user.isVerified) {
            res.status(403).json({
                success: false,
                message: "Please verify your email before logging in",
                code: "EMAIL_NOT_VERIFIED",
            });
            return;
        }

        // Reset login attempts and update last login
        await user.updateOne({
            $unset: { loginAttempts: 1, lockUntil: 1 },
            $set: { lastLogin: new Date() },
        });

        // Generate tokens
        const tokenData = generateTokenResponse(user);

        // Set refresh token as httpOnly cookie if remember me is checked
        if (rememberMe) {
            res.cookie("refreshToken", tokenData.refreshToken, setCookieOptions());
        }

        res.status(200).json({
            success: true,
            message: "Login successful",
            data: tokenData,
        });
    } catch (error: any) {
        console.error("Login error:", error);
        res.status(500).json({
            success: false,
            message: "Login failed",
            error: error.message,
        });
    }
};

// Verify email address
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
    try {
        const { token } = req.query;

        if (!token) {
            res.status(400).json({
                success: false,
                message: "Verification token is required",
            });
            return;
        }

        // Find user by verification token
        const user = await (User as any).findByEmailVerificationToken(token as string);

        if (!user) {
            res.status(400).json({
                success: false,
                message: "Invalid or expired verification token",
            });
            return;
        }

        // Update user verification status
        user.isVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();

        res.status(200).json({
            success: true,
            message: "Email verified successfully",
        });
    } catch (error: any) {
        console.error("Email verification error:", error);
        res.status(500).json({
            success: false,
            message: "Email verification failed",
            error: error.message,
        });
    }
};

// Resend email verification
export const resendEmailVerification = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email, authProvider: "local" });

        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found",
            });
            return;
        }

        if (user.isVerified) {
            res.status(400).json({
                success: false,
                message: "Email is already verified",
            });
            return;
        }

        // Generate new verification token
        const verificationToken = user.generateEmailVerificationToken();
        await user.save();

        // Send verification email
        await emailService.sendEmailVerification(user.email, user.name, verificationToken);

        res.status(200).json({
            success: true,
            message: "Verification email sent successfully",
        });
    } catch (error: any) {
        console.error("Resend verification error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to resend verification email",
            error: error.message,
        });
    }
};

// Refresh access token
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
        const { refreshToken: tokenFromBody } = req.body;
        const tokenFromCookie = req.cookies?.refreshToken;

        const refreshToken = tokenFromBody || tokenFromCookie;

        if (!refreshToken) {
            res.status(401).json({
                success: false,
                message: "Refresh token required",
            });
            return;
        }

        // Verify refresh token
        const decoded = verifyRefreshToken(refreshToken);

        // Find user by refresh token
        const user = await (User as any).findByRefreshToken(refreshToken);

        if (!user) {
            res.status(401).json({
                success: false,
                message: "Invalid refresh token",
            });
            return;
        }

        // Generate new tokens
        const tokenData = generateTokenResponse(user);

        // Update refresh token in cookie if it was set via cookie
        if (tokenFromCookie) {
            res.cookie("refreshToken", tokenData.refreshToken, setCookieOptions());
        }

        res.status(200).json({
            success: true,
            data: tokenData,
        });
    } catch (error: any) {
        console.error("Token refresh error:", error);
        res.status(401).json({
            success: false,
            message: "Invalid refresh token",
        });
    }
};

export const googleAuth = async (req: Request, res: Response): Promise<void> => {
    try {
        const { googleId, email, name, avatar, role } = req.body;

        // Validate required fields
        if (!googleId || !email || !name || !role) {
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

        // Check if user already exists with Google ID
        let user = await User.findOne({ googleId, authProvider: "google" });

        if (user) {
            // User exists, update last login and generate tokens
            user.lastLogin = new Date();
            await user.save();

            const tokenData = generateTokenResponse(user);

            res.status(200).json({
                success: true,
                message: "Login successful",
                data: tokenData,
            });
            return;
        }

        // Check if user exists with same email but different provider
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            res.status(400).json({
                success: false,
                message:
                    "An account with this email already exists. Please use the existing login method or link your Google account.",
            });
            return;
        }

        // Create new user
        user = new User({
            googleId,
            email,
            name,
            avatar: avatar || "",
            role,
            authProvider: "google",
            isVerified: true, // Google accounts are pre-verified
            lastLogin: new Date(),
        });

        const savedUser = await user.save();
        const tokenData = generateTokenResponse(savedUser);

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: tokenData,
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

// Forgot password
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email, authProvider: "local" });

        if (!user) {
            // Don't reveal if user exists or not for security
            res.status(200).json({
                success: true,
                message: "If a user with that email exists, a password reset link has been sent.",
            });
            return;
        }

        // Generate password reset token
        const resetToken = user.generatePasswordResetToken();
        await user.save();

        // Send password reset email
        try {
            await emailService.sendPasswordReset(user.email, user.name, resetToken);
        } catch (emailError) {
            console.error("Failed to send password reset email:", emailError);
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            await user.save();

            res.status(500).json({
                success: false,
                message: "Failed to send password reset email. Please try again.",
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: "Password reset link has been sent to your email.",
        });
    } catch (error: any) {
        console.error("Forgot password error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to process password reset request",
            error: error.message,
        });
    }
};

// Reset password
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        if (!token) {
            res.status(400).json({
                success: false,
                message: "Reset token is required",
            });
            return;
        }

        if (!password) {
            res.status(400).json({
                success: false,
                message: "New password is required",
            });
            return;
        }

        // Find user by reset token
        const user = await (User as any).findByPasswordResetToken(token);

        if (!user) {
            res.status(400).json({
                success: false,
                message: "Invalid or expired reset token",
            });
            return;
        }

        // Update password
        user.password = password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        user.loginAttempts = undefined;
        user.lockUntil = undefined;
        await user.save();

        // Send password change notification
        try {
            await emailService.sendPasswordChangeNotification(user.email, user.name);
        } catch (emailError) {
            console.error("Failed to send password change notification:", emailError);
            // Don't fail the reset if email fails
        }

        res.status(200).json({
            success: true,
            message: "Password reset successfully",
        });
    } catch (error: any) {
        console.error("Reset password error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to reset password",
            error: error.message,
        });
    }
};

// Change password (authenticated user)
export const changePassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user as IUser;
        const { currentPassword, newPassword } = req.body;

        if (!user) {
            res.status(401).json({
                success: false,
                message: "Not authenticated",
            });
            return;
        }

        // Only allow password change for local auth users
        if (user.authProvider !== "local") {
            res.status(400).json({
                success: false,
                message: "Password change is only available for email/password accounts",
            });
            return;
        }

        // Get user with password field
        const userWithPassword = await User.findById(user._id).select("+password");

        if (!userWithPassword) {
            res.status(404).json({
                success: false,
                message: "User not found",
            });
            return;
        }

        // Verify current password
        const isValidCurrentPassword = await userWithPassword.comparePassword(currentPassword);

        if (!isValidCurrentPassword) {
            res.status(400).json({
                success: false,
                message: "Current password is incorrect",
            });
            return;
        }

        // Update password
        userWithPassword.password = newPassword;
        await userWithPassword.save();

        // Send password change notification
        try {
            await emailService.sendPasswordChangeNotification(user.email, user.name);
        } catch (emailError) {
            console.error("Failed to send password change notification:", emailError);
            // Don't fail the change if email fails
        }

        res.status(200).json({
            success: true,
            message: "Password changed successfully",
        });
    } catch (error: any) {
        console.error("Change password error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to change password",
            error: error.message,
        });
    }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
    try {
        // Clear refresh token cookie if it exists
        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
        });

        res.status(200).json({
            success: true,
            message: "Logged out successfully",
        });
    } catch (error: any) {
        console.error("Logout error:", error);
        res.status(500).json({
            success: false,
            message: "Logout failed",
            error: error.message,
        });
    }
};
