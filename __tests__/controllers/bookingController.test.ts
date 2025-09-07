import { Request, Response } from "express";
import {
    createBooking,
    getUserBookings,
    updateBookingStatus,
    getBooking,
    cancelBooking,
} from "../../src/controllers/bookingController";
import Booking from "../../src/models/Booking";
import Property from "../../src/models/Property";
import mongoose from "mongoose";

// Mock the models
jest.mock("../../src/models/Booking");
jest.mock("../../src/models/Property");

const MockBooking = Booking as jest.Mocked<typeof Booking>;
const MockProperty = Property as jest.Mocked<typeof Property>;

describe("Booking Controller", () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let statusMock: jest.Mock;
    let jsonMock: jest.Mock;

    beforeEach(() => {
        statusMock = jest.fn().mockReturnThis();
        jsonMock = jest.fn().mockReturnThis();

        mockRes = {
            status: statusMock,
            json: jsonMock,
        };

        jest.clearAllMocks();
    });

    describe("createBooking", () => {
        const mockRenter = {
            _id: new mongoose.Types.ObjectId(),
            role: "renter",
            email: "renter@example.com",
            name: "John Renter",
        };

        const mockHost = {
            _id: new mongoose.Types.ObjectId(),
            role: "host",
        };

        const mockProperty = {
            _id: new mongoose.Types.ObjectId(),
            title: "Test Property",
            pricePerNight: 100,
            maxGuests: 4,
            isActive: true,
            hostId: mockHost._id,
        };

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const dayAfterTomorrow = new Date();
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 3);

        const validBookingData = {
            propertyId: mockProperty._id.toString(),
            checkInDate: tomorrow.toISOString(),
            checkOutDate: dayAfterTomorrow.toISOString(),
            numberOfGuests: 2,
            specialRequests: "Late check-in",
        };

        beforeEach(() => {
            mockReq = {
                user: mockRenter as any,
                body: validBookingData,
            };
        });

        it("should create booking successfully", async () => {
            MockProperty.findById.mockResolvedValue(mockProperty as any);
            MockBooking.findOne.mockResolvedValue(null); // No conflicting booking

            const mockBookingInstance = {
                save: jest.fn().mockResolvedValue({
                    _id: "booking123",
                    propertyId: "property123",
                    renterId: "renter123",
                }),
                populate: jest.fn().mockReturnThis(),
                _id: new mongoose.Types.ObjectId(),
                propertyId: mockProperty._id,
                renterId: mockRenter._id,
                hostId: mockProperty.hostId,
                checkInDate: tomorrow,
                checkOutDate: dayAfterTomorrow,
                totalPrice: 200, // 2 nights * 100 per night
                numberOfGuests: 2,
                specialRequests: "Late check-in",
            };

            (MockBooking as any).mockImplementation(() => mockBookingInstance);

            await createBooking(mockReq as Request, mockRes as Response);

            expect(MockProperty.findById).toHaveBeenCalledWith(mockProperty._id.toString());
            expect(MockBooking.findOne).toHaveBeenCalledWith({
                propertyId: mockProperty._id.toString(),
                status: { $in: ["confirmed", "pending"] },
                $or: expect.any(Array),
            });

            expect(mockBookingInstance.save).toHaveBeenCalled();
            expect(mockBookingInstance.populate).toHaveBeenCalledWith([
                { path: "property", select: "title images location pricePerNight" },
                { path: "host", select: "name avatar email phone" },
                { path: "renter", select: "name avatar email phone" },
            ]);

            expect(statusMock).toHaveBeenCalledWith(201);
            expect(jsonMock).toHaveBeenCalledWith({
                success: true,
                message: "Booking created successfully",
                data: { booking: mockBookingInstance },
            });
        });

        it("should fail when user is not a renter", async () => {
            mockReq.user = { ...mockRenter, role: "host" } as any;

            await createBooking(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "Only renters can create bookings",
            });
        });

        it("should fail when user is not authenticated", async () => {
            mockReq.user = undefined;

            await createBooking(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "Only renters can create bookings",
            });
        });

        it("should fail when check-in date is in the past", async () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            mockReq.body = {
                ...validBookingData,
                checkInDate: yesterday.toISOString(),
            };

            await createBooking(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "Check-in date cannot be in the past",
            });
        });

        it("should fail when check-out date is before check-in date", async () => {
            mockReq.body = {
                ...validBookingData,
                checkInDate: dayAfterTomorrow.toISOString(),
                checkOutDate: tomorrow.toISOString(),
            };

            await createBooking(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "Check-out date must be after check-in date",
            });
        });

        it("should fail when check-in and check-out dates are the same", async () => {
            mockReq.body = {
                ...validBookingData,
                checkInDate: tomorrow.toISOString(),
                checkOutDate: tomorrow.toISOString(),
            };

            await createBooking(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "Check-out date must be after check-in date",
            });
        });

        it("should fail when property not found", async () => {
            MockProperty.findById.mockResolvedValue(null);

            await createBooking(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "Property not found",
            });
        });

        it("should fail when property is not active", async () => {
            MockProperty.findById.mockResolvedValue({
                ...mockProperty,
                isActive: false,
            } as any);

            await createBooking(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "Property is not available for booking",
            });
        });

        it("should fail when number of guests exceeds maximum", async () => {
            MockProperty.findById.mockResolvedValue(mockProperty as any);
            mockReq.body = {
                ...validBookingData,
                numberOfGuests: 5, // Exceeds maxGuests of 4
            };

            await createBooking(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "Maximum 4 guests allowed",
            });
        });

        it("should fail when there is a conflicting booking", async () => {
            MockProperty.findById.mockResolvedValue(mockProperty as any);
            MockBooking.findOne.mockResolvedValue({
                _id: "existing-booking",
                checkInDate: tomorrow,
                checkOutDate: dayAfterTomorrow,
            } as any);

            await createBooking(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "Property is not available for the selected dates",
            });
        });

        it("should handle database errors during property lookup", async () => {
            MockProperty.findById.mockRejectedValue(new Error("Database error"));

            await createBooking(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "Failed to create booking",
                error: "Database error",
            });
        });

        it("should handle database errors during booking save", async () => {
            MockProperty.findById.mockResolvedValue(mockProperty as any);
            MockBooking.findOne.mockResolvedValue(null);

            const mockBookingInstance = {
                save: jest.fn().mockRejectedValue(new Error("Save error")),
            };

            (MockBooking as any).mockImplementation(() => mockBookingInstance);

            await createBooking(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "Failed to create booking",
                error: "Save error",
            });
        });

        it("should calculate total price correctly", async () => {
            MockProperty.findById.mockResolvedValue(mockProperty as any);
            MockBooking.findOne.mockResolvedValue(null);

            const checkIn = new Date();
            checkIn.setDate(checkIn.getDate() + 1);

            const checkOut = new Date();
            checkOut.setDate(checkOut.getDate() + 4); // 3 nights

            mockReq.body = {
                ...validBookingData,
                checkInDate: checkIn.toISOString(),
                checkOutDate: checkOut.toISOString(),
            };

            let capturedBookingData: any;
            (MockBooking as any).mockImplementation((data: any) => {
                capturedBookingData = data;
                return {
                    save: jest.fn().mockResolvedValue({
                        _id: "booking123",
                        propertyId: "property123",
                        renterId: "renter123",
                    }),
                    populate: jest.fn().mockReturnThis(),
                };
            });

            await createBooking(mockReq as Request, mockRes as Response);

            expect(capturedBookingData.totalPrice).toBe(300); // 3 nights * 100 per night
        });
    });

    describe("getUserBookings", () => {
        const mockUser = {
            _id: new mongoose.Types.ObjectId(),
            role: "renter",
        };

        beforeEach(() => {
            mockReq = {
                user: mockUser as any,
                query: {},
            };
        });

        it("should get user bookings successfully", async () => {
            const mockBookings = [
                { _id: "1", propertyId: "prop1" },
                { _id: "2", propertyId: "prop2" },
            ];

            const mockQuery = {
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue(mockBookings),
            };

            MockBooking.find.mockReturnValue(mockQuery as any);
            MockBooking.countDocuments.mockResolvedValue(2);

            await getUserBookings(mockReq as Request, mockRes as Response);

            expect(MockBooking.find).toHaveBeenCalledWith({ renterId: mockUser._id });
            expect(statusMock).toHaveBeenCalledWith(200);
        });

        it("should fail when user is not authenticated", async () => {
            mockReq.user = undefined;

            await getUserBookings(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "Not authenticated",
            });
        });

        it("should apply status filter", async () => {
            mockReq.query = { status: "confirmed" };

            const mockQuery = {
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue([]),
            };

            MockBooking.find.mockReturnValue(mockQuery as any);
            MockBooking.countDocuments.mockResolvedValue(0);

            await getUserBookings(mockReq as Request, mockRes as Response);

            expect(MockBooking.find).toHaveBeenCalledWith({
                renterId: mockUser._id,
                status: "confirmed",
            });
        });

        it("should handle database errors", async () => {
            MockBooking.find.mockImplementation(() => {
                throw new Error("Database error");
            });

            await getUserBookings(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
        });
    });

    describe("updateBookingStatus", () => {
        const mockUser = {
            _id: new mongoose.Types.ObjectId(),
            role: "host",
        };

        const mockBooking = {
            _id: new mongoose.Types.ObjectId(),
            hostId: mockUser._id,
            renterId: new mongoose.Types.ObjectId(),
            status: "pending",
            property: {
                _id: new mongoose.Types.ObjectId(),
                title: "Test Property",
            },
            host: {
                _id: mockUser._id,
                name: "Test Host",
            },
            renter: {
                _id: new mongoose.Types.ObjectId(),
                name: "Test Renter",
            },
        };

        beforeEach(() => {
            mockReq = {
                user: mockUser,
                params: { id: mockBooking._id.toString() },
                body: { status: "confirmed" },
            };

            // Mock findByIdAndUpdate with populate chaining
            MockBooking.findByIdAndUpdate.mockReturnValue({
                populate: jest.fn().mockResolvedValue({ ...mockBooking, status: "confirmed" }),
            } as any);
        });

        it("should successfully update booking status", async () => {
            MockBooking.findById.mockResolvedValue(mockBooking);

            await updateBookingStatus(mockReq as Request, mockRes as Response);

            expect(MockBooking.findById).toHaveBeenCalledWith(mockBooking._id.toString());
            expect(MockBooking.findByIdAndUpdate).toHaveBeenCalled();
            expect(statusMock).toHaveBeenCalledWith(200);
        });

        it("should fail if user is not authenticated", async () => {
            mockReq.user = undefined;

            await updateBookingStatus(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "Not authenticated",
            });
        });

        it("should fail if booking is not found", async () => {
            MockBooking.findById.mockResolvedValue(null);

            await updateBookingStatus(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "Booking not found",
            });
        });

        it("should fail if user does not have permission", async () => {
            const differentUser = {
                _id: new mongoose.Types.ObjectId(),
                role: "host",
            };
            mockReq.user = differentUser;
            MockBooking.findById.mockResolvedValue(mockBooking);

            await updateBookingStatus(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "You do not have permission to modify this booking",
            });
        });

        it("should fail for invalid status transitions", async () => {
            const completedBooking = { ...mockBooking, status: "completed" };
            MockBooking.findById.mockResolvedValue(completedBooking);
            mockReq.body = { status: "canceled" };

            await updateBookingStatus(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "Cannot change status from completed to canceled",
            });
        });

        it("should allow renter to update their booking", async () => {
            const renterUser = { _id: mockBooking.renterId, role: "renter" };
            mockReq.user = renterUser;
            MockBooking.findById.mockResolvedValue(mockBooking);

            // Mock findByIdAndUpdate for cancellation
            MockBooking.findByIdAndUpdate.mockReturnValue({
                populate: jest.fn().mockResolvedValue({ ...mockBooking, status: "canceled" }),
            } as any);

            mockReq.body = { status: "canceled" };

            await updateBookingStatus(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
        });

        it("should handle cancellation with reason", async () => {
            MockBooking.findById.mockResolvedValue(mockBooking);

            // Mock findByIdAndUpdate for cancellation with reason
            MockBooking.findByIdAndUpdate.mockReturnValue({
                populate: jest.fn().mockResolvedValue({
                    ...mockBooking,
                    status: "canceled",
                    cancellationReason: "Emergency",
                }),
            } as any);

            mockReq.body = { status: "canceled", cancellationReason: "Emergency" };

            await updateBookingStatus(mockReq as Request, mockRes as Response);

            // Since we're using findByIdAndUpdate, we check the mock was called
            expect(MockBooking.findByIdAndUpdate).toHaveBeenCalled();
            expect(statusMock).toHaveBeenCalledWith(200);
        });

        it("should handle database errors", async () => {
            MockBooking.findById.mockRejectedValue(new Error("Database error"));

            await updateBookingStatus(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
        });
    });

    describe("getBooking", () => {
        const mockUser = {
            _id: new mongoose.Types.ObjectId(),
            role: "host",
        };

        const mockBooking = {
            _id: new mongoose.Types.ObjectId(),
            hostId: mockUser._id,
            renterId: new mongoose.Types.ObjectId(),
            status: "confirmed",
        };

        beforeEach(() => {
            mockReq = {
                user: mockUser,
                params: { id: mockBooking._id.toString() },
            };
        });

        it("should successfully get booking details", async () => {
            const populateChain = {
                populate: jest.fn().mockResolvedValue(mockBooking),
            };
            MockBooking.findById.mockReturnValue(populateChain as any);

            await getBooking(mockReq as Request, mockRes as Response);

            expect(MockBooking.findById).toHaveBeenCalledWith(mockBooking._id.toString());
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                success: true,
                data: { booking: mockBooking },
            });
        });

        it("should fail if user is not authenticated", async () => {
            mockReq.user = undefined;

            await getBooking(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "Not authenticated",
            });
        });

        it("should fail if booking is not found", async () => {
            const populateChain = {
                populate: jest.fn().mockResolvedValue(null),
            };
            MockBooking.findById.mockReturnValue(populateChain as any);

            await getBooking(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "Booking not found",
            });
        });

        it("should fail if user does not have permission", async () => {
            const differentUser = {
                _id: new mongoose.Types.ObjectId(),
                role: "host",
            };
            mockReq.user = differentUser;
            const populateChain = {
                populate: jest.fn().mockResolvedValue(mockBooking),
            };
            MockBooking.findById.mockReturnValue(populateChain as any);

            await getBooking(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "You do not have permission to view this booking",
            });
        });

        it("should allow renter to view their booking", async () => {
            const renterUser = { _id: mockBooking.renterId, role: "renter" };
            mockReq.user = renterUser;
            const populateChain = {
                populate: jest.fn().mockResolvedValue(mockBooking),
            };
            MockBooking.findById.mockReturnValue(populateChain as any);

            await getBooking(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
        });

        it("should handle database errors", async () => {
            MockBooking.findById.mockImplementation(() => {
                throw new Error("Database error");
            });

            await getBooking(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
        });
    });

    describe("cancelBooking", () => {
        const mockUser = {
            _id: new mongoose.Types.ObjectId(),
            role: "renter",
        };

        const mockBooking = {
            _id: new mongoose.Types.ObjectId(),
            hostId: new mongoose.Types.ObjectId(),
            renterId: mockUser._id,
            status: "confirmed",
            checkInDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        };

        beforeEach(() => {
            mockReq = {
                user: mockUser,
                params: { id: mockBooking._id.toString() },
                body: { cancellationReason: "Change of plans" },
            };

            // Mock findByIdAndUpdate with populate chain for cancelBooking
            MockBooking.findByIdAndUpdate.mockReturnValue({
                populate: jest.fn().mockResolvedValue({
                    ...mockBooking,
                    status: "canceled",
                    cancellationReason: "Change of plans",
                }),
            } as any);
        });

        it("should successfully cancel booking", async () => {
            MockBooking.findById.mockResolvedValue(mockBooking);

            await cancelBooking(mockReq as Request, mockRes as Response);

            expect(MockBooking.findById).toHaveBeenCalledWith(mockBooking._id.toString());
            expect(MockBooking.findByIdAndUpdate).toHaveBeenCalled();
            expect(statusMock).toHaveBeenCalledWith(200);
        });

        it("should fail if user is not authenticated", async () => {
            mockReq.user = undefined;

            await cancelBooking(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "Not authenticated",
            });
        });

        it("should fail if booking is not found", async () => {
            MockBooking.findById.mockResolvedValue(null);

            await cancelBooking(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "Booking not found",
            });
        });

        it("should fail if user does not have permission", async () => {
            const differentUser = {
                _id: new mongoose.Types.ObjectId(),
                role: "renter",
            };
            mockReq.user = differentUser;
            MockBooking.findById.mockResolvedValue(mockBooking);

            await cancelBooking(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "You do not have permission to cancel this booking",
            });
        });

        it("should fail if booking is already canceled", async () => {
            const canceledBooking = { ...mockBooking, status: "canceled" };
            MockBooking.findById.mockResolvedValue(canceledBooking);

            await cancelBooking(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "Booking is already canceled",
            });
        });

        it("should fail if booking is completed", async () => {
            const completedBooking = { ...mockBooking, status: "completed" };
            MockBooking.findById.mockResolvedValue(completedBooking);

            await cancelBooking(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "Cannot cancel completed booking",
            });
        });

        it("should fail if cancellation is within 24 hours of check-in", async () => {
            const tomorrowBooking = {
                ...mockBooking,
                checkInDate: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
            };
            MockBooking.findById.mockResolvedValue(tomorrowBooking);

            await cancelBooking(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "Cannot cancel booking within 24 hours of check-in",
            });
        });

        it("should allow host to cancel their booking", async () => {
            const hostUser = { _id: mockBooking.hostId, role: "host" };
            mockReq.user = hostUser;
            MockBooking.findById.mockResolvedValue(mockBooking);

            await cancelBooking(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
        });

        it("should handle database errors", async () => {
            MockBooking.findById.mockRejectedValue(new Error("Database error"));

            await cancelBooking(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
        });
    });
});
