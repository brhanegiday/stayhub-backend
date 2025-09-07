import { Request, Response } from "express";
import Booking from "../models/Booking";
import Property from "../models/Property";
import { IUser } from "../models/User";

export const createBooking = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user as IUser;

        if (!user || user.role !== "renter") {
            res.status(403).json({
                success: false,
                message: "Only renters can create bookings",
            });
            return;
        }

        const { propertyId, checkInDate, checkOutDate, numberOfGuests, specialRequests } = req.body;

        // Validate dates
        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);
        const today = new Date();

        if (checkIn < today) {
            res.status(400).json({
                success: false,
                message: "Check-in date cannot be in the past",
            });
            return;
        }

        if (checkIn >= checkOut) {
            res.status(400).json({
                success: false,
                message: "Check-out date must be after check-in date",
            });
            return;
        }

        // Get property details
        const property = await Property.findById(propertyId);
        if (!property) {
            res.status(404).json({
                success: false,
                message: "Property not found",
            });
            return;
        }

        // Check if property is active
        if (!property.isActive) {
            res.status(400).json({
                success: false,
                message: "Property is not available for booking",
            });
            return;
        }

        // Check max guests
        if (numberOfGuests > property.maxGuests) {
            res.status(400).json({
                success: false,
                message: `Maximum ${property.maxGuests} guests allowed`,
            });
            return;
        }

        // Check for conflicts (double booking prevention)
        const conflictingBooking = await Booking.findOne({
            propertyId,
            status: { $in: ["confirmed", "pending"] },
            $or: [
                {
                    checkInDate: { $lte: checkIn },
                    checkOutDate: { $gt: checkIn },
                },
                {
                    checkInDate: { $lt: checkOut },
                    checkOutDate: { $gte: checkOut },
                },
                {
                    checkInDate: { $gte: checkIn },
                    checkOutDate: { $lte: checkOut },
                },
            ],
        });

        if (conflictingBooking) {
            res.status(400).json({
                success: false,
                message: "Property is not available for the selected dates",
            });
            return;
        }

        // Calculate total price
        const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
        const numberOfNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const totalPrice = numberOfNights * property.pricePerNight;

        // Create booking
        const booking = new Booking({
            propertyId,
            renterId: user._id,
            hostId: property.hostId,
            checkInDate: checkIn,
            checkOutDate: checkOut,
            totalPrice,
            numberOfGuests,
            specialRequests,
        });

        await booking.save();

        // Populate booking details
        await booking.populate([
            { path: "property", select: "title images location pricePerNight" },
            { path: "host", select: "name avatar email phone" },
            { path: "renter", select: "name avatar email phone" },
        ]);

        res.status(201).json({
            success: true,
            message: "Booking created successfully",
            data: { booking },
        });
    } catch (error: any) {
        console.error("Create booking error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create booking",
            error: error.message,
        });
    }
};

export const getUserBookings = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user as IUser;
        const { status, page = 1, limit = 10 } = req.query;

        if (!user) {
            res.status(401).json({
                success: false,
                message: "Not authenticated",
            });
            return;
        }

        const query: any = {};

        if (user.role === "renter") {
            query.renterId = user._id;
        } else if (user.role === "host") {
            query.hostId = user._id;
        }

        if (status) {
            query.status = status;
        }

        const skip = (Number(page) - 1) * Number(limit);

        const bookings = await Booking.find(query)
            .populate([
                { path: "property", select: "title images location pricePerNight" },
                { path: "host", select: "name avatar email phone" },
                { path: "renter", select: "name avatar email phone" },
            ])
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Booking.countDocuments(query);
        const totalPages = Math.ceil(total / Number(limit));

        res.status(200).json({
            success: true,
            data: {
                bookings,
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
        console.error("Get user bookings error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch bookings",
            error: error.message,
        });
    }
};

