import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    googleId?: string;
    email: string;
    password?: string;
    name: string;
    avatar?: string;
    role: "renter" | "host";
    phone?: string;
    bio?: string;
    isVerified: boolean;
    emailVerificationToken?: string;
    emailVerificationExpires?: Date;
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    refreshToken?: string;
    refreshTokenExpires?: Date;
    loginAttempts?: number;
    lockUntil?: Date;
    twoFactorEnabled: boolean;
    twoFactorSecret?: string;
    authProvider: "local" | "google";
    lastLogin?: Date;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
    generateEmailVerificationToken(): string;
    generatePasswordResetToken(): string;
    generateRefreshToken(): string;
    isLocked(): boolean;
    incLoginAttempts(): Promise<void>;
}

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 2 * 60 * 60 * 1000; // 2 hours

const UserSchema = new Schema<IUser>(
    {
        googleId: {
            type: String,
            sparse: true,
            unique: true,
            index: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
        },
        password: {
            type: String,
            minlength: [6, 'Password must be at least 6 characters'],
            select: false,
        },
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: [2, 'Name must be at least 2 characters'],
            maxlength: [50, 'Name cannot exceed 50 characters'],
        },
        avatar: {
            type: String,
            default: '',
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
        emailVerificationToken: {
            type: String,
            select: false,
        },
        emailVerificationExpires: {
            type: Date,
            select: false,
        },
        passwordResetToken: {
            type: String,
            select: false,
        },
        passwordResetExpires: {
            type: Date,
            select: false,
        },
        refreshToken: {
            type: String,
            select: false,
        },
        refreshTokenExpires: {
            type: Date,
            select: false,
        },
        loginAttempts: {
            type: Number,
            required: true,
            default: 0,
        },
        lockUntil: {
            type: Date,
        },
        twoFactorEnabled: {
            type: Boolean,
            default: false,
        },
        twoFactorSecret: {
            type: String,
            select: false,
        },
        authProvider: {
            type: String,
            enum: ['local', 'google'],
            default: 'local',
        },
        lastLogin: {
            type: Date,
        },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: function(doc, ret) {
                delete ret.password;
                delete ret.refreshToken;
                delete ret.emailVerificationToken;
                delete ret.passwordResetToken;
                delete ret.twoFactorSecret;
                delete ret.loginAttempts;
                delete ret.lockUntil;
                return ret;
            }
        },
        toObject: { virtuals: true },
    }
);

// Remove the virtual since we have an instance method with the same name

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

// Pre-save middleware to hash password
UserSchema.pre('save', async function(next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) return next();

    // For Google OAuth users, skip password hashing
    if (this.authProvider === 'google' && !this.password) return next();

    try {
        // Hash password with cost of 12
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password!, salt);
        next();
    } catch (error: any) {
        next(error);
    }
});

// Pre-save middleware to handle login attempts
UserSchema.pre('save', function(next) {
    // If we have a previous value and are not modifying loginAttempts
    if (!this.isModified('loginAttempts') && !this.isModified('lockUntil')) {
        return next();
    }

    // If we have a lockUntil value and it's in the past, remove it and reset attempts
    if (this.lockUntil && this.lockUntil < new Date()) {
        this.set({
            loginAttempts: undefined,
            lockUntil: undefined
        });
    }

    next();
});

// Instance method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
    if (!this.password) return false;
    return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to generate email verification token
UserSchema.methods.generateEmailVerificationToken = function(): string {
    const token = crypto.randomBytes(20).toString('hex');

    // Hash token and set to emailVerificationToken field
    this.emailVerificationToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

    // Set expire
    this.emailVerificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    return token;
};

// Instance method to generate password reset token
UserSchema.methods.generatePasswordResetToken = function(): string {
    const token = crypto.randomBytes(20).toString('hex');

    // Hash token and set to passwordResetToken field
    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

    // Set expire
    this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    return token;
};

// Instance method to generate refresh token
UserSchema.methods.generateRefreshToken = function(): string {
    const token = crypto.randomBytes(40).toString('hex');

    // Hash token and set to refreshToken field
    this.refreshToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

    // Set expire
    this.refreshTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    return token;
};

// Instance method to check if account is locked
UserSchema.methods.isLocked = function(): boolean {
    return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Instance method to increment login attempts
UserSchema.methods.incLoginAttempts = async function(): Promise<void> {
    // If we have a previous lock that has expired, restart at 1
    if (this.lockUntil && this.lockUntil < new Date()) {
        return this.updateOne({
            $set: {
                loginAttempts: 1
            },
            $unset: {
                lockUntil: 1
            }
        });
    }

    const updates = { $inc: { loginAttempts: 1 } };

    // If we hit max attempts and it's not locked already, lock account
    if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked()) {
        (updates as any).$set = { lockUntil: Date.now() + LOCK_TIME };
    }

    return this.updateOne(updates);
};

// Static method to find user by email verification token
UserSchema.statics.findByEmailVerificationToken = function(token: string) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    return this.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationExpires: { $gt: Date.now() }
    });
};

// Static method to find user by password reset token
UserSchema.statics.findByPasswordResetToken = function(token: string) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    return this.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() }
    });
};

// Static method to find user by refresh token
UserSchema.statics.findByRefreshToken = function(token: string) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    return this.findOne({
        refreshToken: hashedToken,
        refreshTokenExpires: { $gt: Date.now() }
    });
};

// Index for compound queries
UserSchema.index({ email: 1, authProvider: 1 });
UserSchema.index({ googleId: 1, authProvider: 1 });
UserSchema.index({ emailVerificationToken: 1, emailVerificationExpires: 1 });
UserSchema.index({ passwordResetToken: 1, passwordResetExpires: 1 });
UserSchema.index({ refreshToken: 1, refreshTokenExpires: 1 });

export default mongoose.model<IUser>("User", UserSchema);
