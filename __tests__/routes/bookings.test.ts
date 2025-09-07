import request from "supertest";
import express from "express";
import bookingsRoutes from "../../src/routes/bookings";
import Booking from "../../src/models/Booking";
import Property from "../../src/models/Property";
import User from "../../src/models/User";
import jwt from "jsonwebtoken";

// Mock dependencies
jest.mock("../../src/models/Booking");
jest.mock("../../src/models/Property");
jest.mock("../../src/models/User");
jest.mock("jsonwebtoken");

const MockBooking = Booking as jest.Mocked<typeof Booking>;
const MockProperty = Property as jest.Mocked<typeof Property>;
const MockUser = User as jest.Mocked<typeof User>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe("Bookings Routes", () => {
    let app: express.Application;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use("/bookings", bookingsRoutes);

        process.env.JWT_SECRET = "test-secret";
        jest.clearAllMocks();
    });

    afterEach(() => {
        delete process.env.JWT_SECRET;
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
            MockUser.findById.mockResolvedValue(mockRenter as any);
            mockJwt.verify.mockReturnValue({ userId: "renter123" } as any);

            const mockProperty = {
                _id: "507f1f77bcf86cd799439011", // Valid MongoDB ObjectId format
                pricePerNight: 100,
                maxGuests: 4,
                isActive: true,
                hostId: "host123",
            };

            MockProperty.findById.mockResolvedValue(mockProperty as any);
            MockBooking.findOne.mockResolvedValue(null); // No conflicts

            const mockBookingInstance = {
                save: jest.fn().mockResolvedValue({
                    _id: "booking123",
                    propertyId: "507f1f77bcf86cd799439011",
                    renterId: "renter123",
                }),
                populate: jest.fn().mockReturnThis(),
            };

            jest.spyOn(Booking.prototype, "save").mockResolvedValue(mockBookingInstance as any);

            const response = await request(app)
                .post("/bookings")
                .set("Authorization", "Bearer valid-token")
                .send(validBookingData);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
        });

        it("should fail without authentication", async () => {
            const response = await request(app).post("/bookings").send(validBookingData);

            expect(response.status).toBe(401);
        });
    });

    describe("GET /bookings", () => {
        const mockUser = {
            _id: "user123",
            role: "renter",
        };

        it("should get user bookings", async () => {
            MockUser.findById.mockResolvedValue(mockUser as any);
            mockJwt.verify.mockReturnValue({ userId: "user123" } as any);

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
            const response = await request(app).get("/bookings");

            expect(response.status).toBe(401);
        });
    });
});
