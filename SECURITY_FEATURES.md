# StayHub Security Features

This document outlines the security enhancements added to the StayHub backend application.

## 🔐 Security Features Implemented

### 1. Structured Logging with Winston

**Location**: `src/utils/logger.ts`

**Features**:
- **Multi-level logging**: error, warn, info, http, debug
- **Multiple transports**: Console and file-based logging
- **Structured logs**: JSON format for production parsing
- **Separate error logs**: `logs/error.log` for error-specific logging
- **Combined logs**: `logs/combined.log` for all application logs
- **Environment-based configuration**: Configurable log levels via `LOG_LEVEL` env var
- **Automatic log directory creation**: Creates `logs/` directory if it doesn't exist

**Enhanced Error Tracking**:
- Request context logging (IP, URL, method, user-agent)
- Authentication failure logging
- Rate limit violation logging
- File upload security violation logging

### 2. Comprehensive Rate Limiting

**Location**: `src/middleware/rateLimiter.ts`

**Rate Limiters Implemented**:

#### General API Limiter
- **Limit**: 100 requests per 15 minutes per IP
- **Scope**: All API endpoints
- **Features**: Standard headers, custom error messages

#### Authentication Limiter
- **Limit**: 5 attempts per 15 minutes per IP
- **Scope**: `/api/auth/google`
- **Features**: Skips successful requests, aggressive protection

#### Property Creation Limiter
- **Limit**: 10 properties per hour per IP
- **Scope**: `POST /api/properties`
- **Purpose**: Prevent spam property listings

#### Booking Limiter
- **Limit**: 20 booking attempts per hour per IP
- **Scope**: `POST /api/bookings`
- **Purpose**: Prevent booking spam/abuse

#### Upload Limiter
- **Limit**: 30 file uploads per 15 minutes per IP
- **Scope**: File upload endpoints
- **Purpose**: Prevent file upload abuse

#### Speed Limiter
- **Feature**: Progressive delay after 50 requests
- **Delay**: 100ms per request (max 2 seconds)
- **Purpose**: Slow down high-frequency requesters

### 3. Advanced File Upload Security

**Location**: `src/middleware/upload.ts`

**Security Features**:

#### File Type Validation
- **MIME type checking**: Validates against allowed image types
- **Magic number verification**: Uses `file-type` to check actual file content
- **Extension validation**: Prevents suspicious extensions (.php, .exe, etc.)
- **Double extension protection**: Prevents files like `image.jpg.php`

#### File Content Security
- **Buffer validation**: Checks for empty or corrupt files
- **Size limits**: 5MB maximum per file, 1MB field size
- **Malicious content detection**: Scans for PHP, script, HTML patterns
- **MIME type matching**: Ensures declared type matches actual type

#### Enhanced Limits
- **File size**: 5MB per file (reduced from 10MB)
- **File count**: 10 files maximum
- **Field limits**: 100 char field names, 20 fields max
- **Minimum size check**: Prevents empty/corrupt file uploads

#### Security Logging
- **Attempt logging**: Logs all security violations with IP tracking
- **Detailed errors**: Specific error messages for different violation types
- **Audit trail**: Complete logging of file upload attempts and results

## 🚀 Implementation Details

### Application Integration

The security features are integrated in `src/app.ts`:

1. **Proxy Trust**: Configured for production reverse proxy scenarios
2. **Global Rate Limiting**: Applied to all routes
3. **Enhanced Request Logging**: Every request logged with context
4. **Structured Error Handling**: Comprehensive error logging with context

### Route-Specific Protection

- **Auth routes**: Enhanced with `authLimiter`
- **Property routes**: Protected with `propertyLimiter` for creation
- **Booking routes**: Protected with `bookingLimiter` for creation
- **All routes**: Protected by general rate limiting and speed limiting

### Environment Configuration

New environment variable added:
```env
LOG_LEVEL=info  # Controls logging verbosity (error, warn, info, http, debug)
```

## 📊 Monitoring and Observability

### Log Files
- `logs/error.log` - Error-specific logs in JSON format
- `logs/combined.log` - All application logs in JSON format
- **Console output** - Colored, formatted logs for development

### Log Content
Each log entry includes:
- Timestamp
- Log level
- Message
- Request context (IP, URL, method, user-agent)
- Stack traces (development mode)

## 🛡️ Security Benefits

1. **DDoS Protection**: Rate limiting prevents abuse
2. **Brute Force Protection**: Authentication rate limiting
3. **File Upload Security**: Prevents malicious file uploads
4. **Audit Trail**: Complete logging for security analysis
5. **Performance Protection**: Speed limiting prevents resource exhaustion
6. **Spam Prevention**: Specific limiters for resource-intensive operations

## 🔧 Configuration

### Production Recommendations
```env
NODE_ENV=production
LOG_LEVEL=warn
```

### Development Configuration
```env
NODE_ENV=development
LOG_LEVEL=debug
```

## 📈 Performance Impact

- **Minimal overhead**: Rate limiting uses in-memory storage
- **Efficient logging**: Asynchronous file writes
- **Optimized file validation**: Fast magic number checking
- **Smart caching**: Proxy trust configuration for production

The security enhancements provide robust protection while maintaining excellent application performance.