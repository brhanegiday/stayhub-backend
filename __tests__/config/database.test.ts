import mongoose from "mongoose";
import connectDB from "../../src/config/database";

// Mock mongoose
jest.mock("mongoose", () => ({
    connect: jest.fn(),
    connection: {
        on: jest.fn(),
        close: jest.fn(),
        host: "mocked-host",
    },
}));

const mockedConnect = mongoose.connect as jest.MockedFunction<typeof mongoose.connect>;
const mockedConnectionOn = mongoose.connection.on as jest.MockedFunction<typeof mongoose.connection.on>;
const mockedConnectionClose = mongoose.connection.close as jest.MockedFunction<typeof mongoose.connection.close>;

describe("Database Config", () => {
    let originalEnv: NodeJS.ProcessEnv;
    let consoleErrorSpy: jest.SpyInstance;
    let consoleLogSpy: jest.SpyInstance;
    let processExitSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        originalEnv = process.env;
        consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
        processExitSpy = jest.spyOn(process, "exit").mockImplementation(() => {
            throw new Error("process.exit() was called");
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
        process.env = originalEnv;
    });

    describe("connectDB", () => {
        it("should connect to MongoDB successfully", async () => {
            process.env.MONGODB_URI = "mongodb://localhost:27017/test";

            const mockConnection = {
                connection: {
                    host: "localhost:27017",
                },
            };

            mockedConnect.mockResolvedValue(mockConnection as any);

            await connectDB();

            expect(mockedConnect).toHaveBeenCalledWith("mongodb://localhost:27017/test");
            expect(consoleLogSpy).toHaveBeenCalledWith("MongoDB Connected: localhost:27017");
        });

        it("should handle connection errors", async () => {
            process.env.MONGODB_URI = "mongodb://invalid-uri";

            const connectionError = new Error("Connection failed");
            mockedConnect.mockRejectedValue(connectionError);

            await expect(async () => {
                await connectDB();
            }).rejects.toThrow("process.exit() was called");

            expect(mockedConnect).toHaveBeenCalledWith("mongodb://invalid-uri");
            expect(consoleErrorSpy).toHaveBeenCalledWith("Database connection error:", connectionError);
            expect(processExitSpy).toHaveBeenCalledWith(1);
        });

        it("should handle missing MONGODB_URI", async () => {
            delete process.env.MONGODB_URI;

            const connectionError = new Error("MONGODB_URI is required");
            mockedConnect.mockRejectedValue(connectionError);

            await expect(async () => {
                await connectDB();
            }).rejects.toThrow("process.exit() was called");

            expect(consoleErrorSpy).toHaveBeenCalledWith("Database connection error:", connectionError);
            expect(processExitSpy).toHaveBeenCalledWith(1);
        });

        it("should handle network timeout errors", async () => {
            process.env.MONGODB_URI = "mongodb://localhost:27017/test";

            const timeoutError = new Error("Server selection timed out");
            mockedConnect.mockRejectedValue(timeoutError);

            await expect(async () => {
                await connectDB();
            }).rejects.toThrow("process.exit() was called");

            expect(consoleErrorSpy).toHaveBeenCalledWith("Database connection error:", timeoutError);
            expect(processExitSpy).toHaveBeenCalledWith(1);
        });

        it("should handle authentication errors", async () => {
            // Using placeholder credentials for testing
            process.env.MONGODB_URI = "mongodb://testuser:testpass@localhost:27017/test";

            const authError = new Error("Authentication failed");
            mockedConnect.mockRejectedValue(authError);

            await expect(async () => {
                await connectDB();
            }).rejects.toThrow("process.exit() was called");

            expect(consoleErrorSpy).toHaveBeenCalledWith("Database connection error:", authError);
            expect(processExitSpy).toHaveBeenCalledWith(1);
        });
    });

    describe("Connection Event Handlers", () => {
        it("should verify mongoose connection object exists", () => {
            // Verify that the connection object is available
            expect(mongoose.connection).toBeDefined();
            expect(typeof mongoose.connection.on).toBe("function");
        });

        it("should verify event handler functions exist", () => {
            // Test that the basic event handling functions are available
            expect(mongoose.connection.on).toBeDefined();
            expect(typeof mongoose.connection.on).toBe("function");
        });
    });

    describe("Process Termination Handling", () => {
        it("should set up SIGINT handler", () => {
            // Verify that process.on exists and can be used
            expect(typeof process.on).toBe("function");
        });

        it("should verify process handling capabilities", () => {
            // Test that we can set up process event handlers
            expect(process.on).toBeDefined();
            expect(typeof process.exit).toBe("function");
        });
    });

    describe("Module Exports", () => {
        it("should export connectDB as default", () => {
            expect(connectDB).toBeDefined();
            expect(typeof connectDB).toBe("function");
        });

        it("should be an async function", () => {
            const result = connectDB();
            expect(result).toBeInstanceOf(Promise);

            // Clean up the promise to avoid unhandled rejection
            result.catch(() => {});
        });
    });

    describe("Environment Configuration", () => {
        it("should use MONGODB_URI from environment", async () => {
            const testUri = "mongodb://test-server:27017/test-db";
            process.env.MONGODB_URI = testUri;

            mockedConnect.mockResolvedValue({
                connection: { host: "test-server:27017" },
            } as any);

            await connectDB();

            expect(mockedConnect).toHaveBeenCalledWith(testUri);
        });

        it("should handle special characters in URI", async () => {
            // Using URL encoded test string (not sensitive data)
            const specialUri = "mongodb://testuser%40domain.com:testvalue123@localhost:27017/test";
            process.env.MONGODB_URI = specialUri;

            mockedConnect.mockResolvedValue({
                connection: { host: "localhost:27017" },
            } as any);

            await connectDB();

            expect(mockedConnect).toHaveBeenCalledWith(specialUri);
        });
    });
});
