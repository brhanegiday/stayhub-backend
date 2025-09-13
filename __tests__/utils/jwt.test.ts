import jwt from 'jsonwebtoken';
import {
  generateToken,
  generateAccessToken,
  verifyToken,
  verifyAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  extractTokenFromHeader,
  generateTokenPair,
  TokenPayload,
  RefreshTokenPayload,
} from '../../src/utils/jwt';

// Mock jwt
jest.mock('jsonwebtoken');
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('JWT Utils', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRE = '15m';
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

  describe('generateToken / generateAccessToken', () => {
    const mockPayload: TokenPayload = {
      userId: 'user123',
      email: 'test@example.com',
      role: 'renter',
    };

    it('should generate access token with correct parameters', () => {
      const mockToken = 'mock.jwt.token';
      mockJwt.sign.mockReturnValue(mockToken as any);

      const result = generateAccessToken(mockPayload);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        mockPayload,
        'test-secret',
        {
          expiresIn: '15m',
          issuer: 'stayhub',
          audience: 'stayhub-users'
        }
      );
      expect(result).toBe(mockToken);
    });

    it('should use backward compatible generateToken', () => {
      const mockToken = 'mock.jwt.token';
      mockJwt.sign.mockReturnValue(mockToken as any);

      const result = generateToken(mockPayload);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        mockPayload,
        'test-secret',
        {
          expiresIn: '15m',
          issuer: 'stayhub',
          audience: 'stayhub-users'
        }
      );
      expect(result).toBe(mockToken);
    });

    it('should use default expiration when JWT_EXPIRE is not set', () => {
      delete process.env.JWT_EXPIRE;
      const mockToken = 'mock.jwt.token';
      mockJwt.sign.mockReturnValue(mockToken as any);

      generateAccessToken(mockPayload);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        mockPayload,
        'test-secret',
        {
          expiresIn: '15m',
          issuer: 'stayhub',
          audience: 'stayhub-users'
        }
      );
    });

    it('should throw error when JWT_SECRET is not set', () => {
      delete process.env.JWT_SECRET;
      mockJwt.sign.mockImplementation(() => {
        throw new Error('JWT_SECRET required');
      });

      expect(() => generateAccessToken(mockPayload)).toThrow();
    });
  });

  describe('verifyToken / verifyAccessToken', () => {
    const mockToken = 'mock.jwt.token';
    const mockPayload: TokenPayload = {
      userId: 'user123',
      email: 'test@example.com',
      role: 'renter',
    };

    it('should verify access token successfully', () => {
      mockJwt.verify.mockReturnValue(mockPayload as any);

      const result = verifyAccessToken(mockToken);

      expect(mockJwt.verify).toHaveBeenCalledWith(
        mockToken,
        'test-secret',
        {
          issuer: 'stayhub',
          audience: 'stayhub-users'
        }
      );
      expect(result).toEqual(mockPayload);
    });

    it('should use backward compatible verifyToken', () => {
      mockJwt.verify.mockReturnValue(mockPayload as any);

      const result = verifyToken(mockToken);

      expect(mockJwt.verify).toHaveBeenCalledWith(
        mockToken,
        'test-secret',
        {
          issuer: 'stayhub',
          audience: 'stayhub-users'
        }
      );
      expect(result).toEqual(mockPayload);
    });

    it('should throw error for invalid token', () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => verifyAccessToken(mockToken)).toThrow('Invalid token');
    });

    it('should throw error when JWT_SECRET is not set', () => {
      delete process.env.JWT_SECRET;

      expect(() => verifyAccessToken(mockToken)).toThrow();
    });
  });

  describe('generateRefreshToken', () => {
    const userId = 'user123';
    const tokenVersion = 0;

    it('should generate refresh token with correct parameters', () => {
      const mockToken = 'mock.refresh.token';
      mockJwt.sign.mockReturnValue(mockToken as any);

      const result = generateRefreshToken(userId, tokenVersion);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        { userId, tokenVersion },
        'refresh-secret',
        {
          expiresIn: '30d',
          issuer: 'stayhub',
          audience: 'stayhub-refresh'
        }
      );
      expect(result).toBe(mockToken);
    });

    it('should use default tokenVersion when not provided', () => {
      const mockToken = 'mock.refresh.token';
      mockJwt.sign.mockReturnValue(mockToken as any);

      generateRefreshToken(userId);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        { userId, tokenVersion: 0 },
        'refresh-secret',
        {
          expiresIn: '30d',
          issuer: 'stayhub',
          audience: 'stayhub-refresh'
        }
      );
    });

    it('should use JWT_SECRET when JWT_REFRESH_SECRET is not set', () => {
      delete process.env.JWT_REFRESH_SECRET;
      const mockToken = 'mock.refresh.token';
      mockJwt.sign.mockReturnValue(mockToken as any);

      generateRefreshToken(userId, tokenVersion);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        { userId, tokenVersion },
        'test-secret',
        {
          expiresIn: '30d',
          issuer: 'stayhub',
          audience: 'stayhub-refresh'
        }
      );
    });

    it('should use default expiration when JWT_REFRESH_EXPIRE is not set', () => {
      delete process.env.JWT_REFRESH_EXPIRE;
      const mockToken = 'mock.refresh.token';
      mockJwt.sign.mockReturnValue(mockToken as any);

      generateRefreshToken(userId, tokenVersion);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        { userId, tokenVersion },
        'refresh-secret',
        {
          expiresIn: '30d',
          issuer: 'stayhub',
          audience: 'stayhub-refresh'
        }
      );
    });
  });

  describe('verifyRefreshToken', () => {
    const mockToken = 'mock.refresh.token';
    const mockPayload: RefreshTokenPayload = {
      userId: 'user123',
      tokenVersion: 0
    };

    it('should verify refresh token successfully', () => {
      mockJwt.verify.mockReturnValue(mockPayload as any);

      const result = verifyRefreshToken(mockToken);

      expect(mockJwt.verify).toHaveBeenCalledWith(
        mockToken,
        'refresh-secret',
        {
          issuer: 'stayhub',
          audience: 'stayhub-refresh'
        }
      );
      expect(result).toEqual(mockPayload);
    });

    it('should use JWT_SECRET when JWT_REFRESH_SECRET is not set', () => {
      delete process.env.JWT_REFRESH_SECRET;
      mockJwt.verify.mockReturnValue(mockPayload as any);

      verifyRefreshToken(mockToken);

      expect(mockJwt.verify).toHaveBeenCalledWith(
        mockToken,
        'test-secret',
        {
          issuer: 'stayhub',
          audience: 'stayhub-refresh'
        }
      );
    });

    it('should throw error for invalid refresh token', () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => verifyRefreshToken(mockToken)).toThrow('Invalid token');
    });
  });

  describe('generateTokenPair', () => {
    const userId = 'user123';
    const email = 'test@example.com';
    const role = 'renter';
    const tokenVersion = 0;

    it('should generate both access and refresh tokens', () => {
      const mockAccessToken = 'mock.access.token';
      const mockRefreshToken = 'mock.refresh.token';
      mockJwt.sign
        .mockReturnValueOnce(mockAccessToken as any)
        .mockReturnValueOnce(mockRefreshToken as any);

      const result = generateTokenPair(userId, email, role, tokenVersion);

      expect(mockJwt.sign).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken
      });
    });

    it('should use default tokenVersion when not provided', () => {
      const mockAccessToken = 'mock.access.token';
      const mockRefreshToken = 'mock.refresh.token';
      mockJwt.sign
        .mockReturnValueOnce(mockAccessToken as any)
        .mockReturnValueOnce(mockRefreshToken as any);

      generateTokenPair(userId, email, role);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        { userId, email, role, tokenVersion: 0 },
        'test-secret',
        {
          expiresIn: '15m',
          issuer: 'stayhub',
          audience: 'stayhub-users'
        }
      );
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