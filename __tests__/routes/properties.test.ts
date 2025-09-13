import request from "supertest";
import express from "express";
import propertiesRoutes from "../../src/routes/properties";
import Property from "../../src/models/Property";
import User from "../../src/models/User";
import * as jwtUtils from '../../src/utils/jwt';

// Mock dependencies
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

// Mock cloudinary
jest.mock('../../src/config/cloudinary', () => ({
    uploadImage: jest.fn(),
    deleteImage: jest.fn(),
}));

const MockProperty = Property as jest.Mocked<typeof Property>;
const MockUser = User as jest.Mocked<typeof User>;
const mockJwtUtils = jwtUtils as jest.Mocked<typeof jwtUtils>;

describe("Properties Routes", () => {
    let app: express.Application;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use("/properties", propertiesRoutes);

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

    describe("GET /properties", () => {
        it("should get properties successfully", async () => {
            const mockProperties = [
                { _id: "1", title: "Property 1" },
                { _id: "2", title: "Property 2" },
            ];

            const mockQuery = {
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue(mockProperties),
            };

            MockProperty.find.mockReturnValue(mockQuery as any);
            MockProperty.countDocuments.mockResolvedValue(2);

            const response = await request(app).get("/properties");

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.properties).toEqual(mockProperties);
        });

        it("should handle database errors", async () => {
            MockProperty.find.mockImplementation(() => {
                throw new Error("Database error");
            });

            const response = await request(app).get("/properties");

            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);
        });
    });

    describe("POST /properties", () => {
        const mockHost = {
            _id: "host123",
            role: "host",
            email: "host@example.com",
            name: "John Host",
        };

        const validPropertyData = {
            title: "Beautiful Apartment",
            description: "A lovely apartment in the city center",
            pricePerNight: 100,
            location: {
                address: "123 Main St",
                city: "New York",
                country: "USA",
            },
            images: ["https://example.com/image.jpg"],
            amenities: ["WiFi"],
            bedrooms: 2,
            bathrooms: 1,
            maxGuests: 4,
            propertyType: "apartment",
        };

        it("should create property for authenticated host", async () => {
            // Mock authentication middleware
            const mockSelect = jest.fn().mockResolvedValue(mockHost);
            MockUser.findById = jest.fn().mockReturnValue({ select: mockSelect } as any);
            mockJwtUtils.extractTokenFromHeader.mockReturnValue('valid-token');
            mockJwtUtils.verifyAccessToken.mockReturnValue({ userId: "host123" } as any);

            const savedProperty = {
                _id: "property123",
                ...validPropertyData,
                hostId: "host123",
                isActive: true,
                averageRating: 0,
                reviewCount: 0,
            };

            const mockPropertyInstance = {
                save: jest.fn().mockResolvedValue(savedProperty),
                populate: jest.fn().mockReturnThis(),
            };

            (Property as any).mockImplementation(() => mockPropertyInstance);

            const response = await request(app)
                .post("/properties")
                .set("Authorization", "Bearer valid-token")
                .send(validPropertyData);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
        });

        it("should fail without authentication", async () => {
            mockJwtUtils.extractTokenFromHeader.mockReturnValue(null);

            const response = await request(app).post("/properties").send(validPropertyData);

            expect(response.status).toBe(401);
            expect(response.body).toEqual({
                success: false,
                message: "Access token required",
                code: "TOKEN_MISSING",
            });
        });
    });
});
