import Property, { IProperty } from "../../src/models/Property";
import User from "../../src/models/User";
import mongoose from "mongoose";

describe("Property Model", () => {
    let hostId: mongoose.Types.ObjectId;

    beforeEach(async () => {
        const host = new User({
            googleId: "host123",
            email: "host@example.com",
            name: "John Host",
            avatar: "https://example.com/avatar.jpg",
            role: "host",
        });
        const savedHost = await host.save();
        hostId = savedHost._id;
    });

    const validPropertyData = {
        title: "Beautiful Apartment",
        description: "A lovely apartment in the city center",
        pricePerNight: 100,
        location: {
            address: "123 Main St",
            city: "New York",
            country: "USA",
            coordinates: {
                lat: 40.7128,
                lng: -74.006,
            },
        },
        images: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
        amenities: ["WiFi", "Air Conditioning", "Kitchen"],
        bedrooms: 2,
        bathrooms: 1,
        maxGuests: 4,
        propertyType: "apartment" as const,
        rules: ["No smoking", "No pets"],
        checkInTime: "15:00",
        checkOutTime: "11:00",
    };

    afterEach(async () => {
        await Property.deleteMany({});
        await User.deleteMany({});
    });

    describe("Property Creation", () => {
        it("should create a property with valid data", async () => {
            const propertyData = { ...validPropertyData, hostId };
            const property = new Property(propertyData);
            const savedProperty = await property.save();

            expect(savedProperty._id).toBeDefined();
            expect(savedProperty.title).toBe(validPropertyData.title);
            expect(savedProperty.description).toBe(validPropertyData.description);
            expect(savedProperty.pricePerNight).toBe(validPropertyData.pricePerNight);
            expect(savedProperty.location.address).toBe(validPropertyData.location.address);
            expect(savedProperty.location.city).toBe(validPropertyData.location.city);
            expect(savedProperty.location.country).toBe(validPropertyData.location.country);
            expect(savedProperty.location.coordinates?.lat).toBe(validPropertyData.location.coordinates.lat);
            expect(savedProperty.location.coordinates?.lng).toBe(validPropertyData.location.coordinates.lng);
            expect(savedProperty.images).toEqual(validPropertyData.images);
            expect(savedProperty.amenities).toEqual(validPropertyData.amenities);
            expect(savedProperty.bedrooms).toBe(validPropertyData.bedrooms);
            expect(savedProperty.bathrooms).toBe(validPropertyData.bathrooms);
            expect(savedProperty.maxGuests).toBe(validPropertyData.maxGuests);
            expect(savedProperty.propertyType).toBe(validPropertyData.propertyType);
            expect(savedProperty.hostId.toString()).toBe(hostId.toString());
            expect(savedProperty.isActive).toBe(true);
            expect(savedProperty.rules).toEqual(validPropertyData.rules);
            expect(savedProperty.checkInTime).toBe(validPropertyData.checkInTime);
            expect(savedProperty.checkOutTime).toBe(validPropertyData.checkOutTime);
            expect(savedProperty.createdAt).toBeDefined();
            expect(savedProperty.updatedAt).toBeDefined();
        });

        it("should create a property with default values", async () => {
            const minimalData = {
                title: "Basic Property",
                description: "A basic property",
                pricePerNight: 50,
                location: {
                    address: "456 Oak St",
                    city: "Boston",
                    country: "USA",
                },
                images: ["https://example.com/basic.jpg"],
                amenities: [],
                bedrooms: 1,
                bathrooms: 1,
                maxGuests: 2,
                propertyType: "studio" as const,
                hostId,
                rules: [],
            };

            const property = new Property(minimalData);
            const savedProperty = await property.save();

            expect(savedProperty.isActive).toBe(true);
            expect(savedProperty.checkInTime).toBe("15:00");
            expect(savedProperty.checkOutTime).toBe("11:00");
        });

        it("should create property without coordinates", async () => {
            const propertyData = {
                ...validPropertyData,
                hostId,
                location: {
                    address: "789 Pine St",
                    city: "Chicago",
                    country: "USA",
                },
            };

            const property = new Property(propertyData);
            const savedProperty = await property.save();

            expect(savedProperty.location.coordinates).toEqual(
                expect.objectContaining({
                    lat: undefined,
                    lng: undefined,
                })
            );
        });
    });

    describe("Property Validation", () => {
        it("should fail if title is missing", async () => {
            const propertyData = { ...validPropertyData, hostId };
            delete (propertyData as any).title;
            const property = new Property(propertyData);

            await expect(property.save()).rejects.toThrow();
        });

        it("should fail if description is missing", async () => {
            const propertyData = { ...validPropertyData, hostId };
            delete (propertyData as any).description;
            const property = new Property(propertyData);

            await expect(property.save()).rejects.toThrow();
        });

        it("should fail if pricePerNight is missing", async () => {
            const propertyData = { ...validPropertyData, hostId };
            delete (propertyData as any).pricePerNight;
            const property = new Property(propertyData);

            await expect(property.save()).rejects.toThrow();
        });

        it("should fail if pricePerNight is less than 1", async () => {
            const propertyData = { ...validPropertyData, hostId, pricePerNight: 0 };
            const property = new Property(propertyData);

            await expect(property.save()).rejects.toThrow();
        });

        it("should fail if bedrooms is less than 1", async () => {
            const propertyData = { ...validPropertyData, hostId, bedrooms: 0 };
            const property = new Property(propertyData);

            await expect(property.save()).rejects.toThrow();
        });

        it("should fail if bathrooms is less than 1", async () => {
            const propertyData = { ...validPropertyData, hostId, bathrooms: 0 };
            const property = new Property(propertyData);

            await expect(property.save()).rejects.toThrow();
        });

        it("should fail if maxGuests is less than 1", async () => {
            const propertyData = { ...validPropertyData, hostId, maxGuests: 0 };
            const property = new Property(propertyData);

            await expect(property.save()).rejects.toThrow();
        });

        it("should fail if propertyType is invalid", async () => {
            const propertyData = { ...validPropertyData, hostId, propertyType: "invalid" as any };
            const property = new Property(propertyData);

            await expect(property.save()).rejects.toThrow();
        });

        it("should fail if title exceeds maximum length", async () => {
            const propertyData = {
                ...validPropertyData,
                hostId,
                title: "A".repeat(101), // Max is 100
            };
            const property = new Property(propertyData);

            await expect(property.save()).rejects.toThrow();
        });

        it("should fail if description exceeds maximum length", async () => {
            const propertyData = {
                ...validPropertyData,
                hostId,
                description: "A".repeat(1001), // Max is 1000
            };
            const property = new Property(propertyData);

            await expect(property.save()).rejects.toThrow();
        });

        it("should fail if hostId is missing", async () => {
            const propertyData = { ...validPropertyData };
            delete (propertyData as any).hostId;
            const property = new Property(propertyData);

            await expect(property.save()).rejects.toThrow();
        });

        it("should fail if location.address is missing", async () => {
            const propertyData = {
                ...validPropertyData,
                hostId,
                location: {
                    city: "New York",
                    country: "USA",
                },
            };
            const property = new Property(propertyData);

            await expect(property.save()).rejects.toThrow();
        });

        it("should fail if location.city is missing", async () => {
            const propertyData = {
                ...validPropertyData,
                hostId,
                location: {
                    address: "123 Main St",
                    country: "USA",
                },
            };
            const property = new Property(propertyData);

            await expect(property.save()).rejects.toThrow();
        });

        it("should fail if location.country is missing", async () => {
            const propertyData = {
                ...validPropertyData,
                hostId,
                location: {
                    address: "123 Main St",
                    city: "New York",
                },
            };
            const property = new Property(propertyData);

            await expect(property.save()).rejects.toThrow();
        });

        it("should fail if images array is empty", async () => {
            const propertyData = { ...validPropertyData, hostId, images: [] };
            const property = new Property(propertyData);

            await expect(property.save()).rejects.toThrow();
        });
    });

    describe("Property Types", () => {
        const propertyTypes = ["apartment", "house", "villa", "condo", "studio"] as const;

        propertyTypes.forEach((type) => {
            it(`should create property with type ${type}`, async () => {
                const propertyData = { ...validPropertyData, hostId, propertyType: type };
                const property = new Property(propertyData);
                const savedProperty = await property.save();

                expect(savedProperty.propertyType).toBe(type);
            });
        });
    });

    describe("Property Text Trimming", () => {
        it("should trim title and description", async () => {
            const propertyData = {
                ...validPropertyData,
                hostId,
                title: "  Beautiful Apartment  ",
                description: "  A lovely apartment  ",
            };
            const property = new Property(propertyData);
            const savedProperty = await property.save();

            expect(savedProperty.title).toBe("Beautiful Apartment");
            expect(savedProperty.description).toBe("A lovely apartment");
        });

        it("should trim location fields", async () => {
            const propertyData = {
                ...validPropertyData,
                hostId,
                location: {
                    address: "  123 Main St  ",
                    city: "  New York  ",
                    country: "  USA  ",
                },
            };
            const property = new Property(propertyData);
            const savedProperty = await property.save();

            expect(savedProperty.location.address).toBe("123 Main St");
            expect(savedProperty.location.city).toBe("New York");
            expect(savedProperty.location.country).toBe("USA");
        });

        it("should trim amenities and rules", async () => {
            const propertyData = {
                ...validPropertyData,
                hostId,
                amenities: ["  WiFi  ", "  Kitchen  "],
                rules: ["  No smoking  ", "  No pets  "],
            };
            const property = new Property(propertyData);
            const savedProperty = await property.save();

            expect(savedProperty.amenities).toEqual(["WiFi", "Kitchen"]);
            expect(savedProperty.rules).toEqual(["No smoking", "No pets"]);
        });
    });

    describe("Property Virtuals", () => {
        it("should define virtual fields for relationships", () => {
            const propertyData = { ...validPropertyData, hostId };
            const property = new Property(propertyData);

            // Virtual fields for references are undefined unless populated
            expect((property.toObject() as any).bookings).toBeUndefined();
            expect((property.toObject() as any).host).toBeUndefined();

            // But the virtuals should be defined on the schema
            expect((Property.schema.virtuals as any).bookings).toBeDefined();
            expect((Property.schema.virtuals as any).host).toBeDefined();
        });
    });

    describe("Property Schema Options", () => {
        it("should include timestamps", async () => {
            const propertyData = { ...validPropertyData, hostId };
            const property = new Property(propertyData);
            const savedProperty = await property.save();

            expect(savedProperty.createdAt).toBeInstanceOf(Date);
            expect(savedProperty.updatedAt).toBeInstanceOf(Date);
        });

        it("should include virtual fields in JSON when configured", () => {
            const propertyData = { ...validPropertyData, hostId };
            const property = new Property(propertyData);
            const propertyJSON = property.toJSON();

            // Reference virtuals are undefined unless populated
            expect((propertyJSON as any).bookings).toBeUndefined();
            expect((propertyJSON as any).host).toBeUndefined();
        });
    });
});
