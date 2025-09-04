# StayHub Backend API

A complete Airbnb-like property booking platform backend built with Node.js, Express, TypeScript, and MongoDB.

## 🚀 Features

### Authentication & Authorization
- Google OAuth integration
- JWT-based authentication
- Role-based access control (Host/Renter)
- Secure user sessions

### Property Management
- CRUD operations for properties
- Image upload support (Cloudinary integration)
- Advanced search and filtering
- Geolocation support
- Property availability tracking

### Booking System
- Create, view, update booking requests
- Automatic conflict detection (prevent double bookings)
- Booking status management (pending, confirmed, canceled, completed)
- Price calculation
- Special requests handling

### User Management
- User profiles with statistics
- Host and renter dashboards
- Account management
- Profile updates

## 🛠 Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** Passport.js (Google OAuth) + JWT
- **File Upload:** Multer + Cloudinary
- **Validation:** Express Validator
- **Security:** Helmet, CORS
- **Logging:** Morgan

## 📁 Project Structure

```
src/
├── controllers/          # Request handlers
│   ├── authController.ts
│   ├── propertyController.ts
│   ├── bookingController.ts
│   └── userController.ts
├── models/              # Database schemas
│   ├── User.ts
│   ├── Property.ts
│   └── Booking.ts
├── routes/              # API routes
│   ├── auth.ts
│   ├── properties.ts
│   ├── bookings.ts
│   └── users.ts
├── middleware/          # Custom middleware
│   ├── auth.ts          # Authentication & authorization
│   ├── validation.ts    # Input validation
│   └── upload.ts        # File upload handling
├── config/              # Configuration files
│   ├── database.ts      # MongoDB connection
│   ├── passport.ts      # Passport strategies
│   └── cloudinary.ts    # Cloudinary config
├── utils/               # Utility functions
│   ├── jwt.ts          # JWT helpers
│   └── validators.ts   # Validation helpers
├── types/               # TypeScript type definitions
│   └── express.d.ts    # Express type extensions
└── app.ts              # Application entry point
```

## 🔧 Setup & Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd stayhub-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your configuration:
   - MongoDB connection string
   - JWT secrets
   - Google OAuth credentials
   - Cloudinary credentials

4. **Start the development server**
   ```bash
   npm run dev
   ```

## 🔐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `JWT_EXPIRE` | JWT expiration time | No (default: 7d) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Yes |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Yes |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Yes |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Yes |
| `CLIENT_URL` | Frontend application URL | No (default: http://localhost:3000) |
| `PORT` | Server port | No (default: 5000) |

## 📚 API Endpoints

### Authentication
- `POST /api/auth/google` - Google OAuth login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/logout` - Logout

### Properties
- `GET /api/properties` - Get all properties (with filters)
- `GET /api/properties/:id` - Get single property
- `POST /api/properties` - Create property (Host only)
- `PUT /api/properties/:id` - Update property (Host only)
- `DELETE /api/properties/:id` - Delete property (Host only)
- `GET /api/properties/host` - Get host's properties

### Bookings
- `GET /api/bookings` - Get user bookings
- `GET /api/bookings/:id` - Get single booking
- `POST /api/bookings` - Create booking (Renter only)
- `PUT /api/bookings/:id/status` - Update booking status
- `PUT /api/bookings/:id/cancel` - Cancel booking

### Users
- `GET /api/users/profile/:id` - Get user profile (public)
- `PUT /api/users/profile` - Update current user profile
- `GET /api/users/stats` - Get user statistics
- `DELETE /api/users/account` - Delete user account

## 🔍 Key Features Implementation

### Search & Filtering
Properties can be filtered by:
- Location (city, country)
- Price range
- Property type
- Number of bedrooms
- Maximum guests
- Full-text search

### Booking Conflict Prevention
- Automatic detection of overlapping bookings
- Real-time availability checking
- Booking status management

### Security Features
- Input validation and sanitization
- Authentication required for sensitive operations
- Role-based access control
- Rate limiting ready (configurable)

### File Upload
- Multer middleware for handling uploads
- Cloudinary integration for image storage
- Image optimization and transformation
- Support for multiple file uploads

## 🧪 Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run typecheck` - Type checking without build
- `npm run clean` - Remove build directory

### 🌱 Database Seeding Scripts

- `npm run seed` - Populate database with comprehensive sample data (10 users, 8 properties, 15 bookings)
- `npm run seed:quick` - Quick seeding with minimal test data
- `npm run seed:verify` - Verify and display database contents
- `npm run seed:prod` - Production seeding (requires built project)

## 🚀 Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Set environment variables** in your deployment platform

3. **Start the server**
   ```bash
   npm start
   ```

## 📝 API Response Format

All API responses follow this consistent format:

```json
{
  "success": boolean,
  "message": "string",
  "data": object, // Only on success
  "error": "string", // Only on error
  "errors": array // Validation errors
}
```

## 🔒 Authentication Flow

1. Frontend initiates Google OAuth
2. User grants permissions
3. Backend receives user data from Google
4. System creates/updates user record
5. JWT token generated and returned
6. Token used for subsequent API calls

## 📋 Database Schema

### User Model
- Google OAuth integration
- Role-based system (host/renter)
- Profile information

### Property Model
- Complete property details
- Location with coordinates
- Image management
- Host relationship

### Booking Model
- Date validation
- Status tracking
- Price calculation
- Conflict prevention

## 🛡 Security Considerations

- Environment variables for sensitive data
- JWT token expiration
- Input validation on all endpoints
- File upload restrictions
- CORS configuration
- Rate limiting (configurable)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.