import {
    mongoIdValidator,
    paginationValidators,
    validateUserId,
    validatePropertyId,
    validatePropertyFilters,
    validateBookingId,
    validateBookingDates,
    validateBookingStatus,
    validateImageUpload,
    validateDateRange,
    validatePhoneNumber,
    validateUrl,
    validatePrice,
    validateCoordinates,
} from "../../src/utils/validators";
import { validationResult } from "express-validator";

// Mock Express request/response objects
const createMockReq = (body: any = {}, query: any = {}, params: any = {}) => ({
    body,
    query,
    params,
});

const createMockRes = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
});

const runValidation = async (validators: any[], req: any) => {
    for (const validator of validators) {
        await validator.run(req);
    }
    return validationResult(req);
};

describe("Validators", () => {
    describe("mongoIdValidator", () => {
        it("should validate valid MongoDB ObjectId", async () => {
            const validator = mongoIdValidator("id");
            const req = createMockReq({}, {}, { id: "507f1f77bcf86cd799439011" });

            const result = await runValidation([validator], req);
            expect(result.isEmpty()).toBe(true);
        });

        it("should reject invalid MongoDB ObjectId", async () => {
            const validator = mongoIdValidator("id");
            const req = createMockReq({}, {}, { id: "invalid-id" });

            const result = await runValidation([validator], req);
            expect(result.isEmpty()).toBe(false);
            expect(result.array()[0].msg).toContain("Invalid id format");
        });

        it("should reject empty ObjectId", async () => {
            const validator = mongoIdValidator("userId");
            const req = createMockReq({}, {}, { userId: "" });

            const result = await runValidation([validator], req);
            expect(result.isEmpty()).toBe(false);
        });
    });

    describe("paginationValidators", () => {
        it("should accept valid page and limit", async () => {
            const req = createMockReq({}, { page: "2", limit: "10" });

            const result = await runValidation(paginationValidators, req);
            expect(result.isEmpty()).toBe(true);
        });

        it("should accept empty pagination values", async () => {
            const req = createMockReq({}, {});

            const result = await runValidation(paginationValidators, req);
            expect(result.isEmpty()).toBe(true);
        });

        it("should reject invalid page value", async () => {
            const req = createMockReq({}, { page: "0" });

            const result = await runValidation(paginationValidators, req);
            expect(result.isEmpty()).toBe(false);
            expect(result.array().some((err) => err.msg === "Page must be a positive integer")).toBe(true);
        });

        it("should reject negative page value", async () => {
            const req = createMockReq({}, { page: "-1" });

            const result = await runValidation(paginationValidators, req);
            expect(result.isEmpty()).toBe(false);
        });

        it("should reject non-numeric page value", async () => {
            const req = createMockReq({}, { page: "abc" });

            const result = await runValidation(paginationValidators, req);
            expect(result.isEmpty()).toBe(false);
        });

        it("should reject invalid limit value", async () => {
            const req = createMockReq({}, { limit: "0" });

            const result = await runValidation(paginationValidators, req);
            expect(result.isEmpty()).toBe(false);
            expect(result.array().some((err) => err.msg === "Limit must be between 1 and 100")).toBe(true);
        });

        it("should reject limit value over 100", async () => {
            const req = createMockReq({}, { limit: "101" });

            const result = await runValidation(paginationValidators, req);
            expect(result.isEmpty()).toBe(false);
        });

        it("should reject non-numeric limit value", async () => {
            const req = createMockReq({}, { limit: "xyz" });

            const result = await runValidation(paginationValidators, req);
            expect(result.isEmpty()).toBe(false);
        });
    });

    describe("validateUserId", () => {
        it("should validate correct user ID", async () => {
            const req = createMockReq({}, {}, { id: "507f1f77bcf86cd799439011" });

            const result = await runValidation([validateUserId], req);
            expect(result.isEmpty()).toBe(true);
        });
    });

    describe("validatePropertyId", () => {
        it("should validate correct property ID", async () => {
            const req = createMockReq({}, {}, { id: "507f1f77bcf86cd799439012" });

            const result = await runValidation([validatePropertyId], req);
            expect(result.isEmpty()).toBe(true);
        });
    });

    describe("validatePropertyFilters", () => {
        it("should accept valid property filters", async () => {
            const req = createMockReq(
                {},
                {
                    city: "New York",
                    country: "USA",
                    minPrice: "100",
                    maxPrice: "500",
                    propertyType: "apartment",
                    bedrooms: "2",
                    maxGuests: "4",
                    search: "luxury apartment",
                    page: "1",
                    limit: "20",
                }
            );

            const result = await runValidation(validatePropertyFilters, req);
            expect(result.isEmpty()).toBe(true);
        });

        it("should accept empty filters", async () => {
            // Empty query parameters should pass validation since all fields are optional
            const req = createMockReq({}, {});

            const result = await runValidation(validatePropertyFilters, req);
            // For empty filters, validation should pass since all fields are optional
            expect(result.isEmpty()).toBe(true);
        });

        it("should reject invalid minPrice", async () => {
            const req = createMockReq({}, { minPrice: "-100" });

            const result = await runValidation(validatePropertyFilters, req);
            expect(result.isEmpty()).toBe(false);
            expect(result.array().some((err) => err.msg === "minPrice must be a positive number")).toBe(true);
        });

        it("should reject non-numeric minPrice", async () => {
            const req = createMockReq({}, { minPrice: "abc" });

            const result = await runValidation(validatePropertyFilters, req);
            expect(result.isEmpty()).toBe(false);
        });

        it("should reject invalid maxPrice", async () => {
            const req = createMockReq({}, { maxPrice: "-500" });

            const result = await runValidation(validatePropertyFilters, req);
            expect(result.isEmpty()).toBe(false);
            expect(result.array().some((err) => err.msg === "maxPrice must be a positive number")).toBe(true);
        });

        it("should reject invalid property type", async () => {
            const req = createMockReq({}, { propertyType: "invalid-type" });

            const result = await runValidation(validatePropertyFilters, req);
            expect(result.isEmpty()).toBe(false);
            expect(result.array().some((err) => err.msg === "Invalid property type")).toBe(true);
        });

        it("should accept valid property types", async () => {
            const validTypes = ["apartment", "house", "villa", "condo", "studio"];

            for (const type of validTypes) {
                const req = createMockReq({}, { propertyType: type });
                const result = await runValidation(validatePropertyFilters, req);
                expect(result.isEmpty()).toBe(true);
            }
        });

        it("should reject invalid bedrooms value", async () => {
            const req = createMockReq({}, { bedrooms: "0" });

            const result = await runValidation(validatePropertyFilters, req);
            expect(result.isEmpty()).toBe(false);
            expect(result.array().some((err) => err.msg === "bedrooms must be a positive integer")).toBe(true);
        });

        it("should reject invalid maxGuests value", async () => {
            const req = createMockReq({}, { maxGuests: "-1" });

            const result = await runValidation(validatePropertyFilters, req);
            expect(result.isEmpty()).toBe(false);
            expect(result.array().some((err) => err.msg === "maxGuests must be a positive integer")).toBe(true);
        });

        it("should reject short city name", async () => {
            const req = createMockReq({}, { city: "A" });

            const result = await runValidation(validatePropertyFilters, req);
            expect(result.isEmpty()).toBe(false);
        });

        it("should reject short country name", async () => {
            const req = createMockReq({}, { country: "X" });

            const result = await runValidation(validatePropertyFilters, req);
            expect(result.isEmpty()).toBe(false);
        });

        it("should reject short search term", async () => {
            const req = createMockReq({}, { search: "A" });

            const result = await runValidation(validatePropertyFilters, req);
            expect(result.isEmpty()).toBe(false);
        });
    });

    describe("validateBookingId", () => {
        it("should validate correct booking ID", async () => {
            const req = createMockReq({}, {}, { id: "507f1f77bcf86cd799439013" });

            const result = await runValidation([validateBookingId], req);
            expect(result.isEmpty()).toBe(true);
        });
    });

    describe("validateBookingDates", () => {
        it("should accept valid booking dates", async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dayAfter = new Date();
            dayAfter.setDate(dayAfter.getDate() + 2);

            const req = createMockReq({
                checkInDate: tomorrow.toISOString(),
                checkOutDate: dayAfter.toISOString(),
            });

            const result = await runValidation(validateBookingDates, req);
            expect(result.isEmpty()).toBe(true);
        });

        it("should reject check-in date in the past", async () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            const req = createMockReq({
                checkInDate: yesterday.toISOString(),
                checkOutDate: tomorrow.toISOString(),
            });

            const result = await runValidation(validateBookingDates, req);
            expect(result.isEmpty()).toBe(false);
            expect(result.array().some((err) => err.msg === "Check-in date cannot be in the past")).toBe(true);
        });

        it("should reject check-out date before check-in date", async () => {
            const date1 = new Date();
            date1.setDate(date1.getDate() + 2);
            const date2 = new Date();
            date2.setDate(date2.getDate() + 1);

            const req = createMockReq({
                checkInDate: date1.toISOString(),
                checkOutDate: date2.toISOString(),
            });

            const result = await runValidation(validateBookingDates, req);
            expect(result.isEmpty()).toBe(false);
            expect(result.array().some((err) => err.msg === "Check-out date must be after check-in date")).toBe(true);
        });

        it("should reject same check-in and check-out dates", async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            const req = createMockReq({
                checkInDate: tomorrow.toISOString(),
                checkOutDate: tomorrow.toISOString(),
            });

            const result = await runValidation(validateBookingDates, req);
            expect(result.isEmpty()).toBe(false);
        });

        it("should reject invalid date format", async () => {
            const req = createMockReq({
                checkInDate: "invalid-date",
                checkOutDate: "2024-12-25",
            });

            const result = await runValidation(validateBookingDates, req);
            expect(result.isEmpty()).toBe(false);
        });
    });

    describe("validateBookingStatus", () => {
        it("should accept valid booking statuses", async () => {
            const validStatuses = ["pending", "confirmed", "canceled", "completed"];

            for (const status of validStatuses) {
                const req = createMockReq({ status });
                const result = await runValidation(validateBookingStatus, req);
                expect(result.isEmpty()).toBe(true);
            }
        });

        it("should reject invalid booking status", async () => {
            const req = createMockReq({ status: "invalid-status" });

            const result = await runValidation(validateBookingStatus, req);
            expect(result.isEmpty()).toBe(false);
            expect(result.array().some((err) => err.msg === "Invalid booking status")).toBe(true);
        });
    });

    describe("validateImageUpload", () => {
        it("should accept valid image array", async () => {
            const req = createMockReq({
                images: ["https://example.com/image1.jpg", "https://example.com/image2.png"],
            });

            const result = await runValidation(validateImageUpload, req);
            expect(result.isEmpty()).toBe(true);
        });

        it("should reject non-array images", async () => {
            const req = createMockReq({ images: "not-an-array" });

            const result = await runValidation(validateImageUpload, req);
            expect(result.isEmpty()).toBe(false);
            expect(result.array().some((err) => err.msg === "Images must be an array")).toBe(true);
        });

        it("should reject empty images array", async () => {
            const req = createMockReq({ images: [] });

            const result = await runValidation(validateImageUpload, req);
            expect(result.isEmpty()).toBe(false);
            expect(result.array().some((err) => err.msg === "At least 1 and at most 10 images are required")).toBe(
                true
            );
        });

        it("should reject too many images", async () => {
            const images = Array(11).fill("https://example.com/image.jpg");
            const req = createMockReq({ images });

            const result = await runValidation(validateImageUpload, req);
            expect(result.isEmpty()).toBe(false);
        });

        it("should reject invalid image URLs", async () => {
            const req = createMockReq({
                images: ["invalid-url", "https://example.com/valid.jpg"],
            });

            const result = await runValidation(validateImageUpload, req);
            expect(result.isEmpty()).toBe(false);
            expect(result.array().some((err) => err.msg === "Each image must be a valid URL")).toBe(true);
        });
    });

    describe("validateDateRange", () => {
        it("should accept valid date range", async () => {
            const validators = validateDateRange("startDate", "endDate");
            const start = new Date();
            start.setDate(start.getDate() + 1);
            const end = new Date();
            end.setDate(end.getDate() + 2);

            const req = createMockReq({
                startDate: start.toISOString(),
                endDate: end.toISOString(),
            });

            const result = await runValidation(validators, req);
            expect(result.isEmpty()).toBe(true);
        });

        it("should allow past dates when allowPastDates is true", async () => {
            const validators = validateDateRange("startDate", "endDate", true);
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const today = new Date();

            const req = createMockReq({
                startDate: yesterday.toISOString(),
                endDate: today.toISOString(),
            });

            const result = await runValidation(validators, req);
            expect(result.isEmpty()).toBe(true);
        });

        it("should reject past dates when allowPastDates is false", async () => {
            const validators = validateDateRange("startDate", "endDate", false);
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const today = new Date();

            const req = createMockReq({
                startDate: yesterday.toISOString(),
                endDate: today.toISOString(),
            });

            const result = await runValidation(validators, req);
            expect(result.isEmpty()).toBe(false);
        });

        it("should reject end date before start date", async () => {
            const validators = validateDateRange("startDate", "endDate");
            const date1 = new Date();
            date1.setDate(date1.getDate() + 2);
            const date2 = new Date();
            date2.setDate(date2.getDate() + 1);

            const req = createMockReq({
                startDate: date1.toISOString(),
                endDate: date2.toISOString(),
            });

            const result = await runValidation(validators, req);
            expect(result.isEmpty()).toBe(false);
        });
    });

    describe("validatePhoneNumber", () => {
        it("should accept valid phone numbers", async () => {
            const validator = validatePhoneNumber("phone", true);
            const validNumbers = ["+1234567890", "1234567890", "+44 20 7946 0958"];

            for (const phone of validNumbers) {
                const req = createMockReq({ phone });
                const result = await runValidation([validator], req);
                expect(result.isEmpty()).toBe(true);
            }
        });

        it("should accept empty phone when not required", async () => {
            const validator = validatePhoneNumber("phone", false);
            const req = createMockReq({ phone: "" });

            const result = await runValidation([validator], req);
            expect(result.isEmpty()).toBe(true);
        });

        it("should reject empty phone when required", async () => {
            const validator = validatePhoneNumber("phone", true);
            const req = createMockReq({ phone: "" });

            const result = await runValidation([validator], req);
            expect(result.isEmpty()).toBe(false);
            expect(result.array().some((err) => err.msg === "Phone number is required")).toBe(true);
        });

        it("should reject invalid phone numbers", async () => {
            const validator = validatePhoneNumber("phone", true);
            const invalidNumbers = ["abc", "123", "+"];

            for (const phone of invalidNumbers) {
                const req = createMockReq({ phone });
                const result = await runValidation([validator], req);
                expect(result.isEmpty()).toBe(false);
            }
        });
    });

    describe("validateUrl", () => {
        it("should accept valid URLs", async () => {
            const validator = validateUrl("website", true);
            const validUrls = ["https://example.com", "http://test.org", "example.com", "subdomain.example.co.uk/path"];

            for (const url of validUrls) {
                const req = createMockReq({ website: url });
                const result = await runValidation([validator], req);
                expect(result.isEmpty()).toBe(true);
            }
        });

        it("should accept empty URL when not required", async () => {
            const validator = validateUrl("website", false);
            const req = createMockReq({ website: "" });

            const result = await runValidation([validator], req);
            expect(result.isEmpty()).toBe(true);
        });

        it("should reject empty URL when required", async () => {
            const validator = validateUrl("website", true);
            const req = createMockReq({ website: "" });

            const result = await runValidation([validator], req);
            expect(result.isEmpty()).toBe(false);
            expect(result.array().some((err) => err.msg === "website URL is required")).toBe(true);
        });

        it("should reject invalid URLs", async () => {
            const validator = validateUrl("website", true);
            const invalidUrls = ["not-a-url", "ftp://invalid", "just-text"];

            for (const url of invalidUrls) {
                const req = createMockReq({ website: url });
                const result = await runValidation([validator], req);
                expect(result.isEmpty()).toBe(false);
            }
        });
    });

    describe("validatePrice", () => {
        it("should accept valid prices", async () => {
            const validator = validatePrice("price", 0);
            const validPrices = ["100", "99.99", "0", "1000"];

            for (const price of validPrices) {
                const req = createMockReq({ price });
                const result = await runValidation([validator], req);
                expect(result.isEmpty()).toBe(true);
            }
        });

        it("should accept prices above minimum", async () => {
            const validator = validatePrice("price", 50);
            const req = createMockReq({ price: "100" });

            const result = await runValidation([validator], req);
            expect(result.isEmpty()).toBe(true);
        });

        it("should reject prices below minimum", async () => {
            const validator = validatePrice("price", 50);
            const req = createMockReq({ price: "25" });

            const result = await runValidation([validator], req);
            expect(result.isEmpty()).toBe(false);
            expect(result.array().some((err) => err.msg === "price must be a positive number greater than 50")).toBe(
                true
            );
        });

        it("should reject negative prices", async () => {
            const validator = validatePrice("price", 0);
            const req = createMockReq({ price: "-100" });

            const result = await runValidation([validator], req);
            expect(result.isEmpty()).toBe(false);
        });

        it("should reject non-numeric prices", async () => {
            const validator = validatePrice("price", 0);
            const req = createMockReq({ price: "abc" });

            const result = await runValidation([validator], req);
            expect(result.isEmpty()).toBe(false);
        });
    });

    describe("validateCoordinates", () => {
        it("should accept valid coordinates", async () => {
            const req = createMockReq({
                location: {
                    coordinates: {
                        lat: "40.7128",
                        lng: "-74.0060",
                    },
                },
            });

            const result = await runValidation(validateCoordinates, req);
            expect(result.isEmpty()).toBe(true);
        });

        it("should accept empty coordinates", async () => {
            const req = createMockReq({
                location: {
                    coordinates: {},
                },
            });

            const result = await runValidation(validateCoordinates, req);
            expect(result.isEmpty()).toBe(true);
        });

        it("should reject invalid latitude", async () => {
            const req = createMockReq({
                location: {
                    coordinates: {
                        lat: "100", // Invalid: > 90
                        lng: "0",
                    },
                },
            });

            const result = await runValidation(validateCoordinates, req);
            expect(result.isEmpty()).toBe(false);
            expect(result.array().some((err) => err.msg === "Latitude must be between -90 and 90")).toBe(true);
        });

        it("should reject invalid longitude", async () => {
            const req = createMockReq({
                location: {
                    coordinates: {
                        lat: "45",
                        lng: "200", // Invalid: > 180
                    },
                },
            });

            const result = await runValidation(validateCoordinates, req);
            expect(result.isEmpty()).toBe(false);
            expect(result.array().some((err) => err.msg === "Longitude must be between -180 and 180")).toBe(true);
        });

        it("should accept boundary latitude values", async () => {
            const boundary_tests = [
                { lat: "90", lng: "0" },
                { lat: "-90", lng: "0" },
                { lat: "0", lng: "180" },
                { lat: "0", lng: "-180" },
            ];

            for (const coords of boundary_tests) {
                const req = createMockReq({
                    location: { coordinates: coords },
                });
                const result = await runValidation(validateCoordinates, req);
                expect(result.isEmpty()).toBe(true);
            }
        });

        it("should reject non-numeric coordinates", async () => {
            const req = createMockReq({
                location: {
                    coordinates: {
                        lat: "invalid",
                        lng: "also-invalid",
                    },
                },
            });

            const result = await runValidation(validateCoordinates, req);
            expect(result.isEmpty()).toBe(false);
        });
    });
});
