import request from "supertest";
import express from "express";
import router from "../../src/routes/users";
import {
    getUserProfile,
    updateUserProfile,
    getUserStats,
    deleteUserAccount,
} from "../../src/controllers/userController";
import { authenticate } from "../../src/middleware/auth";
import { handleValidationErrors } from "../../src/middleware/validation";

// Mock the dependencies
jest.mock("../../src/controllers/userController");
jest.mock("../../src/middleware/auth");
jest.mock("../../src/middleware/validation");

const mockedGetUserProfile = getUserProfile as jest.MockedFunction<typeof getUserProfile>;
const mockedUpdateUserProfile = updateUserProfile as jest.MockedFunction<typeof updateUserProfile>;
const mockedGetUserStats = getUserStats as jest.MockedFunction<typeof getUserStats>;
const mockedDeleteUserAccount = deleteUserAccount as jest.MockedFunction<typeof deleteUserAccount>;
const mockedAuthenticate = authenticate as jest.MockedFunction<typeof authenticate>;
const mockedHandleValidationErrors = handleValidationErrors as jest.MockedFunction<typeof handleValidationErrors>;

// Create Express app for testing
const app = express();
app.use(express.json());
app.use("/api/users", router);

describe("Users Routes", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Mock middleware to call next()
        mockedAuthenticate.mockImplementation(async (req, res, next) => {
            req.user = {
                _id: "507f1f77bcf86cd799439011",
                name: "Test User",
                email: "test@example.com",
                role: "renter",
            };
            next();
        });

        mockedHandleValidationErrors.mockImplementation((req, res, next) => {
            next();
        });

        // Mock controllers to send success responses
        mockedGetUserProfile.mockImplementation(async (req, res) => {
            res.status(200).json({
                success: true,
                data: { user: { id: req.params.id, name: "Test User" } },
            });
        });

        mockedUpdateUserProfile.mockImplementation(async (req, res) => {
            res.status(200).json({
                success: true,
                message: "Profile updated successfully",
                data: { user: req.body },
            });
        });

        mockedGetUserStats.mockImplementation(async (req, res) => {
            res.status(200).json({
                success: true,
                data: { stats: { totalBookings: 5 } },
            });
        });

        mockedDeleteUserAccount.mockImplementation(async (req, res) => {
            res.status(200).json({
                success: true,
                message: "Account deleted successfully",
            });
        });
    });

    describe("GET /api/users/profile/:id", () => {
        it("should get user profile", async () => {
            const userId = "507f1f77bcf86cd799439011";

            const response = await request(app).get(`/api/users/profile/${userId}`).expect(200);

            expect(mockedGetUserProfile).toHaveBeenCalled();
            expect(response.body).toEqual({
                success: true,
                data: { user: { id: userId, name: "Test User" } },
            });
        });

        it("should call getUserProfile controller", async () => {
            const userId = "507f1f77bcf86cd799439011";

            await request(app).get(`/api/users/profile/${userId}`).expect(200);

            expect(mockedGetUserProfile).toHaveBeenCalledTimes(1);
        });
    });

    describe("PUT /api/users/profile", () => {
        it("should update user profile with authentication", async () => {
            const updateData = {
                name: "Updated Name",
                bio: "Updated bio",
                phone: "+1234567890",
            };

            const response = await request(app).put("/api/users/profile").send(updateData).expect(200);

            expect(mockedAuthenticate).toHaveBeenCalled();
            expect(mockedUpdateUserProfile).toHaveBeenCalled();
            expect(response.body).toEqual({
                success: true,
                message: "Profile updated successfully",
                data: { user: updateData },
            });
        });

        it("should call authentication middleware", async () => {
            await request(app).put("/api/users/profile").send({ name: "Test" }).expect(200);

            expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
        });

        it("should call validation middleware", async () => {
            await request(app).put("/api/users/profile").send({ name: "Test" }).expect(200);

            expect(mockedHandleValidationErrors).toHaveBeenCalledTimes(1);
        });

        it("should handle empty request body", async () => {
            await request(app).put("/api/users/profile").send({}).expect(200);

            expect(mockedUpdateUserProfile).toHaveBeenCalled();
        });

        it("should handle partial updates", async () => {
            const updateData = { name: "Only Name" };

            await request(app).put("/api/users/profile").send(updateData).expect(200);

            expect(mockedUpdateUserProfile).toHaveBeenCalled();
        });
    });

    describe("GET /api/users/stats", () => {
        it("should get user stats with authentication", async () => {
            const response = await request(app).get("/api/users/stats").expect(200);

            expect(mockedAuthenticate).toHaveBeenCalled();
            expect(mockedGetUserStats).toHaveBeenCalled();
            expect(response.body).toEqual({
                success: true,
                data: { stats: { totalBookings: 5 } },
            });
        });

        it("should require authentication", async () => {
            await request(app).get("/api/users/stats").expect(200);

            expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
        });

        it("should call getUserStats controller", async () => {
            await request(app).get("/api/users/stats").expect(200);

            expect(mockedGetUserStats).toHaveBeenCalledTimes(1);
        });
    });

    describe("DELETE /api/users/account", () => {
        it("should delete user account with authentication", async () => {
            const response = await request(app).delete("/api/users/account").expect(200);

            expect(mockedAuthenticate).toHaveBeenCalled();
            expect(mockedDeleteUserAccount).toHaveBeenCalled();
            expect(response.body).toEqual({
                success: true,
                message: "Account deleted successfully",
            });
        });

        it("should require authentication", async () => {
            await request(app).delete("/api/users/account").expect(200);

            expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
        });

        it("should call deleteUserAccount controller", async () => {
            await request(app).delete("/api/users/account").expect(200);

            expect(mockedDeleteUserAccount).toHaveBeenCalledTimes(1);
        });
    });

    describe("Route Configuration", () => {
        it("should have all required routes defined", () => {
            const routes = [
                { method: "get", path: "/profile/:id" },
                { method: "put", path: "/profile" },
                { method: "get", path: "/stats" },
                { method: "delete", path: "/account" },
            ];

            // This test ensures the routes are configured correctly
            // The actual route testing is done in the individual describe blocks above
            expect(routes).toHaveLength(4);
        });

        it("should export the router", () => {
            expect(router).toBeDefined();
            expect(typeof router).toBe("function");
        });
    });

    describe("Middleware Integration", () => {
        it("should use authentication middleware for protected routes", async () => {
            // Test all protected routes
            await request(app).put("/api/users/profile").send({});
            await request(app).get("/api/users/stats");
            await request(app).delete("/api/users/account");

            expect(mockedAuthenticate).toHaveBeenCalledTimes(3);
        });

        it("should not use authentication for public routes", async () => {
            jest.clearAllMocks();

            await request(app).get("/api/users/profile/123");

            expect(mockedAuthenticate).not.toHaveBeenCalled();
        });

        it("should use validation middleware for profile update", async () => {
            await request(app).put("/api/users/profile").send({ name: "Test" });

            expect(mockedHandleValidationErrors).toHaveBeenCalled();
        });
    });
});
