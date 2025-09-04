import { Request, Response } from "express";
import User, { IUser } from "../models/User";
import Property from "../models/Property";
import Booking from "../models/Booking";

export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        
        const user = await User.findById(id).select("-googleId");
        
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found",
            });
            return;
        }

        let additionalData: any = {};

        if (user.role === "host") {
            const propertiesCount = await Property.countDocuments({ 
                hostId: user._id, 
                isActive: true 
            });
            const totalBookings = await Booking.countDocuments({ 
                hostId: user._id 
            });
            
            additionalData = {
                propertiesCount,
                totalBookings,
            };
        }

        res.status(200).json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    avatar: user.avatar,
                    role: user.role,
                    bio: user.bio,
                    phone: user.phone,
                    isVerified: user.isVerified,
                    createdAt: user.createdAt,
                },
                ...additionalData,
            },
        });
    } catch (error: any) {
        console.error("Get user profile error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch user profile",
            error: error.message,
        });
    }
};

export const updateUserProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user as IUser;
        const { name, bio, phone } = req.body;

        if (!user) {
            res.status(401).json({
                success: false,
                message: "Not authenticated",
            });
            return;
        }

        const updatedUser = await User.findByIdAndUpdate(
            user._id,
            {
                ...(name && { name }),
                ...(bio !== undefined && { bio }),
                ...(phone !== undefined && { phone }),
            },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            res.status(404).json({
                success: false,
                message: "User not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: {
                user: {
                    id: updatedUser._id,
                    name: updatedUser.name,
                    email: updatedUser.email,
                    avatar: updatedUser.avatar,
                    role: updatedUser.role,
                    bio: updatedUser.bio,
                    phone: updatedUser.phone,
                    isVerified: updatedUser.isVerified,
                },
            },
        });
    } catch (error: any) {
        console.error("Update user profile error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update profile",
            error: error.message,
        });
    }
};

export const getUserStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user as IUser;

        if (!user) {
            res.status(401).json({
                success: false,
                message: "Not authenticated",
            });
            return;
        }

        let stats: any = {};

        if (user.role === "host") {
            const totalProperties = await Property.countDocuments({ 
                hostId: user._id 
            });
            const activeProperties = await Property.countDocuments({ 
                hostId: user._id, 
                isActive: true 
            });
            const totalBookings = await Booking.countDocuments({ 
                hostId: user._id 
            });
            const pendingBookings = await Booking.countDocuments({ 
                hostId: user._id, 
                status: "pending" 
            });
            const confirmedBookings = await Booking.countDocuments({ 
                hostId: user._id, 
                status: "confirmed" 
            });

            // Calculate total earnings
            const earnings = await Booking.aggregate([
                {
                    $match: {
                        hostId: user._id,
                        status: "completed",
                        paymentStatus: "paid",
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalEarnings: { $sum: "$totalPrice" },
                    },
                },
            ]);

            stats = {
                totalProperties,
                activeProperties,
                totalBookings,
                pendingBookings,
                confirmedBookings,
                totalEarnings: earnings[0]?.totalEarnings || 0,
            };
        } else if (user.role === "renter") {
            const totalBookings = await Booking.countDocuments({ 
                renterId: user._id 
            });
            const upcomingBookings = await Booking.countDocuments({
                renterId: user._id,
                status: "confirmed",
                checkInDate: { $gte: new Date() },
            });
            const completedBookings = await Booking.countDocuments({
                renterId: user._id,
                status: "completed",
            });

            // Calculate total spent
            const spending = await Booking.aggregate([
                {
                    $match: {
                        renterId: user._id,
                        paymentStatus: "paid",
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalSpent: { $sum: "$totalPrice" },
                    },
                },
            ]);

            stats = {
                totalBookings,
                upcomingBookings,
                completedBookings,
                totalSpent: spending[0]?.totalSpent || 0,
            };
        }

        res.status(200).json({
            success: true,
            data: { stats },
        });
    } catch (error: any) {
        console.error("Get user stats error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch user statistics",
            error: error.message,
        });
    }
};

export const deleteUserAccount = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user as IUser;

        if (!user) {
            res.status(401).json({
                success: false,
                message: "Not authenticated",
            });
            return;
        }

        // Check for active bookings
        const activeBookings = await Booking.countDocuments({
            $or: [
                { renterId: user._id, status: { $in: ["pending", "confirmed"] } },
                { hostId: user._id, status: { $in: ["pending", "confirmed"] } },
            ],
            checkOutDate: { $gte: new Date() },
        });

        if (activeBookings > 0) {
            res.status(400).json({
                success: false,
                message: "Cannot delete account with active bookings",
            });
            return;
        }

        // If user is a host, deactivate their properties
        if (user.role === "host") {
            await Property.updateMany(
                { hostId: user._id },
                { isActive: false }
            );
        }

        // Delete user account
        await User.findByIdAndDelete(user._id);

        res.status(200).json({
            success: true,
            message: "Account deleted successfully",
        });
    } catch (error: any) {
        console.error("Delete user account error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete account",
            error: error.message,
        });
    }
};