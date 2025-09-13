import { Request, Response, NextFunction } from 'express';
import { authenticate, requireRole, optionalAuth, requireVerifiedEmail } from '../../src/middleware/auth';
import User from '../../src/models/User';
import * as jwtUtils from '../../src/utils/jwt';

// Mock dependencies
jest.mock('../../src/models/User');
jest.mock('../../src/utils/jwt');

const MockUser = User as jest.Mocked<typeof User>;
const mockJwtUtils = jwtUtils as jest.Mocked<typeof jwtUtils>;

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn().mockReturnThis();
    mockNext = jest.fn();

    mockRes = {
      status: statusMock,
      json: jsonMock,
    };

    mockReq = {
      headers: {},
    };

    process.env.JWT_SECRET = 'test-secret';
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  describe('authenticate', () => {
    const mockUser = {
      _id: 'user123',
      email: 'test@example.com',
      name: 'John Doe',
      role: 'renter',
      authProvider: 'local',
      isVerified: true,
    };

    it('should authenticate user with valid token', async () => {
      mockReq.headers = {
        authorization: 'Bearer valid.jwt.token',
      };

      mockJwtUtils.extractTokenFromHeader.mockReturnValue('valid.jwt.token');
      mockJwtUtils.verifyAccessToken.mockReturnValue({ userId: 'user123' } as any);

      // Mock User.findById with select method
      const mockSelect = jest.fn().mockResolvedValue(mockUser);
      MockUser.findById = jest.fn().mockReturnValue({ select: mockSelect } as any);

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockJwtUtils.extractTokenFromHeader).toHaveBeenCalledWith('Bearer valid.jwt.token');
      expect(mockJwtUtils.verifyAccessToken).toHaveBeenCalledWith('valid.jwt.token');
      expect(MockUser.findById).toHaveBeenCalledWith('user123');
      expect(mockSelect).toHaveBeenCalledWith('+isVerified +authProvider +lastLogin');
      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should fail when authorization header is missing', async () => {
      mockJwtUtils.extractTokenFromHeader.mockReturnValue(null);

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Access token required',
        code: 'TOKEN_MISSING',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should fail when authorization header does not start with Bearer', async () => {
      mockReq.headers = {
        authorization: 'Invalid token',
      };

      mockJwtUtils.extractTokenFromHeader.mockReturnValue(null);

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Access token required',
        code: 'TOKEN_MISSING',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should fail when token is empty after Bearer', async () => {
      mockReq.headers = {
        authorization: 'Bearer ',
      };

      mockJwtUtils.extractTokenFromHeader.mockReturnValue(null);

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Access token required',
        code: 'TOKEN_MISSING',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should fail when JWT verification fails', async () => {
      mockReq.headers = {
        authorization: 'Bearer invalid.jwt.token',
      };

      mockJwtUtils.extractTokenFromHeader.mockReturnValue('invalid.jwt.token');
      mockJwtUtils.verifyAccessToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid access token',
        code: 'TOKEN_INVALID',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle token expired error', async () => {
      mockReq.headers = {
        authorization: 'Bearer expired.jwt.token',
      };

      mockJwtUtils.extractTokenFromHeader.mockReturnValue('expired.jwt.token');
      const expiredError = new Error('Token expired');
      expiredError.name = 'TokenExpiredError';
      mockJwtUtils.verifyAccessToken.mockImplementation(() => {
        throw expiredError;
      });

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Access token expired',
        code: 'TOKEN_EXPIRED',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle malformed token error', async () => {
      mockReq.headers = {
        authorization: 'Bearer malformed.jwt.token',
      };

      mockJwtUtils.extractTokenFromHeader.mockReturnValue('malformed.jwt.token');
      const malformedError = new Error('Malformed token');
      malformedError.name = 'JsonWebTokenError';
      mockJwtUtils.verifyAccessToken.mockImplementation(() => {
        throw malformedError;
      });

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Malformed access token',
        code: 'TOKEN_MALFORMED',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should fail when user is not found', async () => {
      mockReq.headers = {
        authorization: 'Bearer valid.jwt.token',
      };

      mockJwtUtils.extractTokenFromHeader.mockReturnValue('valid.jwt.token');
      mockJwtUtils.verifyAccessToken.mockReturnValue({ userId: 'user123' } as any);

      const mockSelect = jest.fn().mockResolvedValue(null);
      MockUser.findById = jest.fn().mockReturnValue({ select: mockSelect } as any);

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should fail when local user email is not verified', async () => {
      mockReq.headers = {
        authorization: 'Bearer valid.jwt.token',
      };

      const unverifiedUser = {
        ...mockUser,
        authProvider: 'local',
        isVerified: false,
      };

      mockJwtUtils.extractTokenFromHeader.mockReturnValue('valid.jwt.token');
      mockJwtUtils.verifyAccessToken.mockReturnValue({ userId: 'user123' } as any);

      const mockSelect = jest.fn().mockResolvedValue(unverifiedUser);
      MockUser.findById = jest.fn().mockReturnValue({ select: mockSelect } as any);

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Please verify your email address',
        code: 'EMAIL_NOT_VERIFIED',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow Google user without email verification', async () => {
      mockReq.headers = {
        authorization: 'Bearer valid.jwt.token',
      };

      const googleUser = {
        ...mockUser,
        authProvider: 'google',
        isVerified: false, // Google users don't need email verification
      };

      mockJwtUtils.extractTokenFromHeader.mockReturnValue('valid.jwt.token');
      mockJwtUtils.verifyAccessToken.mockReturnValue({ userId: 'user123' } as any);

      const mockSelect = jest.fn().mockResolvedValue(googleUser);
      MockUser.findById = jest.fn().mockReturnValue({ select: mockSelect } as any);

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual(googleUser);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockReq.headers = {
        authorization: 'Bearer valid.jwt.token',
      };

      mockJwtUtils.extractTokenFromHeader.mockReturnValue('valid.jwt.token');
      mockJwtUtils.verifyAccessToken.mockReturnValue({ userId: 'user123' } as any);

      const mockSelect = jest.fn().mockRejectedValue(new Error('Database error'));
      MockUser.findById = jest.fn().mockReturnValue({ select: mockSelect } as any);

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication failed',
        code: 'AUTH_ERROR',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    const mockUser = {
      _id: 'user123',
      email: 'test@example.com',
      name: 'John Doe',
      role: 'renter',
    };

    it('should allow user with correct role', () => {
      mockReq.user = mockUser;
      const roleMiddleware = requireRole(['renter', 'host']);

      roleMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should fail when user role is not allowed', () => {
      mockReq.user = mockUser;
      const roleMiddleware = requireRole(['host']); // Only host allowed

      roleMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should fail when user is not authenticated', () => {
      mockReq.user = undefined;
      const roleMiddleware = requireRole(['renter']);

      roleMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    const mockUser = {
      _id: 'user123',
      email: 'test@example.com',
      name: 'John Doe',
      role: 'renter',
      authProvider: 'local',
      isVerified: true,
    };

    it('should set user when valid token provided', async () => {
      mockReq.headers = {
        authorization: 'Bearer valid.jwt.token',
      };

      mockJwtUtils.extractTokenFromHeader.mockReturnValue('valid.jwt.token');
      mockJwtUtils.verifyAccessToken.mockReturnValue({ userId: 'user123' } as any);

      const mockSelect = jest.fn().mockResolvedValue(mockUser);
      MockUser.findById = jest.fn().mockReturnValue({ select: mockSelect } as any);

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set user to undefined when no token provided', async () => {
      mockJwtUtils.extractTokenFromHeader.mockReturnValue(null);

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set user to undefined when token is invalid', async () => {
      mockReq.headers = {
        authorization: 'Bearer invalid.jwt.token',
      };

      mockJwtUtils.extractTokenFromHeader.mockReturnValue('invalid.jwt.token');
      mockJwtUtils.verifyAccessToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockReq.headers = {
        authorization: 'Bearer valid.jwt.token',
      };

      mockJwtUtils.extractTokenFromHeader.mockReturnValue('valid.jwt.token');
      mockJwtUtils.verifyAccessToken.mockReturnValue({ userId: 'user123' } as any);

      const mockSelect = jest.fn().mockRejectedValue(new Error('Database error'));
      MockUser.findById = jest.fn().mockReturnValue({ select: mockSelect } as any);

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireVerifiedEmail', () => {
    it('should allow verified local user', () => {
      mockReq.user = {
        _id: 'user123',
        authProvider: 'local',
        isVerified: true,
      };

      requireVerifiedEmail(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow Google user regardless of verification status', () => {
      mockReq.user = {
        _id: 'user123',
        authProvider: 'google',
        isVerified: false,
      };

      requireVerifiedEmail(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should fail for unverified local user', () => {
      mockReq.user = {
        _id: 'user123',
        authProvider: 'local',
        isVerified: false,
      };

      requireVerifiedEmail(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Please verify your email address',
        code: 'EMAIL_NOT_VERIFIED',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should fail when user is not authenticated', () => {
      mockReq.user = undefined;

      requireVerifiedEmail(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});