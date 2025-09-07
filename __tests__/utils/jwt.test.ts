import jwt from 'jsonwebtoken';
import {
  generateToken,
  verifyToken,
  generateRefreshToken,
  verifyRefreshToken,
  extractTokenFromHeader,
  TokenPayload,
} from '../../src/utils/jwt';

// Mock jwt
jest.mock('jsonwebtoken');
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('JWT Utils', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRE = '7d';
    process.env.JWT_REFRESH_SECRET = 'refresh-secret';
    process.env.JWT_REFRESH_EXPIRE = '30d';
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    delete process.env.JWT_EXPIRE;
    delete process.env.JWT_REFRESH_SECRET;
    delete process.env.JWT_REFRESH_EXPIRE;
  });

  describe('generateToken', () => {
    const mockPayload: TokenPayload = {
      userId: 'user123',
      email: 'test@example.com',
      role: 'renter',
    };

    it('should generate token with correct parameters', () => {
      const mockToken = 'mock.jwt.token';
      mockJwt.sign.mockReturnValue(mockToken as any);

      const result = generateToken(mockPayload);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        mockPayload,
        'test-secret',
        { expiresIn: '7d' }
      );
      expect(result).toBe(mockToken);
    });

    it('should use default expiration when JWT_EXPIRE is not set', () => {
      delete process.env.JWT_EXPIRE;
      const mockToken = 'mock.jwt.token';
      mockJwt.sign.mockReturnValue(mockToken as any);

      generateToken(mockPayload);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        mockPayload,
        'test-secret',
        { expiresIn: '7d' }
      );
    });

    it('should throw error when JWT_SECRET is not set', () => {
      delete process.env.JWT_SECRET;
      mockJwt.sign.mockImplementation(() => {
        throw new Error('JWT_SECRET required');
      });

      expect(() => generateToken(mockPayload)).toThrow();
    });
  });

  describe('verifyToken', () => {
    const mockToken = 'mock.jwt.token';
    const mockPayload: TokenPayload = {
      userId: 'user123',
      email: 'test@example.com',
      role: 'renter',
    };

    it('should verify token successfully', () => {
      mockJwt.verify.mockReturnValue(mockPayload as any);

      const result = verifyToken(mockToken);

      expect(mockJwt.verify).toHaveBeenCalledWith(mockToken, 'test-secret');
      expect(result).toEqual(mockPayload);
    });

    it('should throw error for invalid token', () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => verifyToken(mockToken)).toThrow('Invalid token');
    });

    it('should throw error when JWT_SECRET is not set', () => {
      delete process.env.JWT_SECRET;

      expect(() => verifyToken(mockToken)).toThrow();
    });
  });

  describe('generateRefreshToken', () => {
    const userId = 'user123';

    it('should generate refresh token with correct parameters', () => {
      const mockToken = 'mock.refresh.token';
      mockJwt.sign.mockReturnValue(mockToken as any);

      const result = generateRefreshToken(userId);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        { userId },
        'refresh-secret',
        { expiresIn: '30d' }
      );
      expect(result).toBe(mockToken);
    });

    it('should use JWT_SECRET when JWT_REFRESH_SECRET is not set', () => {
      delete process.env.JWT_REFRESH_SECRET;
      const mockToken = 'mock.refresh.token';
      mockJwt.sign.mockReturnValue(mockToken as any);

      generateRefreshToken(userId);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        { userId },
        'test-secret',
        { expiresIn: '30d' }
      );
    });

    it('should use default expiration when JWT_REFRESH_EXPIRE is not set', () => {
      delete process.env.JWT_REFRESH_EXPIRE;
      const mockToken = 'mock.refresh.token';
      mockJwt.sign.mockReturnValue(mockToken as any);

      generateRefreshToken(userId);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        { userId },
        'refresh-secret',
        { expiresIn: '30d' }
      );
    });
  });

  describe('verifyRefreshToken', () => {
    const mockToken = 'mock.refresh.token';
    const mockPayload = { userId: 'user123' };

    it('should verify refresh token successfully', () => {
      mockJwt.verify.mockReturnValue(mockPayload as any);

      const result = verifyRefreshToken(mockToken);

      expect(mockJwt.verify).toHaveBeenCalledWith(mockToken, 'refresh-secret');
      expect(result).toEqual(mockPayload);
    });

    it('should use JWT_SECRET when JWT_REFRESH_SECRET is not set', () => {
      delete process.env.JWT_REFRESH_SECRET;
      mockJwt.verify.mockReturnValue(mockPayload as any);

      verifyRefreshToken(mockToken);

      expect(mockJwt.verify).toHaveBeenCalledWith(mockToken, 'test-secret');
    });

    it('should throw error for invalid refresh token', () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => verifyRefreshToken(mockToken)).toThrow('Invalid token');
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Bearer header', () => {
      const authHeader = 'Bearer mock.jwt.token';
      const result = extractTokenFromHeader(authHeader);
      expect(result).toBe('mock.jwt.token');
    });

    it('should return null for header without Bearer prefix', () => {
      const authHeader = 'mock.jwt.token';
      const result = extractTokenFromHeader(authHeader);
      expect(result).toBeNull();
    });

    it('should return null for empty header', () => {
      const result = extractTokenFromHeader('');
      expect(result).toBeNull();
    });

    it('should return null for undefined header', () => {
      const result = extractTokenFromHeader(undefined as any);
      expect(result).toBeNull();
    });

    it('should return null for Bearer header without token', () => {
      const authHeader = 'Bearer ';
      const result = extractTokenFromHeader(authHeader);
      expect(result).toBe('');
    });

    it('should handle Bearer header with multiple spaces', () => {
      const authHeader = 'Bearer  mock.jwt.token';
      const result = extractTokenFromHeader(authHeader);
      expect(result).toBe('mock.jwt.token'); // Should trim extra spaces
    });
  });
});