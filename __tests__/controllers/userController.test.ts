import { Request, Response } from "express";
import {
    getUserProfile,
    updateUserProfile,
    getUserStats,
    deleteUserAccount,
} from "../../src/controllers/userController";
import User from "../../src/models/User";
import Property from "../../src/models/Property";
import Booking from "../../src/models/Booking";

// Mock the models
jest.mock("../../src/models/User");
jest.mock("../../src/models/Property");
jest.mock("../../src/models/Booking");

const mockedUser = User as jest.Mocked<typeof User>;
const mockedProperty = Property as jest.Mocked<typeof Property>;
const mockedBooking = Booking as jest.Mocked<typeof Booking>;

describe("UserController", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });

        req = {
            params: {},
            body: {},
            user: undefined,
        };

        res = {
            status: statusMock,
            json: jsonMock,
        };

        jest.clearAllMocks();
        console.error = jest.fn();
    });

    describe("getUserProfile", () => {
        const mockUser = {
            _id: "507f1f77bcf86cd799439011",
            name: "John Doe",
            email: "john@example.com",
            avatar: "avatar.jpg",
            role: "renter",
            bio: "Test bio",
            phone: "+1234567890",
            isVerified: true,
            createdAt: new Date(),
        };

        it("should get user profile successfully", async () => {
            req.params = { id: "507f1f77bcf86cd799439011" };

            mockedUser.findById = jest.fn().mockReturnValue({
                select: jest.fn().mockResolvedValue(mockUser),
            });

            await getUserProfile(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                success: true,
                data: {
                    user: {
                        id: mockUser._id,
                        name: mockUser.name,
                        email: mockUser.email,
                        avatar: mockUser.avatar,
                        role: mockUser.role,
                        bio: mockUser.bio,
                        phone: mockUser.phone,
                        isVerified: mockUser.isVerified,
                        createdAt: mockUser.createdAt,
                    },
                },
            });
        });

        it("should get host profile with additional data", async () => {
            const hostUser = { ...mockUser, role: "host" };
            req.params = { id: "507f1f77bcf86cd799439011" };

            mockedUser.findById = jest.fn().mockReturnValue({
                select: jest.fn().mockResolvedValue(hostUser),
            });
            mockedProperty.countDocuments = jest.fn().mockResolvedValue(5);
            mockedBooking.countDocuments = jest.fn().mockResolvedValue(10);

            await getUserProfile(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                success: true,
                data: {
                    user: {
                        id: hostUser._id,
                        name: hostUser.name,
                        email: hostUser.email,
                        avatar: hostUser.avatar,
                        role: hostUser.role,
                        bio: hostUser.bio,
                        phone: hostUser.phone,
                        isVerified: hostUser.isVerified,
                        createdAt: hostUser.createdAt,
                    },
                    propertiesCount: 5,
                    totalBookings: 10,
                },
            });
        });

        it("should return 404 if user not found", async () => {
            req.params = { id: "507f1f77bcf86cd799439011" };

            mockedUser.findById = jest.fn().mockReturnValue({
                select: jest.fn().mockResolvedValue(null),
            });

            await getUserProfile(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "User not found",
            });
        });

        it("should handle database errors", async () => {
            req.params = { id: "507f1f77bcf86cd799439011" };

            mockedUser.findById = jest.fn().mockReturnValue({
                select: jest.fn().mockRejectedValue(new Error("Database error")),
            });

            await getUserProfile(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "Failed to fetch user profile",
                error: "Database error",
            });
        });
    });

    describe("updateUserProfile", () => {
        const mockUser = {
            _id: "507f1f77bcf86cd799439011",
            name: "John Doe",
            email: "john@example.com",
            avatar: "avatar.jpg",
            role: "renter",
            bio: "Test bio",
            phone: "+1234567890",
            isVerified: true,
        };

        it("should update user profile successfully", async () => {
            req.user = mockUser as any;
            req.body = {
                name: "Updated Name",
                bio: "Updated bio",
                phone: "+0987654321",
            };

            const updatedUser = { ...mockUser, ...req.body };
            mockedUser.findByIdAndUpdate = jest.fn().mockResolvedValue(updatedUser);

            await updateUserProfile(req as Request, res as Response);

            expect(mockedUser.findByIdAndUpdate).toHaveBeenCalledWith(
                mockUser._id,
                {
                    name: "Updated Name",
                    bio: "Updated bio",
                    phone: "+0987654321",
                },
                { new: true, runValidators: true }
            );

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
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
        });

        it("should update only provided fields", async () => {
            req.user = mockUser as any;
            req.body = { name: "Updated Name" };

            const updatedUser = { ...mockUser, name: "Updated Name" };
            mockedUser.findByIdAndUpdate = jest.fn().mockResolvedValue(updatedUser);

            await updateUserProfile(req as Request, res as Response);

            expect(mockedUser.findByIdAndUpdate).toHaveBeenCalledWith(
                mockUser._id,
                { name: "Updated Name" },
                { new: true, runValidators: true }
            );
        });

        it("should return 401 if user not authenticated", async () => {
            req.user = undefined;

            await updateUserProfile(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "Not authenticated",
            });
        });

        it("should return 404 if user not found", async () => {
            req.user = mockUser as any;
            req.body = { name: "Updated Name" };

            mockedUser.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

            await updateUserProfile(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "User not found",
            });
        });

        it("should handle database errors", async () => {
            req.user = mockUser as any;
            req.body = { name: "Updated Name" };

            mockedUser.findByIdAndUpdate = jest.fn().mockRejectedValue(new Error("Database error"));

            await updateUserProfile(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "Failed to update profile",
                error: "Database error",
            });
        });
    });

    describe("getUserStats", () => {
        const mockUser = {
            _id: "507f1f77bcf86cd799439011",
            role: "host",
        };

        it("should get host stats successfully", async () => {
            req.user = mockUser as any;

            mockedProperty.countDocuments = jest
                .fn()
                .mockResolvedValueOnce(5) // totalProperties
                .mockResolvedValueOnce(4); // activeProperties

            mockedBooking.countDocuments = jest
                .fn()
                .mockResolvedValueOnce(10) // totalBookings
                .mockResolvedValueOnce(2) // pendingBookings
                .mockResolvedValueOnce(6); // confirmedBookings

            mockedBooking.aggregate = jest.fn().mockResolvedValue([{ totalEarnings: 5000 }]);

            await getUserStats(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                success: true,
                data: {
                    stats: {
                        totalProperties: 5,
                        activeProperties: 4,
                        totalBookings: 10,
                        pendingBookings: 2,
                        confirmedBookings: 6,
                        totalEarnings: 5000,
                    },
                },
            });
        });

        it("should get renter stats successfully", async () => {
            const renterUser = { ...mockUser, role: "renter" };
            req.user = renterUser as any;

            mockedBooking.countDocuments = jest
                .fn()
                .mockResolvedValueOnce(3) // totalBookings
                .mockResolvedValueOnce(1) // upcomingBookings
                .mockResolvedValueOnce(2); // completedBookings

            mockedBooking.aggregate = jest.fn().mockResolvedValue([{ totalSpent: 1500 }]);

            await getUserStats(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                success: true,
                data: {
                    stats: {
                        totalBookings: 3,
                        upcomingBookings: 1,
                        completedBookings: 2,
                        totalSpent: 1500,
                    },
                },
            });
        });

        it("should return 401 if user not authenticated", async () => {
            req.user = undefined;

            await getUserStats(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "Not authenticated",
            });
        });

        it("should handle database errors", async () => {
            req.user = mockUser as any;

            mockedProperty.countDocuments = jest.fn().mockRejectedValue(new Error("Database error"));

            await getUserStats(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "Failed to fetch user statistics",
                error: "Database error",
            });
        });
    });

    describe("deleteUserAccount", () => {
        const mockUser = {
            _id: "507f1f77bcf86cd799439011",
            role: "renter",
        };

        it("should delete user account successfully", async () => {
            req.user = mockUser as any;

            mockedBooking.countDocuments = jest.fn().mockResolvedValue(0);
            mockedUser.findByIdAndDelete = jest.fn().mockResolvedValue(mockUser);

            await deleteUserAccount(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                success: true,
                message: "Account deleted successfully",
            });
        });

        it("should delete host account and deactivate properties", async () => {
            const hostUser = { ...mockUser, role: "host" };
            req.user = hostUser as any;

            mockedBooking.countDocuments = jest.fn().mockResolvedValue(0);
            mockedProperty.updateMany = jest.fn().mockResolvedValue({});
            mockedUser.findByIdAndDelete = jest.fn().mockResolvedValue(hostUser);

            await deleteUserAccount(req as Request, res as Response);

            expect(mockedProperty.updateMany).toHaveBeenCalledWith({ hostId: hostUser._id }, { isActive: false });
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                success: true,
                message: "Account deleted successfully",
            });
        });

        it("should return 401 if user not authenticated", async () => {
            req.user = undefined;

            await deleteUserAccount(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "Not authenticated",
            });
        });

        it("should return 400 if user has active bookings", async () => {
            req.user = mockUser as any;

            mockedBooking.countDocuments = jest.fn().mockResolvedValue(2);

            await deleteUserAccount(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "Cannot delete account with active bookings",
            });
        });

        it("should handle database errors", async () => {
            req.user = mockUser as any;

            mockedBooking.countDocuments = jest.fn().mockRejectedValue(new Error("Database error"));

            await deleteUserAccount(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "Failed to delete account",
                error: "Database error",
            });
        });
    });
});
