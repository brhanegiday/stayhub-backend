# StayHub API Documentation

## Overview

The StayHub API provides comprehensive endpoints for property booking and management. This API uses OpenAPI 3.0 specification and includes interactive documentation via Swagger UI.

## API Documentation Access

### Swagger UI Interface
- **Development**: `http://localhost:5000/api-docs/`
- **Production**: `https://api.stayhub.com/api-docs/`

### OpenAPI JSON Specification
- **Development**: `http://localhost:5000/api-docs.json`
- **Production**: `https://api.stayhub.com/api-docs.json`

## Features

### 🔐 Authentication & Authorization
- **JWT-based authentication** with Bearer tokens
- **Refresh token system** using secure httpOnly cookies
- **Role-based access control** (user, host, admin)
- **Email verification** for new accounts
- **Password reset** functionality
- **Google OAuth** integration

### 🏠 Property Management
- **Property listings** with advanced filtering
- **Image upload** via Cloudinary integration
- **Geolocation support** for addresses
- **Amenities management**
- **Capacity specifications** (guests, bedrooms, bathrooms)
- **Host-only property management**

### 📅 Booking System
- **Reservation creation** and management
- **Availability checking**
- **Booking status tracking** (pending, confirmed, cancelled, completed)
- **Payment status integration**
- **Special requests** handling

### 💯 Additional Features
- **Rate limiting** for API protection
- **Request logging** with Winston
- **Input validation** with express-validator
- **Error handling** with detailed error responses
- **Health monitoring** endpoints
- **CORS configuration** for cross-origin requests
- **Security headers** with Helmet

## API Endpoints Overview

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/verify-email` - Verify email address
- `POST /api/auth/resend-verification` - Resend email verification
- `POST /api/auth/forgot-password` - Send password reset email
- `POST /api/auth/reset-password/:token` - Reset password with token
- `POST /api/auth/change-password` - Change password (authenticated)
- `POST /api/auth/refresh-token` - Refresh access token
- `POST /api/auth/google` - Google OAuth authentication
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/logout` - Logout user

### Property Endpoints
- `GET /api/properties` - Get all properties (with filters)
- `GET /api/properties/host` - Get host's properties
- `GET /api/properties/:id` - Get single property
- `POST /api/properties` - Create new property (host only)
- `PUT /api/properties/:id` - Update property (host only)
- `DELETE /api/properties/:id` - Delete property (host only)

### Booking Endpoints
- `GET /api/bookings` - Get user bookings
- `GET /api/bookings/:id` - Get single booking
- `POST /api/bookings` - Create new booking
- `PUT /api/bookings/:id/status` - Update booking status
- `PUT /api/bookings/:id/cancel` - Cancel booking

### User Management Endpoints
- `GET /api/users/profile/:id` - Get user profile (public)
- `PUT /api/users/profile` - Update current user profile (authenticated)
- `GET /api/users/stats` - Get current user statistics (authenticated)
- `DELETE /api/users/account` - Delete user account (authenticated)

### System Endpoints
- `GET /api/health` - API health check

## Authentication

### Bearer Token Authentication
```javascript
// Include in request headers
{
  "Authorization": "Bearer YOUR_ACCESS_TOKEN_HERE"
}
```

### Cookie-based Refresh Tokens
Refresh tokens are automatically managed via secure httpOnly cookies.

## Data Schemas

### User Schema
```json
{
  "_id": "64a1b2c3d4e5f6789012345",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "user",
  "isEmailVerified": true,
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

### Property Schema
```json
{
  "_id": "64a1b2c3d4e5f6789012345",
  "title": "Beautiful Beach House",
  "description": "A stunning beachfront property with amazing ocean views",
  "address": {
    "street": "123 Ocean Drive",
    "city": "Miami Beach",
    "state": "Florida",
    "country": "USA",
    "zipCode": "33139"
  },
  "pricePerNight": 299.99,
  "images": ["https://cloudinary.com/image1.jpg"],
  "amenities": ["WiFi", "Pool", "Beach Access", "Kitchen"],
  "capacity": {
    "guests": 6,
    "bedrooms": 3,
    "bathrooms": 2
  },
  "host": "64a1b2c3d4e5f6789012345",
  "isActive": true,
  "rating": 4.8,
  "reviewCount": 42,
  "createdAt": "2023-01-01T00:00:00.000Z"
}
```

### Booking Schema
```json
{
  "_id": "64a1b2c3d4e5f6789012345",
  "property": "64a1b2c3d4e5f6789012345",
  "user": "64a1b2c3d4e5f6789012345",
  "checkIn": "2023-07-15",
  "checkOut": "2023-07-20",
  "guests": 4,
  "totalAmount": 1499.95,
  "status": "confirmed",
  "paymentStatus": "paid",
  "specialRequests": "Late check-in requested",
  "createdAt": "2023-01-01T00:00:00.000Z"
}
```

## Rate Limiting

The API implements several rate limiting strategies:

- **General requests**: 1000 requests per 15 minutes per IP
- **Authentication endpoints**: 50 requests per 15 minutes per IP
- **Strict auth endpoints** (forgot password): 5 requests per 15 minutes per IP
- **Property creation**: 10 properties per hour per user
- **Booking creation**: 20 bookings per hour per user

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

## Getting Started

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Access the API documentation**:
   Open your browser and navigate to `http://localhost:5000/api-docs/`

3. **Test API endpoints**:
   Use the interactive Swagger UI to test endpoints directly from the browser.

4. **Authentication**:
   - Register a new user via `/api/auth/register`
   - Login to get access token via `/api/auth/login`
   - Use the "Authorize" button in Swagger UI to set your Bearer token

## Development

### Adding New Endpoints

When adding new API endpoints, make sure to:

1. **Add OpenAPI documentation** using JSDoc comments:
   ```javascript
   /**
    * @swagger
    * /api/your-endpoint:
    *   post:
    *     tags: [YourTag]
    *     summary: Brief description
    *     description: Detailed description
    *     ...
    */
   ```

2. **Update schemas** in `src/config/swagger.ts` if needed

3. **Test the documentation** by viewing it in Swagger UI

### Configuration

The Swagger configuration is located in `src/config/swagger.ts`. You can customize:

- API information (title, description, version)
- Server URLs
- Security schemes
- Global schemas
- Tags and groupings

## Production Deployment

For production deployment:

1. Set the `API_BASE_URL` environment variable
2. Update server URLs in `swagger.ts`
3. Ensure proper CORS configuration
4. Enable HTTPS for security

## Support

For API support and questions:
- **Development Team**: dev@stayhub.com
- **Documentation Issues**: Create an issue in the project repository