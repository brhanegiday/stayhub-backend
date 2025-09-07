import mongoose, { Document, Schema, Types } from "mongoose";

export interface IBooking extends Document {
    _id: mongoose.Types.ObjectId;
    propertyId: Types.ObjectId;
    renterId: Types.ObjectId;
    hostId: Types.ObjectId;
    checkInDate: Date;
    checkOutDate: Date;
    totalPrice: number;
    numberOfGuests: number;
    status: "pending" | "confirmed" | "canceled" | "completed";
    specialRequests?: string;
    paymentStatus: "pending" | "paid" | "refunded";
    cancellationReason?: string;
    canceledAt?: Date;
    canceledBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
    {
        propertyId: {
            type: Schema.Types.ObjectId,
            ref: "Property",
            required: true,
            index: true,
        },
        renterId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        hostId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        checkInDate: {
            type: Date,
            required: true,
        },
        checkOutDate: {
            type: Date,
            required: true,
        },
        totalPrice: {
            type: Number,
            required: true,
            min: 0,
        },
        numberOfGuests: {
            type: Number,
            required: true,
            min: 1,
        },
        status: {
            type: String,
            enum: ["pending", "confirmed", "canceled", "completed"],
            default: "pending",
        },
        specialRequests: {
            type: String,
            maxlength: 500,
        },
        paymentStatus: {
            type: String,
            enum: ["pending", "paid", "refunded"],
            default: "pending",
        },
        cancellationReason: {
            type: String,
            maxlength: 500,
        },
        canceledAt: {
            type: Date,
        },
        canceledBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Compound index to prevent double bookings
BookingSchema.index({
    propertyId: 1,
    checkInDate: 1,
    checkOutDate: 1,
    status: 1,
});

// Index for user bookings
BookingSchema.index({ renterId: 1, status: 1 });
BookingSchema.index({ hostId: 1, status: 1 });

// Virtual for property details
BookingSchema.virtual("property", {
    ref: "Property",
    localField: "propertyId",
    foreignField: "_id",
    justOne: true,
});

// Virtual for renter details
BookingSchema.virtual("renter", {
    ref: "User",
    localField: "renterId",
    foreignField: "_id",
    justOne: true,
});

// Virtual for host details
BookingSchema.virtual("host", {
    ref: "User",
    localField: "hostId",
    foreignField: "_id",
    justOne: true,
});

// Virtual for number of nights
BookingSchema.virtual("numberOfNights").get(function () {
    const diffTime = this.checkOutDate.getTime() - this.checkInDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save validation to ensure dates are valid
BookingSchema.pre("save", function (next) {
    if (this.checkInDate >= this.checkOutDate) {
        next(new Error("Check-out date must be after check-in date"));
        return;
    }

    if (this.checkInDate < new Date()) {
        next(new Error("Check-in date cannot be in the past"));
        return;
    }

    next();
});

export default mongoose.model<IBooking>("Booking", BookingSchema);
