import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    googleId: string;
    email: string;
    name: string;
    avatar: string;
    role: "renter" | "host";
    phone?: string;
    bio?: string;
    isVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        googleId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        avatar: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            enum: ["renter", "host"],
            required: true,
        },
        phone: {
            type: String,
            trim: true,
        },
        bio: {
            type: String,
            maxlength: 500,
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Virtual for user's properties (if host)
UserSchema.virtual("properties", {
    ref: "Property",
    localField: "_id",
    foreignField: "hostId",
});

// Virtual for user's bookings (if renter)
UserSchema.virtual("bookings", {
    ref: "Booking",
    localField: "_id",
    foreignField: "renterId",
});

export default mongoose.model<IUser>("User", UserSchema);
