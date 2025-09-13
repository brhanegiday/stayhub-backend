import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import {
    handleValidationErrors,
    validateGoogleAuth,
    validateProperty,
    validateBooking,
} from "../../src/middleware/validation";

// Mock express-validator
jest.mock("express-validator", () => ({
    validationResult: jest.fn(),
    body: jest.fn(() => ({
        notEmpty: jest.fn().mockReturnThis(),
        withMessage: jest.fn().mockReturnThis(),
        isEmail: jest.fn().mockReturnThis(),
        normalizeEmail: jest.fn().mockReturnThis(),
        trim: jest.fn().mockReturnThis(),
        isLength: jest.fn().mockReturnThis(),
        isURL: jest.fn().mockReturnThis(),
        isIn: jest.fn().mockReturnThis(),
        isFloat: jest.fn().mockReturnThis(),
        isInt: jest.fn().mockReturnThis(),
        isArray: jest.fn().mockReturnThis(),
        isMongoId: jest.fn().mockReturnThis(),
        isISO8601: jest.fn().mockReturnThis(),
        toDate: jest.fn().mockReturnThis(),
        optional: jest.fn().mockReturnThis(),
        matches: jest.fn().mockReturnThis(),
        isBoolean: jest.fn().mockReturnThis(),
    })),
}));

const mockValidationResult = validationResult as jest.MockedFunction<typeof validationResult>;

