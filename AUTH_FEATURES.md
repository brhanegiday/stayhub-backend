# Enhanced Authentication System - StayHub Backend

## Overview
The authentication system has been completely enhanced with comprehensive features including forms-based signup/signin, Google OAuth, password management, and advanced security measures.

## Key Features Implemented

### 🔐 Authentication Methods
- **Email/Password Registration & Login**: Complete forms-based authentication
- **Google OAuth Integration**: Seamless Google sign-in/signup
- **Email Verification**: Required for local accounts with token-based verification
- **Dual Provider Support**: Users can use either local or Google authentication

### 🛡️ Security Features
- **Password Hashing**: BCrypt with salt rounds (cost: 12)
- **Account Lockout**: Progressive lockout after failed login attempts (5 attempts, 2-hour lock)
- **JWT Token Security**:
  - Short-lived access tokens (15 minutes)
  - Long-lived refresh tokens (30 days)
  - Token rotation on refresh
  - Secure token storage with httpOnly cookies
- **Rate Limiting**:
  - General auth endpoints: 10 attempts per 15 minutes
  - Sensitive operations: 3 attempts per 15 minutes
- **Password Requirements**: Strong password validation with complexity rules

### 📧 Email Features
- **Verification Emails**: HTML templated verification emails
- **Password Reset**: Secure token-based password reset
- **Change Notifications**: Email alerts for password changes
- **Token Expiry**: 10-minute expiry for security tokens

### 🔄 Token Management
- **Access Token**: 15-minute short-lived tokens for API access
- **Refresh Token**: 30-day tokens for seamless authentication renewal
- **Token Blacklisting**: Secure logout with token cleanup
- **Cookie Support**: Optional httpOnly cookie storage for refresh tokens

## API Endpoints

### Authentication Routes (`/api/auth/`)

#### 📝 Registration & Login
```
POST /register          - Register with email/password
POST /login            - Login with email/password
POST /google           - Google OAuth authentication
POST /refresh-token    - Refresh access tokens
POST /logout           - Secure logout
```

#### ✉️ Email Verification
```
GET  /verify-email     - Verify email with token
POST /resend-verification - Resend verification email
```

#### 🔑 Password Management
```
POST /forgot-password  - Send password reset email
POST /reset-password/:token - Reset password with token
POST /change-password  - Change password (authenticated)
```

#### 👤 User Management
```
GET  /me               - Get current user profile
PUT  /profile          - Update user profile
```

## Security Middleware

### 🔒 Authentication Middleware
- **`authenticate`**: Validates JWT tokens and verifies user status
- **`optionalAuth`**: Optional authentication for public endpoints
- **`requireRole`**: Role-based access control (renter/host)
- **`requireVerifiedEmail`**: Ensures email verification

### 🚫 Rate Limiting
- **`authLimiter`**: Standard rate limiting for auth endpoints
- **`strictAuthLimiter`**: Strict limiting for sensitive operations (forgot password)

## Database Schema Enhancements

### User Model Extensions
```typescript
interface IUser {
  // Authentication
  googleId?: string;              // Google OAuth ID
  email: string;                  // Email address
  password?: string;              // Hashed password (local auth)
  authProvider: 'local' | 'google'; // Authentication provider

  // Verification
  isVerified: boolean;            // Email verification status
  emailVerificationToken?: string; // Verification token hash
  emailVerificationExpires?: Date; // Token expiry

  // Password Reset
  passwordResetToken?: string;    // Reset token hash
  passwordResetExpires?: Date;    // Reset token expiry

  // Security
  loginAttempts?: number;         // Failed login count
  lockUntil?: Date;              // Account lock expiry
  refreshToken?: string;          // Current refresh token hash
  refreshTokenExpires?: Date;     // Refresh token expiry
  lastLogin?: Date;              // Last login timestamp

  // Two-Factor (Future)
  twoFactorEnabled: boolean;      // 2FA status
  twoFactorSecret?: string;       // 2FA secret
}
```

## Environment Variables Required

```env
# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=15m
JWT_REFRESH_SECRET=your_refresh_token_secret_here
JWT_REFRESH_EXPIRE=30d

# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USERNAME=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
FROM_NAME=StayHub
FROM_EMAIL=noreply@stayhub.com

# Google OAuth (existing)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

## Usage Examples

### Registration Flow
```javascript
// 1. Register user
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "role": "renter"
}

// 2. User receives verification email
// 3. User clicks verification link
GET /api/auth/verify-email?token=verification_token

// 4. User can now login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "rememberMe": true
}
```

### Password Reset Flow
```javascript
// 1. Request password reset
POST /api/auth/forgot-password
{
  "email": "user@example.com"
}

// 2. User receives reset email
// 3. User resets password
POST /api/auth/reset-password/reset_token
{
  "password": "NewSecurePass123!"
}
```

### Token Refresh Flow
```javascript
// When access token expires
POST /api/auth/refresh-token
{
  "refreshToken": "refresh_token_here"
}
// Or token can be read from httpOnly cookie
```

## Security Considerations

### ✅ Implemented Security Measures
- **Password Complexity**: Minimum 8 chars with uppercase, lowercase, number, special char
- **Account Lockout**: Progressive lockout after failed attempts
- **Token Rotation**: New tokens issued on refresh
- **Secure Cookies**: httpOnly, secure, sameSite attributes
- **Input Validation**: Comprehensive validation with express-validator
- **Rate Limiting**: IP-based rate limiting for all auth endpoints
- **Email Verification**: Mandatory for local accounts
- **Token Expiry**: Short-lived access tokens for minimal exposure

### 🔄 Future Enhancements (Ready for Implementation)
- **Two-Factor Authentication**: Database schema already prepared
- **Social Login Extensions**: Easy to add Facebook, Twitter, etc.
- **Password History**: Prevent password reuse
- **Device Management**: Track and manage user devices
- **Audit Logging**: Enhanced security event logging

## Error Handling

All authentication endpoints return structured error responses:
```javascript
{
  "success": false,
  "message": "Human readable error message",
  "code": "ERROR_CODE",       // Machine readable code
  "errors": [...validationErrors] // Validation details if applicable
}
```

### Common Error Codes
- `TOKEN_EXPIRED`: Access token has expired
- `TOKEN_MISSING`: No authentication token provided
- `EMAIL_NOT_VERIFIED`: Account email not verified
- `ACCOUNT_LOCKED`: Too many failed login attempts
- `INVALID_CREDENTIALS`: Wrong email/password combination

