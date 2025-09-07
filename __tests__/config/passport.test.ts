import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { ExtractJwt, Strategy as JwtStrategy } from "passport-jwt";

// Mock the User model
const mockUserDocument = {
    _id: "test-id",
    googleId: "test-google-id",
    email: "test@example.com",
    name: "Test User",
    save: jest.fn().mockResolvedValue(true),
};

const mockUser = {
    findOne: jest.fn(),
    findById: jest.fn(),
};

jest.mock("../../src/models/User", () => {
    const mockConstructor = jest.fn().mockImplementation((data) => ({
        ...data,
        save: jest.fn().mockResolvedValue(true),
    }));
    Object.assign(mockConstructor, mockUser);
    return mockConstructor;
});

// Mock passport strategies
const mockGoogleStrategy = jest.fn();
const mockJwtStrategy = jest.fn();

jest.mock("passport-google-oauth20", () => ({
    Strategy: mockGoogleStrategy,
}));

jest.mock("passport-jwt", () => ({
    Strategy: mockJwtStrategy,
    ExtractJwt: {
        fromAuthHeaderAsBearerToken: jest.fn().mockReturnValue("mocked-jwt-extractor"),
    },
}));

// Mock passport itself
const mockPassport = {
    use: jest.fn(),
    serializeUser: jest.fn(),
    deserializeUser: jest.fn(),
};

jest.mock("passport", () => mockPassport);

