import request from "supertest";
import express from "express";
import authRoutes from "../../src/routes/auth";
import User from "../../src/models/User";
import * as jwtUtils from '../../src/utils/jwt';

// Mock dependencies
jest.mock("../../src/models/User");
jest.mock('../../src/utils/jwt');
jest.mock('../../src/utils/email', () => ({
    sendEmailVerification: jest.fn(),
    sendPasswordReset: jest.fn(),
    sendPasswordChanged: jest.fn(),
}));

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

const MockUser = User as jest.Mocked<typeof User>;
const mockJwtUtils = jwtUtils as jest.Mocked<typeof jwtUtils>;

describe("Auth Routes", () => {
    let app: express.Application;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use("/auth", authRoutes);

        process.env.JWT_SECRET = "test-secret";
        process.env.JWT_EXPIRE = "15m";
        process.env.JWT_REFRESH_SECRET = "refresh-secret";
        process.env.JWT_REFRESH_EXPIRE = "30d";
        process.env.NODEMAILER_USER = "test@stayhub.com";
        process.env.NODEMAILER_PASS = "test-pass";

        jest.clearAllMocks();
    });

    afterEach(() => {
        delete process.env.JWT_SECRET;
        delete process.env.JWT_EXPIRE;
        delete process.env.JWT_REFRESH_SECRET;
        delete process.env.JWT_REFRESH_EXPIRE;
        delete process.env.NODEMAILER_USER;
        delete process.env.NODEMAILER_PASS;
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
                authProvider: 'google',
                isVerified: false,
                twoFactorEnabled: false,
                lastLogin: new Date(),
                save: jest.fn().mockResolvedValue({
                    _id: "user123",
                    ...validGoogleAuthData,
                    authProvider: 'google',
                    isVerified: false,
                    twoFactorEnabled: false,
                    lastLogin: expect.any(Date),
                }),
            };

            jest.spyOn(User.prototype, "save").mockResolvedValue(mockUser as any);
            mockJwtUtils.generateTokenPair.mockReturnValue({
                accessToken: "mock-access-token",
                refreshToken: "mock-refresh-token"
            });

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
                        authProvider: 'google',
                    }),
                    accessToken: "mock-access-token",
                    refreshToken: "mock-refresh-token",
                },
            });
        });

        it("should login existing user successfully", async () => {
            const existingUser = {
                _id: "user123",
                ...validGoogleAuthData,
                authProvider: 'google',
                isVerified: true,
                lastLogin: new Date(),
                save: jest.fn().mockResolvedValue({
                    _id: "user123",
                    ...validGoogleAuthData,
                    authProvider: 'google',
                    isVerified: true,
                    lastLogin: expect.any(Date),
                }),
            };

            MockUser.findOne.mockResolvedValue(existingUser as any);
            mockJwtUtils.generateTokenPair.mockReturnValue({
                accessToken: "mock-access-token",
                refreshToken: "mock-refresh-token"
            });

            const response = await request(app).post("/auth/google").send(validGoogleAuthData);

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                success: true,
                message: "Login successful",
                data: {
                    user: expect.objectContaining({
                        id: "user123",
                        email: validGoogleAuthData.email,
                        authProvider: 'google',
                    }),
                    accessToken: "mock-access-token",
                    refreshToken: "mock-refresh-token",
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
                avatar: 'https://example.com/avatar.jpg',
                phone: '+1234567890',
                bio: 'Test bio',
                isVerified: true,
            };

            const mockSelect = jest.fn().mockResolvedValue(mockUser);
            MockUser.findById = jest.fn().mockReturnValue({ select: mockSelect } as any);
            mockJwtUtils.extractTokenFromHeader.mockReturnValue('valid-token');
            mockJwtUtils.verifyAccessToken.mockReturnValue({ userId: "user123" } as any);

            const response = await request(app).get("/auth/me").set("Authorization", "Bearer valid-token");

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                success: true,
                data: {
                    user: expect.objectContaining({
                        id: "user123",
                        email: "test@example.com",
                        name: "John Doe",
                        role: "renter",
                        avatar: 'https://example.com/avatar.jpg',
                        phone: '+1234567890',
                        bio: 'Test bio',
                        isVerified: true,
                    }),
                },
            });
        });

        it("should return 401 for missing token", async () => {
            mockJwtUtils.extractTokenFromHeader.mockReturnValue(null);

            const response = await request(app).get("/auth/me");

            expect(response.status).toBe(401);
            expect(response.body).toEqual({
                success: false,
                message: "Access token required",
                code: "TOKEN_MISSING",
            });
        });

        it("should return 401 for invalid token", async () => {
            mockJwtUtils.extractTokenFromHeader.mockReturnValue('invalid-token');
            mockJwtUtils.verifyAccessToken.mockImplementation(() => {
                throw new Error("Invalid token");
            });

            const response = await request(app).get("/auth/me").set("Authorization", "Bearer invalid-token");

            expect(response.status).toBe(401);
            expect(response.body).toEqual({
                success: false,
                message: "Invalid access token",
                code: "TOKEN_INVALID",
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
                avatar: 'https://example.com/avatar.jpg',
                phone: '+0987654321',
                bio: 'Old bio',
                isVerified: true,
            };

            const updatedUser = { ...mockUser, ...updateData };

            const mockSelect = jest.fn().mockResolvedValue(mockUser);
            MockUser.findById = jest.fn().mockReturnValue({ select: mockSelect } as any);
            MockUser.findByIdAndUpdate.mockResolvedValue(updatedUser as any);
            mockJwtUtils.extractTokenFromHeader.mockReturnValue('valid-token');
            mockJwtUtils.verifyAccessToken.mockReturnValue({ userId: "user123" } as any);

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
                        id: "user123",
                        phone: updateData.phone,
                        bio: updateData.bio,
                    }),
                },
            });
        });

        it("should return 401 for unauthenticated user", async () => {
            mockJwtUtils.extractTokenFromHeader.mockReturnValue(null);

            const response = await request(app).put("/auth/profile").send(updateData);

            expect(response.status).toBe(401);
            expect(response.body).toEqual({
                success: false,
                message: "Access token required",
                code: "TOKEN_MISSING",
            });
        });
    });

    describe("POST /auth/logout", () => {
        it("should logout successfully", async () => {
            const mockUser = {
                _id: "user123",
                email: "test@example.com",
                name: "John Doe",
                role: "renter",
                isVerified: true,
            };

            const mockSelect = jest.fn().mockResolvedValue(mockUser);
            MockUser.findById = jest.fn().mockReturnValue({ select: mockSelect } as any);
            mockJwtUtils.extractTokenFromHeader.mockReturnValue('valid-token');
            mockJwtUtils.verifyAccessToken.mockReturnValue({ userId: "user123" } as any);

            const response = await request(app).post("/auth/logout").set("Authorization", "Bearer valid-token");

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                success: true,
                message: "Logged out successfully",
            });
        });

        it("should return 401 for unauthenticated user", async () => {
            mockJwtUtils.extractTokenFromHeader.mockReturnValue(null);

            const response = await request(app).post("/auth/logout");

            expect(response.status).toBe(401);
            expect(response.body).toEqual({
                success: false,
                message: "Access token required",
                code: "TOKEN_MISSING",
            });
        });
    });

    describe("POST /auth/register", () => {
        const validRegistrationData = {
            email: "newuser@example.com",
            password: "SecurePass123!",
            name: "New User",
            role: "renter",
        };

        it("should register new user successfully", async () => {
            MockUser.findOne.mockResolvedValue(null);

            const mockSavedUser = {
                _id: "user123",
                email: validRegistrationData.email,
                name: validRegistrationData.name,
                role: validRegistrationData.role,
                authProvider: 'local',
                isVerified: false,
            };

            const mockUserInstance = {
                _id: "user123",
                email: validRegistrationData.email,
                name: validRegistrationData.name,
                role: validRegistrationData.role,
                authProvider: 'local',
                isVerified: false,
                generateEmailVerificationToken: jest.fn().mockReturnValue('verification-token'),
                save: jest.fn().mockResolvedValue(mockSavedUser),
            };

            // Mock the User constructor
            (User as any).mockImplementation(() => mockUserInstance);

            const response = await request(app).post("/auth/register").send(validRegistrationData);

            expect(response.status).toBe(201);
            expect(response.body).toEqual({
                success: true,
                message: "User registered successfully. Please check your email to verify your account.",
                data: {
                    user: expect.objectContaining({
                        id: "user123",
                        email: validRegistrationData.email,
                        name: validRegistrationData.name,
                        role: validRegistrationData.role,
                        authProvider: 'local',
                        isVerified: false,
                    }),
                },
            });
        });

        it("should return 400 for existing user", async () => {
            MockUser.findOne.mockResolvedValue({ _id: "existing-user" } as any);

            const response = await request(app).post("/auth/register").send(validRegistrationData);

            expect(response.status).toBe(400);
            expect(response.body).toEqual({
                success: false,
                message: "User with this email already exists",
            });
        });
    });

    describe("POST /auth/login", () => {
        const validLoginData = {
            email: "user@example.com",
            password: "SecurePass123!",
        };

        it("should login user successfully", async () => {
            const mockUser = {
                _id: "user123",
                email: validLoginData.email,
                name: "Test User",
                role: "renter",
                avatar: 'https://example.com/avatar.jpg',
                phone: '+1234567890',
                bio: 'Test bio',
                authProvider: 'local',
                isVerified: true,
                lastLogin: new Date(),
                isLocked: jest.fn().mockReturnValue(false),
                comparePassword: jest.fn().mockResolvedValue(true),
                updateOne: jest.fn().mockResolvedValue({}),
            };

            const mockSelect = jest.fn().mockResolvedValue(mockUser);
            MockUser.findOne = jest.fn().mockReturnValue({ select: mockSelect } as any);
            mockJwtUtils.generateTokenPair.mockReturnValue({
                accessToken: "mock-access-token",
                refreshToken: "mock-refresh-token"
            });

            const response = await request(app).post("/auth/login").send(validLoginData);

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                success: true,
                message: "Login successful",
                data: {
                    user: expect.objectContaining({
                        id: "user123",
                        email: validLoginData.email,
                        name: "Test User",
                        role: "renter",
                        authProvider: 'local',
                        isVerified: true,
                    }),
                    accessToken: "mock-access-token",
                    refreshToken: "mock-refresh-token",
                },
            });
        });

        it("should return 401 for invalid password", async () => {
            const mockUser = {
                _id: "user123",
                email: validLoginData.email,
                isLocked: jest.fn().mockReturnValue(false),
                comparePassword: jest.fn().mockResolvedValue(false),
                incLoginAttempts: jest.fn(),
            };

            const mockSelect = jest.fn().mockResolvedValue(mockUser);
            MockUser.findOne = jest.fn().mockReturnValue({ select: mockSelect } as any);

            const response = await request(app).post("/auth/login").send(validLoginData);

            expect(response.status).toBe(401);
            expect(response.body).toEqual({
                success: false,
                message: "Invalid email or password",
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