describe("Validation Middleware", () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;
    let statusMock: jest.Mock;
    let jsonMock: jest.Mock;

    beforeEach(() => {
        statusMock = jest.fn().mockReturnThis();
        jsonMock = jest.fn().mockReturnThis();
        mockNext = jest.fn();

        mockRes = {
            status: statusMock,
            json: jsonMock,
        };

        mockReq = {};

        jest.clearAllMocks();
    });

    describe("handleValidationErrors", () => {
        it("should proceed when there are no validation errors", () => {
            const mockResult = {
                isEmpty: jest.fn().mockReturnValue(true),
                array: jest.fn(),
            };
            mockValidationResult.mockReturnValue(mockResult as any);

            handleValidationErrors(mockReq as Request, mockRes as Response, mockNext);

            expect(mockResult.isEmpty).toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalled();
            expect(statusMock).not.toHaveBeenCalled();
        });

        it("should return 400 when there are validation errors", () => {
            const mockErrors = [
                {
                    msg: "Email is required",
                    param: "email",
                    location: "body",
                },
                {
                    msg: "Name must be at least 2 characters",
                    param: "name",
                    location: "body",
                },
            ];

            const mockResult = {
                isEmpty: jest.fn().mockReturnValue(false),
                array: jest.fn().mockReturnValue(mockErrors),
            };
            mockValidationResult.mockReturnValue(mockResult as any);

            handleValidationErrors(mockReq as Request, mockRes as Response, mockNext);

            expect(mockResult.isEmpty).toHaveBeenCalled();
            expect(mockResult.array).toHaveBeenCalled();
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "Validation failed",
                errors: mockErrors,
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it("should handle empty errors array", () => {
            const mockResult = {
                isEmpty: jest.fn().mockReturnValue(false),
                array: jest.fn().mockReturnValue([]),
            };
            mockValidationResult.mockReturnValue(mockResult as any);

            handleValidationErrors(mockReq as Request, mockRes as Response, mockNext);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "Validation failed",
                errors: [],
            });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe("Validation Arrays", () => {
        it("should have validateGoogleAuth array with correct length", () => {
            expect(Array.isArray(validateGoogleAuth)).toBe(true);
            expect(validateGoogleAuth.length).toBe(6); // 5 validation rules + handleValidationErrors
        });

        it("should have validateProperty array with correct length", () => {
            expect(Array.isArray(validateProperty)).toBe(true);
            expect(validateProperty.length).toBe(12); // 11 validation rules + handleValidationErrors
        });

        it("should have validateBooking array with correct length", () => {
            expect(Array.isArray(validateBooking)).toBe(true);
            expect(validateBooking.length).toBe(6); // 5 validation rules + handleValidationErrors
        });

        it("should include handleValidationErrors as last element in all validation arrays", () => {
            expect(validateGoogleAuth[validateGoogleAuth.length - 1]).toBe(handleValidationErrors);
            expect(validateProperty[validateProperty.length - 1]).toBe(handleValidationErrors);
            expect(validateBooking[validateBooking.length - 1]).toBe(handleValidationErrors);
        });
    });

    describe("Integration with express-validator", () => {
        it("should call validationResult with request object", () => {
            const mockResult = {
                isEmpty: jest.fn().mockReturnValue(true),
                array: jest.fn(),
            };
            mockValidationResult.mockReturnValue(mockResult as any);

            handleValidationErrors(mockReq as Request, mockRes as Response, mockNext);

            expect(mockValidationResult).toHaveBeenCalledWith(mockReq);
        });

        it("should handle validationResult throwing an error", () => {
            mockValidationResult.mockImplementation(() => {
                throw new Error("ValidationResult error");
            });

            expect(() => {
                handleValidationErrors(mockReq as Request, mockRes as Response, mockNext);
            }).toThrow("ValidationResult error");

            expect(mockNext).not.toHaveBeenCalled();
            expect(statusMock).not.toHaveBeenCalled();
        });

        it("should handle malformed validation result", () => {
            const mockResult = {
                isEmpty: jest.fn().mockReturnValue(false),
                array: jest.fn().mockReturnValue(undefined),
            };
            mockValidationResult.mockReturnValue(mockResult as any);

            handleValidationErrors(mockReq as Request, mockRes as Response, mockNext);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "Validation failed",
                errors: undefined,
            });
        });
    });

    describe("Error Response Format", () => {
        it("should return consistent error response format", () => {
            const mockErrors = [
                {
                    msg: "Test error",
                    param: "testParam",
                    location: "body",
                    value: "invalidValue",
                },
            ];

            const mockResult = {
                isEmpty: jest.fn().mockReturnValue(false),
                array: jest.fn().mockReturnValue(mockErrors),
            };
            mockValidationResult.mockReturnValue(mockResult as any);

            handleValidationErrors(mockReq as Request, mockRes as Response, mockNext);

            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "Validation failed",
                errors: mockErrors,
            });

            const responseCall = jsonMock.mock.calls[0][0];
            expect(responseCall).toHaveProperty("success", false);
            expect(responseCall).toHaveProperty("message", "Validation failed");
            expect(responseCall).toHaveProperty("errors");
            expect(Array.isArray(responseCall.errors)).toBe(true);
        });
    });

    describe("Middleware Function Properties", () => {
        it("should be proper middleware functions", () => {
            expect(typeof handleValidationErrors).toBe("function");
            expect(handleValidationErrors.length).toBe(3); // req, res, next parameters

            validateGoogleAuth.forEach((middleware, index) => {
                if (index < validateGoogleAuth.length - 1) {
                    // All but the last should be validation middleware (either functions or objects)
                    expect(typeof middleware === "function" || typeof middleware === "object").toBe(true);
                } else {
                    // Last should be handleValidationErrors
                    expect(middleware).toBe(handleValidationErrors);
                }
            });
        });

        it("should handle missing parameters gracefully", () => {
            const mockResult = {
                isEmpty: jest.fn().mockReturnValue(true),
                array: jest.fn(),
            };
            mockValidationResult.mockReturnValue(mockResult as any);

            // Test with missing next function should throw
            expect(() => {
                handleValidationErrors(mockReq as Request, mockRes as Response, undefined as any);
            }).toThrow();

            // Should still call isEmpty
            expect(mockResult.isEmpty).toHaveBeenCalled();
        });
    });
});
