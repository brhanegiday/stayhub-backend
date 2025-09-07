import { Request, Response } from 'express';
import { googleAuth, getMe, updateProfile, logout } from '../../src/controllers/authController';
import User from '../../src/models/User';
import jwt from 'jsonwebtoken';

// Mock JWT
jest.mock('jsonwebtoken');
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('Auth Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn().mockReturnThis();

    mockRes = {
      status: statusMock,
      json: jsonMock,
    };

    // Mock environment variables
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRE = '7d';
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockJwt.sign.mockClear();
  });

  describe('googleAuth', () => {
    const validAuthData = {
      googleId: 'google123',
      email: 'test@example.com',
      name: 'John Doe',
      avatar: 'https://example.com/avatar.jpg',
      role: 'renter',
    };

    beforeEach(() => {
      mockReq = {
        body: validAuthData,
      };
      mockJwt.sign.mockReturnValue('mock-jwt-token' as any);
    });

    it('should register a new user successfully', async () => {
      // Mock User.findOne to return null (user doesn't exist)
      jest.spyOn(User, 'findOne').mockResolvedValue(null);

      // Mock User constructor and save
      const mockUser = {
        _id: 'user123',
        ...validAuthData,
        isVerified: false,
        save: jest.fn().mockResolvedValue({
          _id: 'user123',
          ...validAuthData,
          isVerified: false,
        }),
      };
      jest.spyOn(User.prototype, 'save').mockResolvedValue(mockUser as any);

      await googleAuth(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'User registered successfully',
        data: {
          user: expect.objectContaining({
            email: validAuthData.email,
            name: validAuthData.name,
            role: validAuthData.role,
            isVerified: false,
          }),
          token: 'mock-jwt-token',
        },
      });
    });

    it('should login existing user successfully', async () => {
      const existingUser = {
        _id: 'user123',
        ...validAuthData,
        isVerified: true,
      };

      // Mock User.findOne to return existing user
      jest.spyOn(User, 'findOne').mockResolvedValue(existingUser as any);

      await googleAuth(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Login successful',
        data: {
          user: expect.objectContaining({
            id: 'user123',
            email: validAuthData.email,
            name: validAuthData.name,
            role: validAuthData.role,
          }),
          token: 'mock-jwt-token',
        },
      });
    });

    it('should fail with missing required fields', async () => {
      mockReq.body = { email: 'test@example.com' }; // Missing other fields

      await googleAuth(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Missing required fields',
      });
    });

    it('should fail with invalid role', async () => {
      mockReq.body = { ...validAuthData, role: 'invalid' };

      await googleAuth(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid role. Must be either "renter" or "host"',
      });
    });

    it('should handle database errors during registration', async () => {
      jest.spyOn(User, 'findOne').mockResolvedValue(null);
      jest.spyOn(User.prototype, 'save').mockRejectedValue(new Error('Database error'));

      await googleAuth(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication failed',
        error: 'Database error',
      });
    });

    it('should handle errors during user lookup', async () => {
      jest.spyOn(User, 'findOne').mockRejectedValue(new Error('Database connection error'));

      await googleAuth(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication failed',
        error: 'Database connection error',
      });
    });
  });

  describe('getMe', () => {
    const mockUser = {
      _id: 'user123',
      email: 'test@example.com',
      name: 'John Doe',
      avatar: 'https://example.com/avatar.jpg',
      role: 'renter',
      phone: '+1234567890',
      bio: 'Test bio',
      isVerified: true,
    };

    beforeEach(() => {
      mockReq = {
        user: mockUser as any,
      };
    });

    it('should return user data successfully', async () => {
      await getMe(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          user: {
            id: mockUser._id,
            email: mockUser.email,
            name: mockUser.name,
            avatar: mockUser.avatar,
            role: mockUser.role,
            phone: mockUser.phone,
            bio: mockUser.bio,
            isVerified: mockUser.isVerified,
          },
        },
      });
    });

    it('should fail when user is not authenticated', async () => {
      mockReq.user = undefined;

      await getMe(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Not authenticated',
      });
    });

    it('should handle unexpected errors', async () => {
      mockReq.user = null as any;

      await getMe(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Not authenticated',
      });
    });
  });

  describe('updateProfile', () => {
    const mockUser = {
      _id: 'user123',
      email: 'test@example.com',
      name: 'John Doe',
      avatar: 'https://example.com/avatar.jpg',
      role: 'renter',
      phone: '+1234567890',
      bio: 'Test bio',
      isVerified: true,
    };

    const updateData = {
      phone: '+9876543210',
      bio: 'Updated bio',
    };

    beforeEach(() => {
      mockReq = {
        user: mockUser as any,
        body: updateData,
      };
    });

    it('should update user profile successfully', async () => {
      const updatedUser = { ...mockUser, ...updateData };
      jest.spyOn(User, 'findByIdAndUpdate').mockResolvedValue(updatedUser as any);

      await updateProfile(mockReq as Request, mockRes as Response);

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUser._id,
        updateData,
        { new: true, runValidators: true }
      );
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: expect.objectContaining({
            id: mockUser._id,
            phone: updateData.phone,
            bio: updateData.bio,
          }),
        },
      });
    });

    it('should fail when user is not authenticated', async () => {
      mockReq.user = undefined;

      await updateProfile(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Not authenticated',
      });
    });

    it('should handle database errors', async () => {
      jest.spyOn(User, 'findByIdAndUpdate').mockRejectedValue(new Error('Database error'));

      await updateProfile(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to update profile',
        error: 'Database error',
      });
    });
  });

  describe('logout', () => {
    beforeEach(() => {
      mockReq = {};
    });

    it('should logout successfully', async () => {
      await logout(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Logged out successfully',
      });
    });
  });
});