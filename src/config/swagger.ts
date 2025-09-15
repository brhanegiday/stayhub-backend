import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "StayHub API",
            version: "1.0.0",
            description: "A comprehensive API for StayHub - Property booking and management platform",
            contact: {
                name: "StayHub Development Team",
                email: "dev@stayhub.com",
            },
        },
        servers: [
            {
                url: process.env.API_BASE_URL || "http://localhost:5000",
                description: "Development server",
            },
            {
                url: "https://api.stayhub.com",
                description: "Production server",
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                    description: "Enter JWT token",
                },
                cookieAuth: {
                    type: "apiKey",
                    in: "cookie",
                    name: "refreshToken",
                    description: "Refresh token stored in httpOnly cookie",
                },
            },
            schemas: {
                Error: {
                    type: "object",
                    properties: {
                        success: {
                            type: "boolean",
                            example: false,
                        },
                        message: {
                            type: "string",
                            example: "Error message",
                        },
                        errors: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    field: { type: "string" },
                                    message: { type: "string" },
                                },
                            },
                        },
                    },
                },
                User: {
                    type: "object",
                    properties: {
                        _id: {
                            type: "string",
                            example: "64a1b2c3d4e5f6789012345",
                        },
                        email: {
                            type: "string",
                            format: "email",
                            example: "user@example.com",
                        },
                        name: {
                            type: "string",
                            example: "John Doe",
                            description: "Full name of the user",
                        },
                        bio: {
                            type: "string",
                            example: "Travel enthusiast and property host",
                            description: "User biography or description",
                        },
                        phone: {
                            type: "string",
                            example: "+1234567890",
                            description: "User phone number",
                        },
                        profileImage: {
                            type: "string",
                            example: "https://cloudinary.com/profile.jpg",
                            description: "URL to user profile image",
                        },
                        role: {
                            type: "string",
                            enum: ["user", "host", "admin"],
                            example: "user",
                        },
                        isEmailVerified: {
                            type: "boolean",
                            example: true,
                        },
                        createdAt: {
                            type: "string",
                            format: "date-time",
                            example: "2023-01-01T00:00:00.000Z",
                        },
                        updatedAt: {
                            type: "string",
                            format: "date-time",
                            example: "2023-01-01T00:00:00.000Z",
                        },
                    },
                },
                UserStats: {
                    type: "object",
                    properties: {
                        totalBookings: {
                            type: "number",
                            description: "Total number of bookings made by user",
                            example: 15,
                        },
                        totalProperties: {
                            type: "number",
                            description: "Total properties owned (for hosts)",
                            example: 3,
                        },
                        totalEarnings: {
                            type: "number",
                            description: "Total earnings from properties (for hosts)",
                            example: 15750.5,
                        },
                        averageRating: {
                            type: "number",
                            description: "Average rating received (for hosts)",
                            example: 4.8,
                        },
                        totalReviews: {
                            type: "number",
                            description: "Total number of reviews received",
                            example: 42,
                        },
                        memberSince: {
                            type: "string",
                            format: "date-time",
                            description: "User registration date",
                            example: "2023-01-01T00:00:00.000Z",
                        },
                        completedBookings: {
                            type: "number",
                            description: "Number of completed bookings",
                            example: 12,
                        },
                        cancelledBookings: {
                            type: "number",
                            description: "Number of cancelled bookings",
                            example: 2,
                        },
                    },
                },
                Property: {
                    type: "object",
                    properties: {
                        _id: {
                            type: "string",
                            example: "64a1b2c3d4e5f6789012345",
                        },
                        title: {
                            type: "string",
                            example: "Beautiful Beach House",
                        },
                        description: {
                            type: "string",
                            example: "A stunning beachfront property with amazing ocean views",
                        },
                        address: {
                            type: "object",
                            properties: {
                                street: { type: "string", example: "123 Ocean Drive" },
                                city: { type: "string", example: "Miami Beach" },
                                state: { type: "string", example: "Florida" },
                                country: { type: "string", example: "USA" },
                                zipCode: { type: "string", example: "33139" },
                            },
                        },
                        pricePerNight: {
                            type: "number",
                            example: 299.99,
                        },
                        images: {
                            type: "array",
                            items: { type: "string" },
                            example: ["https://cloudinary.com/image1.jpg", "https://cloudinary.com/image2.jpg"],
                        },
                        amenities: {
                            type: "array",
                            items: { type: "string" },
                            example: ["WiFi", "Pool", "Beach Access", "Kitchen"],
                        },
                        capacity: {
                            type: "object",
                            properties: {
                                guests: { type: "number", example: 6 },
                                bedrooms: { type: "number", example: 3 },
                                bathrooms: { type: "number", example: 2 },
                            },
                        },
                        host: {
                            type: "string",
                            example: "64a1b2c3d4e5f6789012345",
                        },
                        isActive: {
                            type: "boolean",
                            example: true,
                        },
                        rating: {
                            type: "number",
                            example: 4.8,
                        },
                        reviewCount: {
                            type: "number",
                            example: 42,
                        },
                        createdAt: {
                            type: "string",
                            format: "date-time",
                            example: "2023-01-01T00:00:00.000Z",
                        },
                    },
                },
                Booking: {
                    type: "object",
                    properties: {
                        _id: {
                            type: "string",
                            example: "64a1b2c3d4e5f6789012345",
                        },
                        property: {
                            type: "string",
                            example: "64a1b2c3d4e5f6789012345",
                        },
                        user: {
                            type: "string",
                            example: "64a1b2c3d4e5f6789012345",
                        },
                        checkIn: {
                            type: "string",
                            format: "date",
                            example: "2023-07-15",
                        },
                        checkOut: {
                            type: "string",
                            format: "date",
                            example: "2023-07-20",
                        },
                        guests: {
                            type: "number",
                            example: 4,
                        },
                        totalAmount: {
                            type: "number",
                            example: 1499.95,
                        },
                        status: {
                            type: "string",
                            enum: ["pending", "confirmed", "cancelled", "completed"],
                            example: "confirmed",
                        },
                        paymentStatus: {
                            type: "string",
                            enum: ["pending", "paid", "refunded"],
                            example: "paid",
                        },
                        specialRequests: {
                            type: "string",
                            example: "Late check-in requested",
                        },
                        createdAt: {
                            type: "string",
                            format: "date-time",
                            example: "2023-01-01T00:00:00.000Z",
                        },
                    },
                },
            },
        },
        paths: {
            "/api/users/profile/{id}": {
                get: {
                    tags: ["Users"],
                    summary: "Get user profile",
                    description: "Get public user profile information by user ID",
                    parameters: [
                        {
                            in: "path",
                            name: "id",
                            required: true,
                            schema: { type: "string" },
                            description: "User ID",
                            example: "64a1b2c3d4e5f6789012345",
                        },
                    ],
                    responses: {
                        "200": {
                            description: "User profile retrieved successfully",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            success: { type: "boolean", example: true },
                                            user: { $ref: "#/components/schemas/User" },
                                        },
                                    },
                                },
                            },
                        },
                        "404": {
                            description: "User not found",
                            content: {
                                "application/json": {
                                    schema: { $ref: "#/components/schemas/Error" },
                                },
                            },
                        },
                    },
                },
            },
            "/api/users/profile": {
                put: {
                    tags: ["Users"],
                    summary: "Update user profile",
                    description: "Update current authenticated user profile information",
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        name: {
                                            type: "string",
                                            minLength: 2,
                                            maxLength: 50,
                                            example: "John Doe",
                                        },
                                        bio: {
                                            type: "string",
                                            maxLength: 500,
                                            example: "Travel enthusiast and property host",
                                        },
                                        phone: {
                                            type: "string",
                                            example: "+1234567890",
                                        },
                                        profileImage: {
                                            type: "string",
                                            example: "https://cloudinary.com/profile.jpg",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        "200": {
                            description: "Profile updated successfully",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            success: { type: "boolean", example: true },
                                            message: { type: "string", example: "Profile updated successfully" },
                                            user: { $ref: "#/components/schemas/User" },
                                        },
                                    },
                                },
                            },
                        },
                        "400": {
                            description: "Validation error",
                            content: {
                                "application/json": {
                                    schema: { $ref: "#/components/schemas/Error" },
                                },
                            },
                        },
                        "401": {
                            description: "Unauthorized",
                            content: {
                                "application/json": {
                                    schema: { $ref: "#/components/schemas/Error" },
                                },
                            },
                        },
                    },
                },
            },
            "/api/users/stats": {
                get: {
                    tags: ["Users"],
                    summary: "Get user statistics",
                    description: "Get statistics and analytics for the current authenticated user",
                    security: [{ bearerAuth: [] }],
                    responses: {
                        "200": {
                            description: "User statistics retrieved successfully",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            success: { type: "boolean", example: true },
                                            stats: { $ref: "#/components/schemas/UserStats" },
                                        },
                                    },
                                },
                            },
                        },
                        "401": {
                            description: "Unauthorized",
                            content: {
                                "application/json": {
                                    schema: { $ref: "#/components/schemas/Error" },
                                },
                            },
                        },
                    },
                },
            },
            "/api/users/account": {
                delete: {
                    tags: ["Users"],
                    summary: "Delete user account",
                    description: "Permanently delete the current user account and all associated data",
                    security: [{ bearerAuth: [] }],
                    responses: {
                        "200": {
                            description: "Account deleted successfully",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            success: { type: "boolean", example: true },
                                            message: { type: "string", example: "Account deleted successfully" },
                                        },
                                    },
                                },
                            },
                        },
                        "401": {
                            description: "Unauthorized",
                            content: {
                                "application/json": {
                                    schema: { $ref: "#/components/schemas/Error" },
                                },
                            },
                        },
                        "403": {
                            description: "Forbidden - Cannot delete account with active bookings",
                            content: {
                                "application/json": {
                                    schema: { $ref: "#/components/schemas/Error" },
                                },
                            },
                        },
                    },
                },
            },
        },
        tags: [
            {
                name: "Authentication",
                description: "User authentication and authorization endpoints",
            },
            {
                name: "Users",
                description: "User management endpoints",
            },
            {
                name: "Properties",
                description: "Property management and listing endpoints",
            },
            {
                name: "Bookings",
                description: "Booking management endpoints",
            },
            {
                name: "Health",
                description: "System health check endpoints",
            },
        ],
    },
    apis: ["./src/routes/auth.ts", "./src/routes/properties.ts", "./src/routes/bookings.ts", "./src/app.ts"],
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express): void => {
    // Swagger UI setup
    app.use(
        "/api-docs",
        swaggerUi.serve,
        swaggerUi.setup(specs, {
            explorer: true,
            customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info hgroup.main h2 { color: #3b82f6 }
    `,
            customSiteTitle: "StayHub API Documentation",
            swaggerOptions: {
                persistAuthorization: true,
                displayRequestDuration: true,
                filter: true,
                showExtensions: true,
                showCommonExtensions: true,
            },
        })
    );

    // JSON endpoint for the OpenAPI spec
    app.get("/api-docs.json", (req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.send(specs);
    });
};

export default specs;
