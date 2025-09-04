import mongoose, { Document, Schema, Types } from "mongoose";

export interface IProperty extends Document {
    title: string;
    description: string;
    pricePerNight: number;
    location: {
        address: string;
        city: string;
        country: string;
        coordinates?: {
            lat: number;
            lng: number;
        };
    };
    images: string[];
    amenities: string[];
    bedrooms: number;
    bathrooms: number;
    maxGuests: number;
    propertyType: "apartment" | "house" | "villa" | "condo" | "studio";
    hostId: Types.ObjectId;
    isActive: boolean;
    rules: string[];
    checkInTime: string;
    checkOutTime: string;
    createdAt: Date;
    updatedAt: Date;
}

const PropertySchema = new Schema<IProperty>(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        description: {
            type: String,
            required: true,
            trim: true,
            maxlength: 1000,
        },
        pricePerNight: {
            type: Number,
            required: true,
            min: 1,
        },
        location: {
            address: {
                type: String,
                required: true,
                trim: true,
            },
            city: {
                type: String,
                required: true,
                trim: true,
            },
            country: {
                type: String,
                required: true,
                trim: true,
            },
            coordinates: {
                lat: Number,
                lng: Number,
            },
        },
        images: [
            {
                type: String,
                required: true,
            },
        ],
        amenities: [
            {
                type: String,
                trim: true,
            },
        ],
        bedrooms: {
            type: Number,
            required: true,
            min: 1,
        },
        bathrooms: {
            type: Number,
            required: true,
            min: 1,
        },
        maxGuests: {
            type: Number,
            required: true,
            min: 1,
        },
        propertyType: {
            type: String,
            enum: ["apartment", "house", "villa", "condo", "studio"],
            required: true,
        },
        hostId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        rules: [
            {
                type: String,
                trim: true,
            },
        ],
        checkInTime: {
            type: String,
            default: "15:00",
        },
        checkOutTime: {
            type: String,
            default: "11:00",
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Index for search functionality
PropertySchema.index({
    "location.city": "text",
    "location.country": "text",
    title: "text",
    description: "text",
});

PropertySchema.index({ pricePerNight: 1 });
PropertySchema.index({ isActive: 1 });

// Virtual for property bookings
PropertySchema.virtual("bookings", {
    ref: "Booking",
    localField: "_id",
    foreignField: "propertyId",
});

// Virtual for host details
PropertySchema.virtual("host", {
    ref: "User",
    localField: "hostId",
    foreignField: "_id",
    justOne: true,
});

export default mongoose.model<IProperty>("Property", PropertySchema);
