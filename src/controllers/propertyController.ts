import { Request, Response } from "express";
import Property, { IProperty } from "../models/Property";
import Booking from "../models/Booking";
import { IUser } from "../models/User";

export const createProperty = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user as IUser;

        if (!user || user.role !== "host") {
            res.status(403).json({
                success: false,
                message: "Only hosts can create properties",
            });
            return;
        }

        const propertyData = {
            ...req.body,
            hostId: user._id,
        };

        const property = new Property(propertyData);
        await property.save();

        await property.populate("host", "name avatar");

        res.status(201).json({
            success: true,
            message: "Property created successfully",
            data: { property },
        });
    } catch (error: any) {
        console.error("Create property error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create property",
            error: error.message,
        });
    }
};

export const getProperties = async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            page = 1,
            limit = 12,
            city,
            country,
            minPrice,
            maxPrice,
            propertyType,
            bedrooms,
            maxGuests,
            search,
        } = req.query;

        const query: any = { isActive: true };

        // Location filters
        if (city) query["location.city"] = new RegExp(city as string, "i");
        if (country) query["location.country"] = new RegExp(country as string, "i");

        // Price filters
        if (minPrice || maxPrice) {
            query.pricePerNight = {};
            if (minPrice) query.pricePerNight.$gte = Number(minPrice);
            if (maxPrice) query.pricePerNight.$lte = Number(maxPrice);
        }

        // Property type filter
        if (propertyType) query.propertyType = propertyType;

        // Bedrooms filter
        if (bedrooms) query.bedrooms = { $gte: Number(bedrooms) };

        // Max guests filter
        if (maxGuests) query.maxGuests = { $gte: Number(maxGuests) };

        // Search filter
        if (search) {
            query.$text = { $search: search as string };
        }

        const skip = (Number(page) - 1) * Number(limit);

        const properties = await Property.find(query)
            .populate("host", "name avatar isVerified")
            .sort(search ? { score: { $meta: "textScore" } } : { createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Property.countDocuments(query);
        const totalPages = Math.ceil(total / Number(limit));

        res.status(200).json({
            success: true,
            data: {
                properties,
                pagination: {
                    currentPage: Number(page),
                    totalPages,
                    total,
                    hasNext: Number(page) < totalPages,
                    hasPrev: Number(page) > 1,
                },
            },
        });
    } catch (error: any) {
        console.error("Get properties error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch properties",
            error: error.message,
        });
    }
};

export const getProperty = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const property = await Property.findById(id).populate("host", "name avatar bio phone isVerified createdAt");

        if (!property) {
            res.status(404).json({
                success: false,
                message: "Property not found",
            });
            return;
        }

        // Get existing bookings for availability calendar
        const bookings = await Booking.find({
            propertyId: id,
            status: { $in: ["confirmed", "pending"] },
            checkOutDate: { $gte: new Date() },
        }).select("checkInDate checkOutDate status");

        res.status(200).json({
            success: true,
            data: {
                property,
                bookings,
            },
        });
    } catch (error: any) {
        console.error("Get property error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch property",
            error: error.message,
        });
    }
};

export const updateProperty = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user as IUser;
        const { id } = req.params;

        if (!user || user.role !== "host") {
            res.status(403).json({
                success: false,
                message: "Only hosts can update properties",
            });
            return;
        }

        const property = await Property.findOne({ _id: id, hostId: user._id });

        if (!property) {
            res.status(404).json({
                success: false,
                message: "Property not found or you do not have permission to update it",
            });
            return;
        }

        const updatedProperty = await Property.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true,
        }).populate("host", "name avatar");

        res.status(200).json({
            success: true,
            message: "Property updated successfully",
            data: { property: updatedProperty },
        });
    } catch (error: any) {
        console.error("Update property error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update property",
            error: error.message,
        });
    }
};

export const deleteProperty = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user as IUser;
        const { id } = req.params;

        if (!user || user.role !== "host") {
            res.status(403).json({
                success: false,
                message: "Only hosts can delete properties",
            });
            return;
        }

        const property = await Property.findOne({ _id: id, hostId: user._id });

        if (!property) {
            res.status(404).json({
                success: false,
                message: "Property not found or you do not have permission to delete it",
            });
            return;
        }

        // Check if property has active bookings
        const activeBookings = await Booking.countDocuments({
            propertyId: id,
            status: { $in: ["confirmed", "pending"] },
            checkOutDate: { $gte: new Date() },
        });

        if (activeBookings > 0) {
            res.status(400).json({
                success: false,
                message: "Cannot delete property with active bookings",
            });
            return;
        }

        await Property.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: "Property deleted successfully",
        });
    } catch (error: any) {
        console.error("Delete property error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete property",
            error: error.message,
        });
    }
};

export const getHostProperties = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user as IUser;

        if (!user || user.role !== "host") {
            res.status(403).json({
                success: false,
                message: "Access denied",
            });
            return;
        }

        const properties = await Property.find({ hostId: user._id }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: { properties },
        });
    } catch (error: any) {
        console.error("Get host properties error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch properties",
            error: error.message,
        });
    }
};
