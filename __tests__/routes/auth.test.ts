import request from "supertest";
import express from "express";
import authRoutes from "../../src/routes/auth";
import User from "../../src/models/User";
import jwt from "jsonwebtoken";

// Mock dependencies
jest.mock("../../src/models/User");
jest.mock("jsonwebtoken");

const MockUser = User as jest.Mocked<typeof User>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe("Auth Routes", () => {
    let app: express.Application;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use("/auth", authRoutes);

        process.env.JWT_SECRET = "test-secret";
        process.env.JWT_EXPIRE = "7d";

        jest.clearAllMocks();
    });

    afterEach(() => {
        delete process.env.JWT_SECRET;
        delete process.env.JWT_EXPIRE;
    });

    describe("POST /auth/google", () => {
        const validGoogleAuthData = {
            googleId: "google123",
            email: "test@example.com",
            name: "John Doe",
            avatar: "https://example.com/avatar.jpg",
            role: "renter",
        };

        it("should register new user successfully", async () => {
            MockUser.findOne.mockResolvedValue(null);

            const mockUser = {
                _id: "user123",
                ...validGoogleAuthData,
                isVerified: false,
                save: jest.fn().mockResolvedValue({
                    _id: "user123",
                    ...validGoogleAuthData,
                    isVerified: false,
                }),
            };

            jest.spyOn(User.prototype, "save").mockResolvedValue(mockUser as any);
            mockJwt.sign.mockReturnValue("mock-jwt-token" as any);

            const response = await request(app).post("/auth/google").send(validGoogleAuthData);

            expect(response.status).toBe(201);
            expect(response.body).toEqual({
                success: true,
                message: "User registered successfully",
                data: {
                    user: expect.objectContaining({
                        id: "user123",
                        email: validGoogleAuthData.email,
                        name: validGoogleAuthData.name,
                        role: validGoogleAuthData.role,
                    }),
                    token: "mock-jwt-token",
                },
            });
        });

        it("should login existing user successfully", async () => {
            const existingUser = {
                _id: "user123",
                ...validGoogleAuthData,
                isVerified: true,
            };

            MockUser.findOne.mockResolvedValue(existingUser as any);
            mockJwt.sign.mockReturnValue("mock-jwt-token" as any);

            const response = await request(app).post("/auth/google").send(validGoogleAuthData);

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                success: true,
                message: "Login successful",
                data: {
                    user: expect.objectContaining({
                        id: "user123",
                        email: validGoogleAuthData.email,
                    }),
                    token: "mock-jwt-token",
                },
            });
        });

        it("should return 400 for missing required fields", async () => {
            const response = await request(app).post("/auth/google").send({ email: "test@example.com" }); // Missing other required fields

            expect(response.status).toBe(400);
            expect(response.body).toEqual({
                success: false,
                message: "Validation failed",
                errors: expect.any(Array),
            });
        });

        it("should return 400 for invalid email", async () => {
            const response = await request(app)
                .post("/auth/google")
                .send({
                    ...validGoogleAuthData,
                    email: "invalid-email",
                });

            expect(response.status).toBe(400);
            expect(response.body).toEqual({
                success: false,
                message: "Validation failed",
                errors: expect.any(Array),
            });
        });

        it("should return 400 for invalid role", async () => {
            const response = await request(app)
                .post("/auth/google")
                .send({
                    ...validGoogleAuthData,
                    role: "invalid-role",
                });

            expect(response.status).toBe(400);
            expect(response.body).toEqual({
                success: false,
                message: "Validation failed",
                errors: expect.any(Array),
            });
        });

        it("should return 400 for short name", async () => {
            const response = await request(app)
                .post("/auth/google")
                .send({
                    ...validGoogleAuthData,
                    name: "A", // Too short
                });

            expect(response.status).toBe(400);
            expect(response.body).toEqual({
                success: false,
                message: "Validation failed",
                errors: expect.any(Array),
            });
        });

        it("should return 400 for invalid avatar URL", async () => {
            const response = await request(app)
                .post("/auth/google")
                .send({
                    ...validGoogleAuthData,
                    avatar: "not-a-valid-url",
                });

            expect(response.status).toBe(400);
            expect(response.body).toEqual({
                success: false,
                message: "Validation failed",
                errors: expect.any(Array),
            });
        });

        it("should handle database errors", async () => {
            MockUser.findOne.mockRejectedValue(new Error("Database error"));

            const response = await request(app).post("/auth/google").send(validGoogleAuthData);

            expect(response.status).toBe(500);
            expect(response.body).toEqual({
                success: false,
                message: "Authentication failed",
                error: "Database error",
            });
        });
    });

    describe("GET /auth/me", () => {
        it("should return user data for authenticated user", async () => {
            const mockUser = {
                _id: "user123",
                email: "test@example.com",
                name: "John Doe",
                role: "renter",
            };

            MockUser.findById.mockResolvedValue(mockUser as any);
            mockJwt.verify.mockReturnValue({ userId: "user123" } as any);

            const response = await request(app).get("/auth/me").set("Authorization", "Bearer valid-token");

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                success: true,
                data: {
                    user: expect.objectContaining({
                        id: "user123",
                        email: "test@example.com",
                    }),
                },
            });
        });

        it("should return 401 for missing token", async () => {
            const response = await request(app).get("/auth/me");

            expect(response.status).toBe(401);
            expect(response.body).toEqual({
                success: false,
                message: "Access token required",
            });
        });

        it("should return 401 for invalid token", async () => {
            mockJwt.verify.mockImplementation(() => {
                throw new Error("Invalid token");
            });

            const response = await request(app).get("/auth/me").set("Authorization", "Bearer invalid-token");

            expect(response.status).toBe(401);
            expect(response.body).toEqual({
                success: false,
                message: "Invalid access token",
            });
        });
    });

    describe("PUT /auth/profile", () => {
        const updateData = {
            phone: "+1234567890",
            bio: "Updated bio",
        };

        it("should update user profile successfully", async () => {
            const mockUser = {
                _id: "user123",
                email: "test@example.com",
                name: "John Doe",
                role: "renter",
            };

            const updatedUser = { ...mockUser, ...updateData };

            MockUser.findById.mockResolvedValue(mockUser as any);
            MockUser.findByIdAndUpdate.mockResolvedValue(updatedUser as any);
            mockJwt.verify.mockReturnValue({ userId: "user123" } as any);

            const response = await request(app)
                .put("/auth/profile")
                .set("Authorization", "Bearer valid-token")
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                success: true,
                message: "Profile updated successfully",
                data: {
                    user: expect.objectContaining({
                        phone: updateData.phone,
                        bio: updateData.bio,
                    }),
                },
            });
        });

        it("should return 401 for unauthenticated user", async () => {
            const response = await request(app).put("/auth/profile").send(updateData);

            expect(response.status).toBe(401);
        });
    });

    describe("POST /auth/logout", () => {
        it("should logout successfully", async () => {
            const mockUser = {
                _id: "user123",
                email: "test@example.com",
                name: "John Doe",
                role: "renter",
            };

            MockUser.findById.mockResolvedValue(mockUser as any);
            mockJwt.verify.mockReturnValue({ userId: "user123" } as any);

            const response = await request(app).post("/auth/logout").set("Authorization", "Bearer valid-token");

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                success: true,
                message: "Logged out successfully",
            });
        });
    });

    describe("Route not found", () => {
        it("should return 404 for non-existent routes", async () => {
            const response = await request(app).get("/auth/nonexistent");

            expect(response.status).toBe(404);
        });
    });
});
