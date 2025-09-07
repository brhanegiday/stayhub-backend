// MongoDB initialization script for production
// This script runs when the MongoDB container starts for the first time

print("Initializing StayHub database...");

// Switch to stayhub database
db = db.getSiblingDB("stayhub");

// Create collections with validators
db.createCollection("users", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["email", "password"],
            properties: {
                email: {
                    bsonType: "string",
                    pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
                },
                password: {
                    bsonType: "string",
                    minLength: 6,
                },
                role: {
                    bsonType: "string",
                    enum: ["user", "host", "admin"],
                },
            },
        },
    },
});

db.createCollection("properties", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["title", "description", "price", "host"],
            properties: {
                title: {
                    bsonType: "string",
                    minLength: 1,
                },
                price: {
                    bsonType: "number",
                    minimum: 0,
                },
            },
        },
    },
});

db.createCollection("bookings", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["user", "property", "checkIn", "checkOut", "totalPrice"],
            properties: {
                totalPrice: {
                    bsonType: "number",
                    minimum: 0,
                },
                status: {
                    bsonType: "string",
                    enum: ["pending", "confirmed", "cancelled", "completed"],
                },
            },
        },
    },
});

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ googleId: 1 }, { sparse: true });

db.properties.createIndex({ host: 1 });
db.properties.createIndex({ location: "2dsphere" });
db.properties.createIndex({ "address.city": 1 });
db.properties.createIndex({ price: 1 });
db.properties.createIndex({ createdAt: -1 });

db.bookings.createIndex({ user: 1 });
db.bookings.createIndex({ property: 1 });
db.bookings.createIndex({ checkIn: 1, checkOut: 1 });
db.bookings.createIndex({ status: 1 });
db.bookings.createIndex({ createdAt: -1 });

// Create compound indexes
db.bookings.createIndex({ property: 1, checkIn: 1, checkOut: 1 });
db.properties.createIndex({ "address.city": 1, price: 1 });

print("Database initialization completed successfully!");
