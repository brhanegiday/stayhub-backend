import Booking, { IBooking } from "../../src/models/Booking";
import User from "../../src/models/User";
import Property from "../../src/models/Property";
import mongoose from "mongoose";

describe("Booking Model", () => {
    let renterId: mongoose.Types.ObjectId;
    let hostId: mongoose.Types.ObjectId;
    let propertyId: mongoose.Types.ObjectId;

    beforeEach(async () => {
        // Create a renter
        const renter = new User({
            googleId: "renter123",
            email: "renter@example.com",
            name: "John Renter",
            avatar: "https://example.com/avatar.jpg",
            role: "renter",
        });
        const savedRenter = await renter.save();
        renterId = savedRenter._id;

        // Create a host
        const host = new User({
            googleId: "host123",
            email: "host@example.com",
            name: "Jane Host",
            avatar: "https://example.com/avatar.jpg",
            role: "host",
        });
        const savedHost = await host.save();
        hostId = savedHost._id;

        // Create a property
        const property = new Property({
            title: "Test Property",
            description: "A test property",
            pricePerNight: 100,
            location: {
                address: "123 Test St",
                city: "Test City",
                country: "Test Country",
            },
            images: ["https://example.com/image.jpg"],
            amenities: ["WiFi"],
            bedrooms: 1,
            bathrooms: 1,
            maxGuests: 2,
            propertyType: "apartment",
            hostId,
        });
        const savedProperty = await property.save();
        propertyId = savedProperty._id;
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    const validBookingData = {
        propertyId: null as any, // Will be set in tests
        renterId: null as any, // Will be set in tests
        hostId: null as any, // Will be set in tests
        checkInDate: tomorrow,
        checkOutDate: dayAfterTomorrow,
        totalPrice: 100,
        numberOfGuests: 2,
    };

    afterEach(async () => {
        await Booking.deleteMany({});
        await Property.deleteMany({});
        await User.deleteMany({});
    });

    describe("Booking Creation", () => {
        it("should create a booking with valid data", async () => {
            const bookingData = {
                ...validBookingData,
                propertyId,
                renterId,
                hostId,
            };
            const booking = new Booking(bookingData);
            const savedBooking = await booking.save();

            expect(savedBooking._id).toBeDefined();
            expect(savedBooking.propertyId.toString()).toBe(propertyId.toString());
            expect(savedBooking.renterId.toString()).toBe(renterId.toString());
            expect(savedBooking.hostId.toString()).toBe(hostId.toString());
            expect(savedBooking.checkInDate).toEqual(bookingData.checkInDate);
            expect(savedBooking.checkOutDate).toEqual(bookingData.checkOutDate);
            expect(savedBooking.totalPrice).toBe(bookingData.totalPrice);
            expect(savedBooking.numberOfGuests).toBe(bookingData.numberOfGuests);
            expect(savedBooking.status).toBe("pending");
            expect(savedBooking.paymentStatus).toBe("pending");
            expect(savedBooking.createdAt).toBeDefined();
            expect(savedBooking.updatedAt).toBeDefined();
        });

        it("should create a booking with optional fields", async () => {
            const bookingData = {
                ...validBookingData,
                propertyId,
                renterId,
                hostId,
                specialRequests: "Late check-in",
                status: "confirmed" as const,
                paymentStatus: "paid" as const,
            };
            const booking = new Booking(bookingData);
            const savedBooking = await booking.save();

            expect(savedBooking.specialRequests).toBe(bookingData.specialRequests);
            expect(savedBooking.status).toBe(bookingData.status);
            expect(savedBooking.paymentStatus).toBe(bookingData.paymentStatus);
        });
    });

    describe("Booking Validation", () => {
        it("should fail if propertyId is missing", async () => {
            const bookingData = { ...validBookingData, renterId, hostId };
            delete (bookingData as any).propertyId;
            const booking = new Booking(bookingData);

            await expect(booking.save()).rejects.toThrow();
        });

        it("should fail if renterId is missing", async () => {
            const bookingData = { ...validBookingData, propertyId, hostId };
            delete (bookingData as any).renterId;
            const booking = new Booking(bookingData);

            await expect(booking.save()).rejects.toThrow();
        });

        it("should fail if hostId is missing", async () => {
            const bookingData = { ...validBookingData, propertyId, renterId };
            delete (bookingData as any).hostId;
            const booking = new Booking(bookingData);

            await expect(booking.save()).rejects.toThrow();
        });

        it("should fail if checkInDate is missing", async () => {
            const bookingData = { ...validBookingData, propertyId, renterId, hostId };
            delete (bookingData as any).checkInDate;
            const booking = new Booking(bookingData);

            await expect(booking.save()).rejects.toThrow();
        });

        it("should fail if checkOutDate is missing", async () => {
            const bookingData = { ...validBookingData, propertyId, renterId, hostId };
            delete (bookingData as any).checkOutDate;
            const booking = new Booking(bookingData);

            await expect(booking.save()).rejects.toThrow();
        });

        it("should fail if totalPrice is missing", async () => {
            const bookingData = { ...validBookingData, propertyId, renterId, hostId };
            delete (bookingData as any).totalPrice;
            const booking = new Booking(bookingData);

            await expect(booking.save()).rejects.toThrow();
        });

        it("should fail if numberOfGuests is missing", async () => {
            const bookingData = { ...validBookingData, propertyId, renterId, hostId };
            delete (bookingData as any).numberOfGuests;
            const booking = new Booking(bookingData);

            await expect(booking.save()).rejects.toThrow();
        });

        it("should fail if totalPrice is negative", async () => {
            const bookingData = {
                ...validBookingData,
                propertyId,
                renterId,
                hostId,
                totalPrice: -1,
            };
            const booking = new Booking(bookingData);

            await expect(booking.save()).rejects.toThrow();
        });

        it("should fail if numberOfGuests is less than 1", async () => {
            const bookingData = {
                ...validBookingData,
                propertyId,
                renterId,
                hostId,
                numberOfGuests: 0,
            };
            const booking = new Booking(bookingData);

            await expect(booking.save()).rejects.toThrow();
        });

        it("should fail if status is invalid", async () => {
            const bookingData = {
                ...validBookingData,
                propertyId,
                renterId,
                hostId,
                status: "invalid" as any,
            };
            const booking = new Booking(bookingData);

            await expect(booking.save()).rejects.toThrow();
        });

        it("should fail if paymentStatus is invalid", async () => {
            const bookingData = {
                ...validBookingData,
                propertyId,
                renterId,
                hostId,
                paymentStatus: "invalid" as any,
            };
            const booking = new Booking(bookingData);

            await expect(booking.save()).rejects.toThrow();
        });

        it("should fail if specialRequests exceeds maximum length", async () => {
            const bookingData = {
                ...validBookingData,
                propertyId,
                renterId,
                hostId,
                specialRequests: "A".repeat(501), // Max is 500
            };
            const booking = new Booking(bookingData);

            await expect(booking.save()).rejects.toThrow();
        });

        it("should fail if cancellationReason exceeds maximum length", async () => {
            const bookingData = {
                ...validBookingData,
                propertyId,
                renterId,
                hostId,
                cancellationReason: "A".repeat(501), // Max is 500
            };
            const booking = new Booking(bookingData);

            await expect(booking.save()).rejects.toThrow();
        });
    });

    describe("Booking Date Validation", () => {
        it("should fail if checkInDate is in the past", async () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            const bookingData = {
                ...validBookingData,
                propertyId,
                renterId,
                hostId,
                checkInDate: yesterday,
            };
            const booking = new Booking(bookingData);

            await expect(booking.save()).rejects.toThrow("Check-in date cannot be in the past");
        });

        it("should fail if checkOutDate is before checkInDate", async () => {
            const bookingData = {
                ...validBookingData,
                propertyId,
                renterId,
                hostId,
                checkInDate: dayAfterTomorrow,
                checkOutDate: tomorrow,
            };
            const booking = new Booking(bookingData);

            await expect(booking.save()).rejects.toThrow("Check-out date must be after check-in date");
        });

        it("should fail if checkInDate equals checkOutDate", async () => {
            const bookingData = {
                ...validBookingData,
                propertyId,
                renterId,
                hostId,
                checkInDate: tomorrow,
                checkOutDate: tomorrow,
            };
            const booking = new Booking(bookingData);

            await expect(booking.save()).rejects.toThrow("Check-out date must be after check-in date");
        });
    });

    describe("Booking Status", () => {
        const statuses = ["pending", "confirmed", "canceled", "completed"] as const;

        statuses.forEach((status) => {
            it(`should create booking with status ${status}`, async () => {
                const bookingData = {
                    ...validBookingData,
                    propertyId,
                    renterId,
                    hostId,
                    status,
                };
                const booking = new Booking(bookingData);
                const savedBooking = await booking.save();

                expect(savedBooking.status).toBe(status);
            });
        });
    });

    describe("Booking Payment Status", () => {
        const paymentStatuses = ["pending", "paid", "refunded"] as const;

        paymentStatuses.forEach((paymentStatus) => {
            it(`should create booking with payment status ${paymentStatus}`, async () => {
                const bookingData = {
                    ...validBookingData,
                    propertyId,
                    renterId,
                    hostId,
                    paymentStatus,
                };
                const booking = new Booking(bookingData);
                const savedBooking = await booking.save();

                expect(savedBooking.paymentStatus).toBe(paymentStatus);
            });
        });
    });

    describe("Booking Virtuals", () => {
        it("should have numberOfNights virtual field", () => {
            const bookingData = { ...validBookingData, propertyId, renterId, hostId };
            const booking = new Booking(bookingData);
            expect(booking.toObject()).toHaveProperty("numberOfNights");
            expect((booking as any).numberOfNights).toBe(1); // 1 night: tomorrow to day after tomorrow
        });

        it("should calculate numberOfNights correctly for longer stays", () => {
            const checkInDate = new Date("2025-09-08");
            const checkOutDate = new Date("2025-09-11"); // 3 days later
            const bookingData = {
                ...validBookingData,
                propertyId,
                renterId,
                hostId,
                checkInDate,
                checkOutDate,
            };
            const booking = new Booking(bookingData);
            expect((booking as any).numberOfNights).toBe(3);
        });

        it("should calculate numberOfNights correctly", async () => {
            const checkIn = new Date();
            checkIn.setDate(checkIn.getDate() + 1);

            const checkOut = new Date();
            checkOut.setDate(checkOut.getDate() + 4); // 3 nights

            const bookingData = {
                ...validBookingData,
                propertyId,
                renterId,
                hostId,
                checkInDate: checkIn,
                checkOutDate: checkOut,
            };
            const booking = new Booking(bookingData);
            const savedBooking = await booking.save();

            expect((savedBooking as any).numberOfNights).toBe(3);
        });
    });

    describe("Booking Cancellation", () => {
        it("should save cancellation details", async () => {
            const bookingData = {
                ...validBookingData,
                propertyId,
                renterId,
                hostId,
                status: "canceled" as const,
                cancellationReason: "Change of plans",
                canceledAt: new Date(),
                canceledBy: renterId,
            };
            const booking = new Booking(bookingData);
            const savedBooking = await booking.save();

            expect(savedBooking.cancellationReason).toBe(bookingData.cancellationReason);
            expect(savedBooking.canceledAt).toEqual(bookingData.canceledAt);
            expect(savedBooking.canceledBy?.toString()).toBe(renterId.toString());
        });
    });

    describe("Booking Schema Options", () => {
        it("should include timestamps", async () => {
            const bookingData = { ...validBookingData, propertyId, renterId, hostId };
            const booking = new Booking(bookingData);
            const savedBooking = await booking.save();

            expect(savedBooking.createdAt).toBeInstanceOf(Date);
            expect(savedBooking.updatedAt).toBeInstanceOf(Date);
        });

        it("should include virtual fields in JSON", () => {
            const bookingData = { ...validBookingData, propertyId, renterId, hostId };
            const booking = new Booking(bookingData);
            const bookingJSON = booking.toJSON();

            expect(bookingJSON).toHaveProperty("numberOfNights");
            expect((bookingJSON as any).numberOfNights).toBe(1);

            // Reference virtuals are undefined unless populated
            expect((bookingJSON as any).property).toBeUndefined();
            expect((bookingJSON as any).renter).toBeUndefined();
            expect((bookingJSON as any).host).toBeUndefined();
        });
    });
});