export const updateBookingStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user as IUser;
        const { id } = req.params;
        const { status, cancellationReason } = req.body;

        if (!user) {
            res.status(401).json({
                success: false,
                message: "Not authenticated",
            });
            return;
        }

        const booking = await Booking.findById(id);
        if (!booking) {
            res.status(404).json({
                success: false,
                message: "Booking not found",
            });
            return;
        }

        // Check permissions
        const isHost = user.role === "host" && booking.hostId.toString() === user._id.toString();
        const isRenter = user.role === "renter" && booking.renterId.toString() === user._id.toString();

        if (!isHost && !isRenter) {
            res.status(403).json({
                success: false,
                message: "You do not have permission to modify this booking",
            });
            return;
        }

        // Validate status transitions
        const validTransitions: { [key: string]: string[] } = {
            pending: ["confirmed", "canceled"],
            confirmed: ["canceled", "completed"],
            canceled: [], // Cannot change from canceled
            completed: [], // Cannot change from completed
        };

        if (!validTransitions[booking.status].includes(status)) {
            res.status(400).json({
                success: false,
                message: `Cannot change status from ${booking.status} to ${status}`,
            });
            return;
        }

        // Only hosts can confirm bookings
        if (status === "confirmed" && !isHost) {
            res.status(403).json({
                success: false,
                message: "Only hosts can confirm bookings",
            });
            return;
        }

        // Update booking
        const updateData: any = { status };

        if (status === "canceled") {
            updateData.canceledAt = new Date();
            updateData.canceledBy = user._id;
            if (cancellationReason) {
                updateData.cancellationReason = cancellationReason;
            }
        }

        const updatedBooking = await Booking.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        }).populate([
            { path: "property", select: "title images location pricePerNight" },
            { path: "host", select: "name avatar email phone" },
            { path: "renter", select: "name avatar email phone" },
        ]);

        res.status(200).json({
            success: true,
            message: `Booking ${status} successfully`,
            data: { booking: updatedBooking },
        });
    } catch (error: any) {
        console.error("Update booking status error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update booking status",
            error: error.message,
        });
    }
};

export const getBooking = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user as IUser;
        const { id } = req.params;

        if (!user) {
            res.status(401).json({
                success: false,
                message: "Not authenticated",
            });
            return;
        }

        const booking = await Booking.findById(id).populate([
            {
                path: "property",
                select: "title images location pricePerNight rules checkInTime checkOutTime amenities",
            },
            { path: "host", select: "name avatar email phone bio" },
            { path: "renter", select: "name avatar email phone" },
        ]);

        if (!booking) {
            res.status(404).json({
                success: false,
                message: "Booking not found",
            });
            return;
        }

        // Check permissions
        const isHost = user.role === "host" && booking.hostId.toString() === user._id.toString();
        const isRenter = user.role === "renter" && booking.renterId.toString() === user._id.toString();

        if (!isHost && !isRenter) {
            res.status(403).json({
                success: false,
                message: "You do not have permission to view this booking",
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: { booking },
        });
    } catch (error: any) {
        console.error("Get booking error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch booking",
            error: error.message,
        });
    }
};

export const cancelBooking = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user as IUser;
        const { id } = req.params;
        const { cancellationReason } = req.body;

        if (!user) {
            res.status(401).json({
                success: false,
                message: "Not authenticated",
            });
            return;
        }

        const booking = await Booking.findById(id);
        if (!booking) {
            res.status(404).json({
                success: false,
                message: "Booking not found",
            });
            return;
        }

        // Check permissions
        const isHost = user.role === "host" && booking.hostId.toString() === user._id.toString();
        const isRenter = user.role === "renter" && booking.renterId.toString() === user._id.toString();

        if (!isHost && !isRenter) {
            res.status(403).json({
                success: false,
                message: "You do not have permission to cancel this booking",
            });
            return;
        }

        // Check if booking can be canceled
        if (booking.status === "canceled") {
            res.status(400).json({
                success: false,
                message: "Booking is already canceled",
            });
            return;
        }

        if (booking.status === "completed") {
            res.status(400).json({
                success: false,
                message: "Cannot cancel completed booking",
            });
            return;
        }

        // Check if cancellation is within 24 hours of check-in
        const checkInTime = new Date(booking.checkInDate).getTime();
        const currentTime = Date.now();
        const timeDifference = checkInTime - currentTime;
        const hoursUntilCheckIn = timeDifference / (1000 * 60 * 60);

        if (hoursUntilCheckIn < 24 && hoursUntilCheckIn > 0) {
            res.status(400).json({
                success: false,
                message: "Cannot cancel booking within 24 hours of check-in",
            });
            return;
        }

        // Update booking
        const updatedBooking = await Booking.findByIdAndUpdate(
            id,
            {
                status: "canceled",
                canceledAt: new Date(),
                canceledBy: user._id,
                cancellationReason: cancellationReason || "",
            },
            { new: true, runValidators: true }
        ).populate([
            { path: "property", select: "title images location pricePerNight" },
            { path: "host", select: "name avatar email phone" },
            { path: "renter", select: "name avatar email phone" },
        ]);

        res.status(200).json({
            success: true,
            message: "Booking canceled successfully",
            data: { booking: updatedBooking },
        });
    } catch (error: any) {
        console.error("Cancel booking error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to cancel booking",
            error: error.message,
        });
    }
};
