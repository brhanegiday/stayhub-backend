import request from "supertest";
import express from "express";
import bookingsRoutes from "../../src/routes/bookings";
import Booking from "../../src/models/Booking";
import Property from "../../src/models/Property";
import User from "../../src/models/User";
import * as jwtUtils from '../../src/utils/jwt';

// Mock dependencies
jest.mock("../../src/models/Booking");
jest.mock("../../src/models/Property");
jest.mock("../../src/models/User");
jest.mock('../../src/utils/jwt');

// Mock rate limiter to prevent rate limiting in tests
jest.mock("../../src/middleware/rateLimiter", () => ({
    authLimiter: (req: any, res: any, next: any) => next(),
    generalLimiter: (req: any, res: any, next: any) => next(),
    speedLimiter: (req: any, res: any, next: any) => next(),
    propertyLimiter: (req: any, res: any, next: any) => next(),
    bookingLimiter: (req: any, res: any, next: any) => next(),
    uploadLimiter: (req: any, res: any, next: any) => next(),
    strictAuthLimiter: (req: any, res: any, next: any) => next(),
    trustProxy: false,
}));

const MockBooking = Booking as jest.Mocked<typeof Booking>;
const MockProperty = Property as jest.Mocked<typeof Property>;
const MockUser = User as jest.Mocked<typeof User>;
const mockJwtUtils = jwtUtils as jest.Mocked<typeof jwtUtils>;

describe("Bookings Routes", () => {
    let app: express.Application;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use("/bookings", bookingsRoutes);

        process.env.JWT_SECRET = "test-secret";
        process.env.JWT_EXPIRE = "15m";
        process.env.JWT_REFRESH_SECRET = "refresh-secret";
        process.env.JWT_REFRESH_EXPIRE = "30d";
        jest.clearAllMocks();
    });

    afterEach(() => {
        delete process.env.JWT_SECRET;
        delete process.env.JWT_EXPIRE;
        delete process.env.JWT_REFRESH_SECRET;
        delete process.env.JWT_REFRESH_EXPIRE;
    });

    describe("POST /bookings", () => {
        const mockRenter = {
            _id: "renter123",
            role: "renter",
            email: "renter@example.com",
            name: "John Renter",
        };

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const dayAfterTomorrow = new Date();
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

        const validBookingData = {
            propertyId: "507f1f77bcf86cd799439011", // Valid MongoDB ObjectId format
            checkInDate: tomorrow.toISOString(),
            checkOutDate: dayAfterTomorrow.toISOString(),
            numberOfGuests: 2,
        };

        it("should create booking for authenticated renter", async () => {
            // Mock authentication middleware
            const mockSelect = jest.fn().mockResolvedValue(mockRenter);
            MockUser.findById = jest.fn().mockReturnValue({ select: mockSelect } as any);
            mockJwtUtils.extractTokenFromHeader.mockReturnValue('valid-token');
            mockJwtUtils.verifyAccessToken.mockReturnValue({ userId: "renter123" } as any);

            const mockProperty = {
                _id: "507f1f77bcf86cd799439011", // Valid MongoDB ObjectId format
                pricePerNight: 100,
                maxGuests: 4,
                isActive: true,
                hostId: "host123",
            };

            MockProperty.findById.mockResolvedValue(mockProperty as any);
            MockBooking.findOne.mockResolvedValue(null); // No conflicts

            const savedBooking = {
                _id: "booking123",
                propertyId: "507f1f77bcf86cd799439011",
                renterId: "renter123",
                checkInDate: validBookingData.checkInDate,
                checkOutDate: validBookingData.checkOutDate,
                numberOfGuests: validBookingData.numberOfGuests,
                totalPrice: 100,
                status: "pending",
            };

            const mockBookingInstance = {
                save: jest.fn().mockResolvedValue(savedBooking),
                populate: jest.fn().mockReturnThis(),
            };

            (Booking as any).mockImplementation(() => mockBookingInstance);

            const response = await request(app)
                .post("/bookings")
                .set("Authorization", "Bearer valid-token")
                .send(validBookingData);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
        });

        it("should fail without authentication", async () => {
            mockJwtUtils.extractTokenFromHeader.mockReturnValue(null);

            const response = await request(app).post("/bookings").send(validBookingData);

            expect(response.status).toBe(401);
            expect(response.body).toEqual({
                success: false,
                message: "Access token required",
                code: "TOKEN_MISSING",
            });
        });
    });

    describe("GET /bookings", () => {
        const mockUser = {
            _id: "user123",
            role: "renter",
        };

        it("should get user bookings", async () => {
            // Mock authentication middleware
            const mockSelect = jest.fn().mockResolvedValue(mockUser);
            MockUser.findById = jest.fn().mockReturnValue({ select: mockSelect } as any);
            mockJwtUtils.extractTokenFromHeader.mockReturnValue('valid-token');
            mockJwtUtils.verifyAccessToken.mockReturnValue({ userId: "user123" } as any);

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

            const response = await request(app).get("/bookings").set("Authorization", "Bearer valid-token");

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it("should fail without authentication", async () => {
            mockJwtUtils.extractTokenFromHeader.mockReturnValue(null);

            const response = await request(app).get("/bookings");

            expect(response.status).toBe(401);
            expect(response.body).toEqual({
                success: false,
                message: "Access token required",
                code: "TOKEN_MISSING",
            });
        });
    });
});
