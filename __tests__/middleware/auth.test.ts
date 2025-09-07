import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, requireRole } from '../../src/middleware/auth';
import User from '../../src/models/User';

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../../src/models/User');

const mockJwt = jwt as jest.Mocked<typeof jwt>;
const MockUser = User as jest.Mocked<typeof User>;

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
    };

    it('should authenticate user with valid token', async () => {
      mockReq.headers = {
        authorization: 'Bearer valid.jwt.token',
      };

      mockJwt.verify.mockReturnValue({ userId: 'user123' } as any);
      MockUser.findById.mockResolvedValue(mockUser as any);

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockJwt.verify).toHaveBeenCalledWith('valid.jwt.token', 'test-secret');
      expect(MockUser.findById).toHaveBeenCalledWith('user123');
      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should fail when authorization header is missing', async () => {
      mockReq.headers = {};

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Access token required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should fail when authorization header does not start with Bearer', async () => {
      mockReq.headers = {
        authorization: 'Invalid token.format',
      };

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Access token required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should fail when token is empty after Bearer', async () => {
      mockReq.headers = {
        authorization: 'Bearer ',
      };

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Access token required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should fail when JWT verification fails', async () => {
      mockReq.headers = {
        authorization: 'Bearer invalid.jwt.token',
      };

      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid access token',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should fail when user is not found', async () => {
      mockReq.headers = {
        authorization: 'Bearer valid.jwt.token',
      };

      mockJwt.verify.mockReturnValue({ userId: 'nonexistent' } as any);
      MockUser.findById.mockResolvedValue(null);

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid access token',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockReq.headers = {
        authorization: 'Bearer valid.jwt.token',
      };

      mockJwt.verify.mockReturnValue({ userId: 'user123' } as any);
      MockUser.findById.mockRejectedValue(new Error('Database error'));

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid access token',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle malformed authorization header', async () => {
      mockReq.headers = {
        authorization: 'Bearer',
      };

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Access token required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    const mockRenter = {
      _id: 'user123',
      role: 'renter',
    };

    const mockHost = {
      _id: 'user456',
      role: 'host',
    };

    beforeEach(() => {
      mockReq = {};
    });

    it('should allow user with required role', () => {
      mockReq.user = mockHost as any;
      const middleware = requireRole(['host']);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should allow user with one of multiple required roles', () => {
      mockReq.user = mockRenter as any;
      const middleware = requireRole(['renter', 'host']);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should deny user without required role', () => {
      mockReq.user = mockRenter as any;
      const middleware = requireRole(['host']);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient permissions',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny when user is not authenticated', () => {
      mockReq.user = undefined;
      const middleware = requireRole(['host']);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle empty roles array', () => {
      mockReq.user = mockRenter as any;
      const middleware = requireRole([]);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient permissions',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should be case sensitive for roles', () => {
      mockReq.user = { ...mockHost, role: 'HOST' } as any;
      const middleware = requireRole(['host']);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient permissions',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});