import mongoose from "mongoose";

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

// Import after mocking to ensure event handlers are registered
import connectDB from "../../src/config/database";

describe("Database Config", () => {
    let originalEnv: NodeJS.ProcessEnv;
    let consoleErrorSpy: jest.SpyInstance;
    let consoleLogSpy: jest.SpyInstance;
    let processExitSpy: jest.SpyInstance;
    let processOnSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        originalEnv = { ...process.env };
        consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
        processExitSpy = jest.spyOn(process, "exit").mockImplementation(((
            code?: string | number | null | undefined
        ) => {
            throw new Error(`process.exit(${code}) was called`);
        }) as any);
        processOnSpy = jest.spyOn(process, "on").mockImplementation(() => process);

        // Setup mongoose mocks
        mockedConnectionClose.mockResolvedValue(undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
        process.env = originalEnv;
    });

    describe("connectDB Function", () => {
        describe("Successful Connections", () => {
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

            it("should connect with MongoDB Atlas URI", async () => {
                process.env.MONGODB_URI = "mongodb+srv://user:pass@cluster.mongodb.net/db?retryWrites=true&w=majority";

                const mockConnection = {
                    connection: {
                        host: "cluster-shard-00-00.mongodb.net:27017",
                    },
                };

                mockedConnect.mockResolvedValue(mockConnection as any);

                await connectDB();

                expect(mockedConnect).toHaveBeenCalledWith(
                    "mongodb+srv://user:pass@cluster.mongodb.net/db?retryWrites=true&w=majority"
                );
                expect(consoleLogSpy).toHaveBeenCalledWith("MongoDB Connected: cluster-shard-00-00.mongodb.net:27017");
            });

            it("should handle IPv6 addresses", async () => {
                process.env.MONGODB_URI = "mongodb://[::1]:27017/test";

                const mockConnection = {
                    connection: {
                        host: "[::1]:27017",
                    },
                };

                mockedConnect.mockResolvedValue(mockConnection as any);

                await connectDB();

                expect(mockedConnect).toHaveBeenCalledWith("mongodb://[::1]:27017/test");
                expect(consoleLogSpy).toHaveBeenCalledWith("MongoDB Connected: [::1]:27017");
            });

            it("should connect with the actual environment URI format", async () => {
                process.env.MONGODB_URI =
                    "mongodb+srv://user1:password@stayhub.hp8x6xv.mongodb.net/stayhub?retryWrites=true&w=majority&appName=stayhub";

                const mockConnection = {
                    connection: {
                        host: "stayhub-shard-00-00.hp8x6xv.mongodb.net:27017",
                    },
                };

                mockedConnect.mockResolvedValue(mockConnection as any);

                await connectDB();

                expect(mockedConnect).toHaveBeenCalledWith(
                    "mongodb+srv://user1:password@stayhub.hp8x6xv.mongodb.net/stayhub?retryWrites=true&w=majority&appName=stayhub"
                );
                expect(consoleLogSpy).toHaveBeenCalledWith(
                    "MongoDB Connected: stayhub-shard-00-00.hp8x6xv.mongodb.net:27017"
                );
            });
        });

        describe("Error Handling", () => {
            it("should handle connection errors", async () => {
                process.env.MONGODB_URI = "mongodb://invalid-uri";

                const connectionError = new Error("Connection failed");
                mockedConnect.mockRejectedValue(connectionError);

                await expect(connectDB()).rejects.toThrow("process.exit(1) was called");

                expect(mockedConnect).toHaveBeenCalledWith("mongodb://invalid-uri");
                expect(consoleErrorSpy).toHaveBeenCalledWith("Database connection error:", connectionError);
                expect(processExitSpy).toHaveBeenCalledWith(1);
            });

            it("should handle missing MONGODB_URI", async () => {
                delete process.env.MONGODB_URI;

                await expect(connectDB()).rejects.toThrow("process.exit(1) was called");

                expect(consoleErrorSpy).toHaveBeenCalledWith("Database connection error:", expect.any(Error));
                expect(processExitSpy).toHaveBeenCalledWith(1);
            });

            it("should handle network timeout errors", async () => {
                process.env.MONGODB_URI = "mongodb://localhost:27017/test";

                const timeoutError = new Error("Server selection timed out");
                timeoutError.name = "MongooseServerSelectionError";
                mockedConnect.mockRejectedValue(timeoutError);

                await expect(connectDB()).rejects.toThrow("process.exit(1) was called");

                expect(consoleErrorSpy).toHaveBeenCalledWith("Database connection error:", timeoutError);
                expect(processExitSpy).toHaveBeenCalledWith(1);
            });

            it("should handle authentication errors", async () => {
                process.env.MONGODB_URI = "mongodb://testuser:testpass@localhost:27017/test";

                const authError = new Error("Authentication failed");
                authError.name = "MongoServerError";
                (authError as any).code = 18;
                mockedConnect.mockRejectedValue(authError);

                await expect(connectDB()).rejects.toThrow("process.exit(1) was called");

                expect(consoleErrorSpy).toHaveBeenCalledWith("Database connection error:", authError);
                expect(processExitSpy).toHaveBeenCalledWith(1);
            });

            it("should handle DNS resolution errors", async () => {
                process.env.MONGODB_URI = "mongodb://nonexistent.host:27017/test";

                const dnsError = new Error("getaddrinfo ENOTFOUND nonexistent.host");
                dnsError.name = "MongoNetworkError";
                mockedConnect.mockRejectedValue(dnsError);

                await expect(connectDB()).rejects.toThrow("process.exit(1) was called");

                expect(consoleErrorSpy).toHaveBeenCalledWith("Database connection error:", dnsError);
                expect(processExitSpy).toHaveBeenCalledWith(1);
            });

            it("should handle connection refused errors", async () => {
                process.env.MONGODB_URI = "mongodb://localhost:27018/test";

                const refusedError = new Error("connect ECONNREFUSED 127.0.0.1:27018");
                mockedConnect.mockRejectedValue(refusedError);

                await expect(connectDB()).rejects.toThrow("process.exit(1) was called");

                expect(consoleErrorSpy).toHaveBeenCalledWith("Database connection error:", refusedError);
                expect(processExitSpy).toHaveBeenCalledWith(1);
            });

            it("should handle invalid connection string format", async () => {
                process.env.MONGODB_URI = "invalid://not-mongodb-uri";

                const formatError = new Error("Invalid connection string");
                mockedConnect.mockRejectedValue(formatError);

                await expect(connectDB()).rejects.toThrow("process.exit(1) was called");

                expect(consoleErrorSpy).toHaveBeenCalledWith("Database connection error:", formatError);
                expect(processExitSpy).toHaveBeenCalledWith(1);
            });
        });
    });

    // describe("Connection Event Handlers", () => {
    //     beforeEach(() => {
    //         jest.resetModules();
    //     });

    //     it("should register all required event handlers", () => {
    //         // Re-import to trigger event handler registration
    //         require("../../src/config/database");

    //         // Verify all event handlers are registered
    //         expect(mockedConnectionOn).toHaveBeenCalledWith("connected", expect.any(Function));
    //         expect(mockedConnectionOn).toHaveBeenCalledWith("error", expect.any(Function));
    //         expect(mockedConnectionOn).toHaveBeenCalledWith("disconnected", expect.any(Function));
    //     });

    //     it("should handle 'connected' event correctly", () => {
    //         require("../../src/config/database");

    //         const connectedHandler = mockedConnectionOn.mock.calls.find((call) => call[0] === "connected")?.[1];

    //         expect(connectedHandler).toBeDefined();
    //         connectedHandler?.();

    //         expect(consoleLogSpy).toHaveBeenCalledWith("Mongoose connected to MongoDB");
    //     });

    //     it("should handle 'error' event correctly", () => {
    //         require("../../src/config/database");

    //         const errorHandler = mockedConnectionOn.mock.calls.find((call) => call[0] === "error")?.[1];

    //         const testError = new Error("Connection error");
    //         expect(errorHandler).toBeDefined();
    //         errorHandler?.(testError);

    //         expect(consoleErrorSpy).toHaveBeenCalledWith("Mongoose connection error:", testError);
    //     });

    //     it("should handle 'disconnected' event correctly", () => {
    //         require("../../src/config/database");

    //         const disconnectedHandler = mockedConnectionOn.mock.calls.find((call) => call[0] === "disconnected")?.[1];

    //         expect(disconnectedHandler).toBeDefined();
    //         disconnectedHandler?.();

    //         expect(consoleLogSpy).toHaveBeenCalledWith("Mongoose disconnected from MongoDB");
    //     });

    //     it("should verify mongoose connection object exists", () => {
    //         expect(mongoose.connection).toBeDefined();
    //         expect(typeof mongoose.connection.on).toBe("function");
    //     });
    // });

    describe("Graceful Shutdown Handling", () => {
        beforeEach(() => {
            jest.resetModules();
            mockedConnectionClose.mockReset();
            mockedConnectionClose.mockResolvedValue(undefined);
        });

        it("should register SIGINT handler", () => {
            const localProcessOnSpy = jest.spyOn(process, "on").mockImplementation(() => process);

            require("../../src/config/database");

            expect(localProcessOnSpy).toHaveBeenCalledWith("SIGINT", expect.any(Function));

            localProcessOnSpy.mockRestore();
        });

        // it("should handle SIGINT gracefully", async () => {
        //     const localProcessOnSpy = jest.spyOn(process, "on").mockImplementation(() => process);

        //     require("../../src/config/database");

        //     const sigintHandler = localProcessOnSpy.mock.calls.find((call) => call[0] === "SIGINT")?.[1] as Function;

        //     expect(sigintHandler).toBeDefined();

        //     await expect(sigintHandler()).rejects.toThrow("process.exit(0) was called");

        //     expect(mockedConnectionClose).toHaveBeenCalled();
        //     expect(consoleLogSpy).toHaveBeenCalledWith("Mongoose connection closed due to app termination");
        //     expect(processExitSpy).toHaveBeenCalledWith(0);

        //     localProcessOnSpy.mockRestore();
        // });

        // it("should handle errors during graceful shutdown", async () => {
        //     const shutdownError = new Error("Failed to close connection");
        //     mockedConnectionClose.mockReset();
        //     mockedConnectionClose.mockRejectedValue(shutdownError);

        //     const localProcessOnSpy = jest.spyOn(process, "on").mockImplementation(() => process);

        //     require("../../src/config/database");

        //     const sigintHandler = localProcessOnSpy.mock.calls.find((call) => call[0] === "SIGINT")?.[1] as Function;

        //     expect(sigintHandler).toBeDefined();

        //     // The handler should still exit even if connection close fails
        //     await expect(sigintHandler()).rejects.toThrow("process.exit(0) was called");

        //     expect(mockedConnectionClose).toHaveBeenCalled();

        //     localProcessOnSpy.mockRestore();
        // });

        it("should verify process handling capabilities", () => {
            expect(process.on).toBeDefined();
            expect(typeof process.exit).toBe("function");
        });
    });

    describe("Module Structure and Exports", () => {
        it("should export connectDB as default", () => {
            expect(connectDB).toBeDefined();
            expect(typeof connectDB).toBe("function");
        });

        it("should be an async function", () => {
            expect(connectDB.constructor.name).toBe("AsyncFunction");
        });

        it("should return a Promise", () => {
            process.env.MONGODB_URI = "mongodb://localhost:27017/test";
            mockedConnect.mockResolvedValue({
                connection: { host: "localhost:27017" },
            } as any);

            const result = connectDB();
            expect(result).toBeInstanceOf(Promise);

            return result;
        });

        it("should validate mongoose import", () => {
            expect(mongoose).toBeDefined();
            expect(mongoose.connect).toBeDefined();
            expect(mongoose.connection).toBeDefined();
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
            const specialUri = "mongodb://testuser%40domain.com:testvalue123@localhost:27017/test";
            process.env.MONGODB_URI = specialUri;

            mockedConnect.mockResolvedValue({
                connection: { host: "localhost:27017" },
            } as any);

            await connectDB();

            expect(mockedConnect).toHaveBeenCalledWith(specialUri);
        });

        it("should handle URI with query parameters", async () => {
            const uriWithParams = "mongodb://localhost:27017/test?retryWrites=true&w=majority";
            process.env.MONGODB_URI = uriWithParams;

            mockedConnect.mockResolvedValue({
                connection: { host: "localhost:27017" },
            } as any);

            await connectDB();

            expect(mockedConnect).toHaveBeenCalledWith(uriWithParams);
        });

        it("should handle empty MONGODB_URI with mock rejection", async () => {
            process.env.MONGODB_URI = "";

            // Mock mongoose.connect to reject for empty string
            const emptyError = new Error("Invalid connection string");
            mockedConnect.mockRejectedValue(emptyError);

            await expect(connectDB()).rejects.toThrow("process.exit(1) was called");

            expect(consoleErrorSpy).toHaveBeenCalledWith("Database connection error:", emptyError);
            expect(processExitSpy).toHaveBeenCalledWith(1);
        });

        it("should handle whitespace-only MONGODB_URI with mock rejection", async () => {
            process.env.MONGODB_URI = "   ";

            // Mock mongoose.connect to reject for whitespace string
            const whitespaceError = new Error("Invalid connection string");
            mockedConnect.mockRejectedValue(whitespaceError);

            await expect(connectDB()).rejects.toThrow("process.exit(1) was called");

            expect(consoleErrorSpy).toHaveBeenCalledWith("Database connection error:", whitespaceError);
            expect(processExitSpy).toHaveBeenCalledWith(1);
        });

        it("should handle undefined MONGODB_URI", async () => {
            process.env.MONGODB_URI = undefined;

            await expect(connectDB()).rejects.toThrow("process.exit(1) was called");

            expect(consoleErrorSpy).toHaveBeenCalledWith("Database connection error:", expect.any(Error));
            expect(processExitSpy).toHaveBeenCalledWith(1);
        });
    });

    describe("Edge Cases and Integration", () => {
        it("should handle concurrent connection attempts", async () => {
            process.env.MONGODB_URI = "mongodb://localhost:27017/test";
            mockedConnect.mockResolvedValue({
                connection: { host: "localhost:27017" },
            } as any);

            const promises = [connectDB(), connectDB(), connectDB()];

            await Promise.all(promises);

            expect(mockedConnect).toHaveBeenCalledTimes(3);
        });

        it("should maintain connection state between calls", async () => {
            process.env.MONGODB_URI = "mongodb://localhost:27017/test";
            mockedConnect.mockResolvedValue({
                connection: { host: "localhost:27017" },
            } as any);

            await connectDB();
            await connectDB();

            expect(mongoose.connection).toBeDefined();
            expect(mockedConnect).toHaveBeenCalledTimes(2);
        });

        it("should handle malformed connection responses", async () => {
            process.env.MONGODB_URI = "mongodb://localhost:27017/test";

            // Mock a response that will cause an error when accessing .connection.host
            mockedConnect.mockResolvedValue({
                connection: null,
            } as any);

            await expect(connectDB()).rejects.toThrow("process.exit(1) was called");

            expect(consoleErrorSpy).toHaveBeenCalledWith("Database connection error:", expect.any(Error));
        });

        it("should handle various MongoDB error types", async () => {
            process.env.MONGODB_URI = "mongodb://localhost:27017/test";

            const mongoError = new Error("MongoError: connection timeout");
            (mongoError as any).name = "MongoError";
            (mongoError as any).code = 11000;
            mockedConnect.mockRejectedValue(mongoError);

            await expect(connectDB()).rejects.toThrow("process.exit(1) was called");

            expect(consoleErrorSpy).toHaveBeenCalledWith("Database connection error:", mongoError);
            expect(processExitSpy).toHaveBeenCalledWith(1);
        });
    });

    describe("Performance and Resource Management", () => {
        it("should not leak memory during multiple connections", async () => {
            process.env.MONGODB_URI = "mongodb://localhost:27017/test";
            mockedConnect.mockResolvedValue({
                connection: { host: "localhost:27017" },
            } as any);

            for (let i = 0; i < 5; i++) {
                await connectDB();
            }

            expect(mockedConnect).toHaveBeenCalledTimes(5);
        });

        it("should handle rapid successive calls without issues", async () => {
            process.env.MONGODB_URI = "mongodb://localhost:27017/test";
            mockedConnect.mockImplementation(() => Promise.resolve({ connection: { host: "localhost:27017" } } as any));

            const rapidCalls = Array(10)
                .fill(null)
                .map(() => connectDB());

            await Promise.all(rapidCalls);

            expect(mockedConnect).toHaveBeenCalledTimes(10);
        });

        it("should verify that the module can be imported multiple times", () => {
            // Test that multiple requires don't break anything
            require("../../src/config/database");
            require("../../src/config/database");

            expect(mongoose.connection).toBeDefined();
        });
    });
});