describe("Passport Config", () => {
    let consoleErrorSpy: jest.SpyInstance;
    let googleCallback: any;
    let jwtCallback: any;

    beforeAll(() => {
        // Set up environment variables
        process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
        process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret";
        process.env.JWT_SECRET = "test-jwt-secret";
    });

    beforeEach(() => {
        jest.clearAllMocks();
        consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        // Clear mock implementations
        mockUser.findOne.mockClear();
        mockUser.findById.mockClear();

        // Reset modules to ensure fresh import
        jest.resetModules();

        // Import the passport config to trigger initialization
        require("../../src/config/passport");

        // Extract callbacks from mock calls
        if (mockGoogleStrategy.mock.calls.length > 0) {
            googleCallback = mockGoogleStrategy.mock.calls[0][1];
        }
        if (mockJwtStrategy.mock.calls.length > 0) {
            jwtCallback = mockJwtStrategy.mock.calls[0][1];
        }
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("Google OAuth Strategy", () => {
        it("should configure Google strategy with correct options", () => {
            expect(mockGoogleStrategy).toHaveBeenCalledWith(
                {
                    clientID: "test-google-client-id",
                    clientSecret: "test-google-client-secret",
                    callbackURL: "/api/auth/google/callback",
                },
                expect.any(Function)
            );
        });

        it("should register Google strategy with passport", () => {
            expect(mockPassport.use).toHaveBeenCalledWith(expect.any(Object));
        });

        it("should return existing user if found", async () => {
            if (!googleCallback) return;

            const existingUser = { _id: "existing-id", googleId: "google-123" };
            const profile = {
                id: "google-123",
                emails: [{ value: "existing@example.com" }],
                displayName: "Existing User",
                photos: [{ value: "https://example.com/avatar.jpg" }],
            };

            const done = jest.fn();
            mockUser.findOne.mockResolvedValue(existingUser);

            await googleCallback("access-token", "refresh-token", profile, done);

            expect(mockUser.findOne).toHaveBeenCalledWith({ googleId: "google-123" });
            expect(done).toHaveBeenCalledWith(null, existingUser);
        });

        it("should create new user if not found", async () => {
            if (!googleCallback) return;

            const profile = {
                id: "google-456",
                emails: [{ value: "new@example.com" }],
                displayName: "New User",
                photos: [{ value: "https://example.com/avatar.jpg" }],
            };

            const done = jest.fn();
            mockUser.findOne.mockResolvedValue(null);

            const MockedUserConstructor = require("../../src/models/User");
            const mockSave = jest.fn().mockResolvedValue(true);
            MockedUserConstructor.mockImplementation((data: any) => ({
                ...data,
                save: mockSave,
            }));

            await googleCallback("access-token", "refresh-token", profile, done);

            expect(mockUser.findOne).toHaveBeenCalledWith({ googleId: "google-456" });
            expect(MockedUserConstructor).toHaveBeenCalledWith({
                googleId: "google-456",
                email: "new@example.com",
                name: "New User",
                avatar: "https://example.com/avatar.jpg",
                role: "renter",
            });
            expect(mockSave).toHaveBeenCalled();
        });

        it("should handle missing email in profile", async () => {
            if (!googleCallback) return;

            const profile = {
                id: "google-789",
                emails: undefined,
                displayName: "User Without Email",
                photos: [{ value: "https://example.com/avatar.jpg" }],
            };

            const done = jest.fn();
            mockUser.findOne.mockResolvedValue(null);

            const MockedUserConstructor = require("../../src/models/User");
            const mockSave = jest.fn().mockResolvedValue(true);
            MockedUserConstructor.mockImplementation((data: any) => ({
                ...data,
                save: mockSave,
            }));

            await googleCallback("access-token", "refresh-token", profile, done);

            expect(MockedUserConstructor).toHaveBeenCalledWith({
                googleId: "google-789",
                email: undefined,
                name: "User Without Email",
                avatar: "https://example.com/avatar.jpg",
                role: "renter",
            });
        });

        it("should handle missing photos in profile", async () => {
            if (!googleCallback) return;

            const profile = {
                id: "google-101",
                emails: [{ value: "nophoto@example.com" }],
                displayName: "User Without Photo",
                photos: undefined,
            };

            const done = jest.fn();
            mockUser.findOne.mockResolvedValue(null);

            const MockedUserConstructor = require("../../src/models/User");
            const mockSave = jest.fn().mockResolvedValue(true);
            MockedUserConstructor.mockImplementation((data: any) => ({
                ...data,
                save: mockSave,
            }));

            await googleCallback("access-token", "refresh-token", profile, done);

            expect(MockedUserConstructor).toHaveBeenCalledWith({
                googleId: "google-101",
                email: "nophoto@example.com",
                name: "User Without Photo",
                avatar: "",
                role: "renter",
            });
        });

        it("should handle database errors during user lookup", async () => {
            if (!googleCallback) return;

            const profile = {
                id: "google-error",
                emails: [{ value: "error@example.com" }],
                displayName: "Error User",
            };

            const error = new Error("Database connection failed");
            const done = jest.fn();
            mockUser.findOne.mockRejectedValue(error);

            await googleCallback("access-token", "refresh-token", profile, done);

            expect(consoleErrorSpy).toHaveBeenCalledWith("Google OAuth error:", error);
            expect(done).toHaveBeenCalledWith(error, undefined);
        });

        it("should handle database errors during user creation", async () => {
            if (!googleCallback) return;

            const profile = {
                id: "google-save-error",
                emails: [{ value: "saveerror@example.com" }],
                displayName: "Save Error User",
            };

            const saveError = new Error("Failed to save user");
            const done = jest.fn();
            mockUser.findOne.mockResolvedValue(null);

            const MockedUserConstructor = require("../../src/models/User");
            const mockSave = jest.fn().mockRejectedValue(saveError);
            MockedUserConstructor.mockImplementation((data: any) => ({
                ...data,
                save: mockSave,
            }));

            await googleCallback("access-token", "refresh-token", profile, done);

            expect(consoleErrorSpy).toHaveBeenCalledWith("Google OAuth error:", saveError);
            expect(done).toHaveBeenCalledWith(saveError, undefined);
        });
    });

    describe("JWT Strategy", () => {
        it("should configure JWT strategy with correct options", () => {
            expect(mockJwtStrategy).toHaveBeenCalledWith(
                {
                    jwtFromRequest: "mocked-jwt-extractor",
                    secretOrKey: "test-jwt-secret",
                },
                expect.any(Function)
            );
        });

        it("should register JWT strategy with passport", () => {
            expect(mockPassport.use).toHaveBeenCalledWith(expect.any(Object));
        });

        it("should return user if found by ID", async () => {
            if (!jwtCallback) return;

            const user = {
                _id: "user-123",
                email: "jwt@example.com",
                name: "JWT User",
            };

            const payload = { userId: "user-123" };
            const done = jest.fn();
            mockUser.findById.mockResolvedValue(user);

            await jwtCallback(payload, done);

            expect(mockUser.findById).toHaveBeenCalledWith("user-123");
            expect(done).toHaveBeenCalledWith(null, user);
        });

        it("should return false if user not found", async () => {
            if (!jwtCallback) return;

            const payload = { userId: "nonexistent-user" };
            const done = jest.fn();
            mockUser.findById.mockResolvedValue(null);

            await jwtCallback(payload, done);

            expect(mockUser.findById).toHaveBeenCalledWith("nonexistent-user");
            expect(done).toHaveBeenCalledWith(null, false);
        });

        it("should handle database errors during user lookup", async () => {
            if (!jwtCallback) return;

            const payload = { userId: "error-user" };
            const error = new Error("Database lookup failed");
            const done = jest.fn();
            mockUser.findById.mockRejectedValue(error);

            await jwtCallback(payload, done);

            expect(consoleErrorSpy).toHaveBeenCalledWith("JWT Strategy error:", error);
            expect(done).toHaveBeenCalledWith(error, false);
        });
    });

    describe("Serialize/Deserialize User", () => {
        it("should configure serialize user function", () => {
            expect(mockPassport.serializeUser).toHaveBeenCalledWith(expect.any(Function));
        });

        it("should configure deserialize user function", () => {
            expect(mockPassport.deserializeUser).toHaveBeenCalledWith(expect.any(Function));
        });

        it("should serialize user by ID", () => {
            const serializeCallback = mockPassport.serializeUser.mock.calls[0][0];
            const user = { _id: "user-serialize-123" };
            const done = jest.fn();

            serializeCallback(user, done);

            expect(done).toHaveBeenCalledWith(null, "user-serialize-123");
        });

        it("should handle user without ID during serialization", () => {
            const serializeCallback = mockPassport.serializeUser.mock.calls[0][0];
            const user = {};
            const done = jest.fn();

            serializeCallback(user, done);

            expect(done).toHaveBeenCalledWith(null, undefined);
        });

        it("should deserialize user successfully", async () => {
            const deserializeCallback = mockPassport.deserializeUser.mock.calls[0][0];
            const user = {
                _id: "user-deserialize-123",
                email: "deserialize@example.com",
                name: "Deserialize User",
            };
            const done = jest.fn();
            mockUser.findById.mockResolvedValue(user);

            await deserializeCallback("user-deserialize-123", done);

            expect(mockUser.findById).toHaveBeenCalledWith("user-deserialize-123");
            expect(done).toHaveBeenCalledWith(null, user);
        });

        it("should handle user not found during deserialization", async () => {
            const deserializeCallback = mockPassport.deserializeUser.mock.calls[0][0];
            const done = jest.fn();
            mockUser.findById.mockResolvedValue(null);

            await deserializeCallback("nonexistent-user", done);

            expect(mockUser.findById).toHaveBeenCalledWith("nonexistent-user");
            expect(done).toHaveBeenCalledWith(null, null);
        });

        it("should handle database errors during deserialization", async () => {
            const deserializeCallback = mockPassport.deserializeUser.mock.calls[0][0];
            const error = new Error("Deserialization database error");
            const done = jest.fn();
            mockUser.findById.mockRejectedValue(error);

            await deserializeCallback("error-user", done);

            expect(consoleErrorSpy).toHaveBeenCalledWith("Deserialize user error:", error);
            expect(done).toHaveBeenCalledWith(error, null);
        });
    });

    describe("Module Configuration", () => {
        it("should export passport instance", () => {
            const passportModule = require("../../src/config/passport");
            expect(passportModule.default).toBe(mockPassport);
        });

        it("should configure all required strategies and serialization", () => {
            // Should have called passport.use twice (Google + JWT)
            expect(mockPassport.use).toHaveBeenCalledTimes(2);
            expect(mockPassport.serializeUser).toHaveBeenCalledTimes(1);
            expect(mockPassport.deserializeUser).toHaveBeenCalledTimes(1);
        });
    });
});
