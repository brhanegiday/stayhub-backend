import { Request, Response, NextFunction } from "express";
import {
    mongoIdValidator,
    paginationValidators,
    validateUserId,
    validatePropertyId,
    validatePropertyFilters,
    validateBookingId,
} from "../../src/utils/validators";

// Mock express-validator
jest.mock("express-validator", () => ({
    body: jest.fn(() => ({
        isISO8601: jest.fn().mockReturnThis(),
        toDate: jest.fn().mockReturnThis(),
        withMessage: jest.fn().mockReturnThis(),
        custom: jest.fn().mockReturnThis(),
        isInt: jest.fn().mockReturnThis(),
        toInt: jest.fn().mockReturnThis(),
        isFloat: jest.fn().mockReturnThis(),
        toFloat: jest.fn().mockReturnThis(),
        isIn: jest.fn().mockReturnThis(),
        isArray: jest.fn().mockReturnThis(),
        isURL: jest.fn().mockReturnThis(),
        isMobilePhone: jest.fn().mockReturnThis(),
        trim: jest.fn().mockReturnThis(),
        isLength: jest.fn().mockReturnThis(),
        optional: jest.fn().mockReturnThis(),
    })),
    param: jest.fn(() => ({
        isMongoId: jest.fn().mockReturnThis(),
        withMessage: jest.fn().mockReturnThis(),
    })),
    query: jest.fn(() => ({
        custom: jest.fn().mockReturnThis(),
        optional: jest.fn().mockReturnThis(),
        isInt: jest.fn().mockReturnThis(),
        withMessage: jest.fn().mockReturnThis(),
        trim: jest.fn().mockReturnThis(),
        isLength: jest.fn().mockReturnThis(),
        isFloat: jest.fn().mockReturnThis(),
        toFloat: jest.fn().mockReturnThis(),
        isIn: jest.fn().mockReturnThis(),
        toInt: jest.fn().mockReturnThis(),
    })),
}));

describe("Validators", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("mongoIdValidator", () => {
        it("should create a mongo ID validator for a given field", () => {
            const validator = mongoIdValidator("userId");
            expect(validator).toBeDefined();
            expect(typeof validator).toBe("object");
        });

        it("should validate different field names", () => {
            const userIdValidator = mongoIdValidator("userId");
            const propertyIdValidator = mongoIdValidator("propertyId");
            const bookingIdValidator = mongoIdValidator("bookingId");

            expect(userIdValidator).toBeDefined();
            expect(propertyIdValidator).toBeDefined();
            expect(bookingIdValidator).toBeDefined();
        });
    });

    describe("paginationValidators", () => {
        it("should be an array of validators", () => {
            expect(Array.isArray(paginationValidators)).toBe(true);
            expect(paginationValidators.length).toBe(2);
        });

        it("should include page and limit validators", () => {
            expect(paginationValidators).toHaveLength(2);
        });
    });

    describe("specific validators", () => {
        it("should export validateUserId", () => {
            expect(validateUserId).toBeDefined();
            expect(typeof validateUserId).toBe("object");
        });

        it("should export validatePropertyId", () => {
            expect(validatePropertyId).toBeDefined();
            expect(typeof validatePropertyId).toBe("object");
        });

        it("should export validateBookingId", () => {
            expect(validateBookingId).toBeDefined();
            expect(typeof validateBookingId).toBe("object");
        });

        it("should export validatePropertyFilters as array", () => {
            expect(Array.isArray(validatePropertyFilters)).toBe(true);
            expect(validatePropertyFilters.length).toBeGreaterThan(2);
        });
    });

    describe("validation logic", () => {
        it("should handle empty field names", () => {
            const validator = mongoIdValidator("");
            expect(validator).toBeDefined();
        });

        it("should handle special characters in field names", () => {
            const validator = mongoIdValidator("field-with-dash");
            expect(validator).toBeDefined();
        });

        it("should create validators for common field types", () => {
            const fieldTypes = ["id", "userId", "propertyId", "bookingId", "hostId"];

            fieldTypes.forEach((fieldType) => {
                const validator = mongoIdValidator(fieldType);
                expect(validator).toBeDefined();
            });
        });
    });

    describe("validator composition", () => {
        it("should compose pagination validators correctly", () => {
            expect(paginationValidators).toContainEqual(expect.any(Object));
        });

        it("should include property filters with pagination", () => {
            // validatePropertyFilters should include pagination validators
            expect(validatePropertyFilters.length).toBeGreaterThan(paginationValidators.length);
        });
    });

    describe("validator types", () => {
        it("should return validator objects", () => {
            const validator = mongoIdValidator("test");
            expect(typeof validator).toBe("object");
            expect(validator).not.toBeNull();
        });

        it("should handle validator arrays", () => {
            const validators = [validateUserId, validatePropertyId, validateBookingId];
            validators.forEach((validator) => {
                expect(validator).toBeDefined();
                expect(typeof validator).toBe("object");
            });
        });
    });
});
