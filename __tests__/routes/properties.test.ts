import request from "supertest";
import express from "express";
import propertiesRoutes from "../../src/routes/properties";
import Property from "../../src/models/Property";
import User from "../../src/models/User";
import jwt from "jsonwebtoken";

// Mock dependencies
jest.mock("../../src/models/Property");
jest.mock("../../src/models/User");
jest.mock("jsonwebtoken");

const MockProperty = Property as jest.Mocked<typeof Property>;
const MockUser = User as jest.Mocked<typeof User>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe("Properties Routes", () => {
    let app: express.Application;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use("/properties", propertiesRoutes);

        process.env.JWT_SECRET = "test-secret";
        jest.clearAllMocks();
    });

    afterEach(() => {
        delete process.env.JWT_SECRET;
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
            MockUser.findById.mockResolvedValue(mockHost as any);
            mockJwt.verify.mockReturnValue({ userId: "host123" } as any);

            const mockPropertyInstance = {
                save: jest.fn().mockResolvedValue({
                    _id: "property123",
                    title: "Test Property",
                    hostId: "host123",
                }),
                populate: jest.fn().mockReturnThis(),
            };

            jest.spyOn(Property.prototype, "save").mockResolvedValue(mockPropertyInstance as any);

            const response = await request(app)
                .post("/properties")
                .set("Authorization", "Bearer valid-token")
                .send(validPropertyData);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
        });

        it("should fail without authentication", async () => {
            const response = await request(app).post("/properties").send(validPropertyData);

            expect(response.status).toBe(401);
        });
    });
});
