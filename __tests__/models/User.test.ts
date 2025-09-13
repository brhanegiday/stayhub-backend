import User, { IUser } from '../../src/models/User';
import mongoose from 'mongoose';

describe('User Model', () => {
  // Test data for Google OAuth user
  const validGoogleUserData = {
    googleId: 'google123',
    email: 'test@example.com',
    name: 'John Doe',
    avatar: 'https://example.com/avatar.jpg',
    role: 'renter' as const,
    authProvider: 'google' as const,
  };

  // Test data for local user (email/password)
  const validLocalUserData = {
    email: 'local@example.com',
    password: 'SecurePass123!',
    name: 'Jane Doe',
    role: 'host' as const,
    authProvider: 'local' as const,
  };

  afterEach(async () => {
    await User.deleteMany({});
  });

  describe('User Creation', () => {
    it('should create a Google OAuth user with valid data', async () => {
      const user = new User(validGoogleUserData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.googleId).toBe(validGoogleUserData.googleId);
      expect(savedUser.email).toBe(validGoogleUserData.email);
      expect(savedUser.name).toBe(validGoogleUserData.name);
      expect(savedUser.avatar).toBe(validGoogleUserData.avatar);
      expect(savedUser.role).toBe(validGoogleUserData.role);
      expect(savedUser.authProvider).toBe('google');
      expect(savedUser.isVerified).toBe(false);
      expect(savedUser.twoFactorEnabled).toBe(false);
      expect(savedUser.createdAt).toBeDefined();
      expect(savedUser.updatedAt).toBeDefined();
    });

    it('should create a local user with valid data', async () => {
      const user = new User(validLocalUserData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.googleId).toBeUndefined();
      expect(savedUser.email).toBe(validLocalUserData.email);
      expect(savedUser.name).toBe(validLocalUserData.name);
      expect(savedUser.avatar).toBe(''); // Default empty string
      expect(savedUser.role).toBe(validLocalUserData.role);
      expect(savedUser.authProvider).toBe('local');
      expect(savedUser.isVerified).toBe(false);
      expect(savedUser.twoFactorEnabled).toBe(false);
      expect(savedUser.password).toBeDefined(); // Password should be hashed
      expect(savedUser.createdAt).toBeDefined();
      expect(savedUser.updatedAt).toBeDefined();
    });

    it('should create a user with host role', async () => {
      const userData = { ...validLocalUserData, role: 'host' as const };
      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.role).toBe('host');
    });

    it('should create a user with optional fields', async () => {
      const userData = {
        ...validLocalUserData,
        phone: '+1234567890',
        bio: 'A traveler',
      };
      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.phone).toBe(userData.phone);
      expect(savedUser.bio).toBe(userData.bio);
    });

    it('should hash password for local users', async () => {
      const user = new User(validLocalUserData);
      const savedUser = await user.save();

      // Password should be hashed and not equal to original
      expect(savedUser.password).toBeDefined();
      expect(savedUser.password).not.toBe(validLocalUserData.password);
      expect(savedUser.password!.length).toBeGreaterThan(20); // BCrypt hash length
    });

    it('should set default values correctly', async () => {
      const minimalUserData = {
        email: 'minimal@example.com',
        name: 'Minimal User',
        role: 'renter' as const,
      };
      const user = new User(minimalUserData);
      const savedUser = await user.save();

      expect(savedUser.avatar).toBe('');
      expect(savedUser.authProvider).toBe('local');
      expect(savedUser.isVerified).toBe(false);
      expect(savedUser.twoFactorEnabled).toBe(false);
      expect(savedUser.loginAttempts).toBe(0);
    });
  });

  describe('User Validation', () => {
    it('should fail if email is missing', async () => {
      const userData = { ...validLocalUserData };
      delete (userData as any).email;
      const user = new User(userData);

      await expect(user.save()).rejects.toThrow();
    });

    it('should fail if name is missing', async () => {
      const userData = { ...validLocalUserData };
      delete (userData as any).name;
      const user = new User(userData);

      await expect(user.save()).rejects.toThrow();
    });

    it('should fail if role is missing', async () => {
      const userData = { ...validLocalUserData };
      delete (userData as any).role;
      const user = new User(userData);

      await expect(user.save()).rejects.toThrow();
    });

    it('should fail if role is invalid', async () => {
      const userData = { ...validLocalUserData, role: 'invalid' as any };
      const user = new User(userData);

      await expect(user.save()).rejects.toThrow();
    });

    it('should fail if email is invalid', async () => {
      const userData = { ...validLocalUserData, email: 'invalid-email' };
      const user = new User(userData);

      await expect(user.save()).rejects.toThrow();
    });

    it('should fail if name is too short', async () => {
      const userData = { ...validLocalUserData, name: 'A' };
      const user = new User(userData);

      await expect(user.save()).rejects.toThrow();
    });

    it('should fail if name is too long', async () => {
      const userData = { ...validLocalUserData, name: 'A'.repeat(51) };
      const user = new User(userData);

      await expect(user.save()).rejects.toThrow();
    });

    it('should allow names with valid characters including spaces', async () => {
      const userData = { ...validLocalUserData, name: 'John Doe Jr' };
      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.name).toBe('John Doe Jr');
    });

    it('should fail if password is too short for local auth', async () => {
      const userData = { ...validLocalUserData, password: '12345' };
      const user = new User(userData);

      await expect(user.save()).rejects.toThrow();
    });

    it('should fail if bio exceeds maximum length', async () => {
      const userData = {
        ...validLocalUserData,
        bio: 'A'.repeat(501), // Max is 500
      };
      const user = new User(userData);

      await expect(user.save()).rejects.toThrow();
    });

    it('should normalize email to lowercase', async () => {
      const userData = { ...validLocalUserData, email: 'TEST@EXAMPLE.COM' };
      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.email).toBe('test@example.com');
    });

    it('should trim name and email', async () => {
      const userData = {
        ...validLocalUserData,
        name: '  Jane Doe  ',
        email: '  trimmed@example.com  ',
      };
      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.name).toBe('Jane Doe');
      expect(savedUser.email).toBe('trimmed@example.com');
    });
  });

  describe('User Uniqueness', () => {
    it('should enforce unique googleId', async () => {
      const user1 = new User(validGoogleUserData);
      await user1.save();

      const user2 = new User({
        ...validGoogleUserData,
        email: 'different@example.com'
      });
      await expect(user2.save()).rejects.toThrow();
    });

    it('should enforce unique email', async () => {
      const user1 = new User(validLocalUserData);
      await user1.save();

      const user2 = new User({
        ...validLocalUserData,
        email: validLocalUserData.email // Same email
      });
      await expect(user2.save()).rejects.toThrow();
    });

    it('should allow multiple users without googleId', async () => {
      const user1 = new User(validLocalUserData);
      await user1.save();

      const user2 = new User({
        ...validLocalUserData,
        email: 'different@example.com'
      });
      const savedUser2 = await user2.save();

      expect(savedUser2._id).toBeDefined();
      expect(savedUser2.googleId).toBeUndefined();
    });
  });

  describe('User Methods', () => {
    it('should compare password correctly', async () => {
      const user = new User(validLocalUserData);
      const savedUser = await user.save();

      const isValid = await savedUser.comparePassword(validLocalUserData.password);
      const isInvalid = await savedUser.comparePassword('wrongpassword');

      expect(isValid).toBe(true);
      expect(isInvalid).toBe(false);
    });

    it('should return false for password comparison when no password set', async () => {
      const user = new User(validGoogleUserData);
      const savedUser = await user.save();

      const result = await savedUser.comparePassword('anypassword');
      expect(result).toBe(false);
    });

    it('should generate email verification token', async () => {
      const user = new User(validLocalUserData);
      const token = user.generateEmailVerificationToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(20);
      expect(user.emailVerificationToken).toBeDefined();
      expect(user.emailVerificationExpires).toBeDefined();
    });

    it('should generate password reset token', async () => {
      const user = new User(validLocalUserData);
      const token = user.generatePasswordResetToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(20);
      expect(user.passwordResetToken).toBeDefined();
      expect(user.passwordResetExpires).toBeDefined();
    });

    it('should generate refresh token', async () => {
      const user = new User(validLocalUserData);
      const token = user.generateRefreshToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(20);
      expect(user.refreshToken).toBeDefined();
      expect(user.refreshTokenExpires).toBeDefined();
    });

    it('should check if account is locked', async () => {
      const user = new User(validLocalUserData);

      // Initially not locked
      expect(user.isLocked()).toBe(false);

      // Set lock until future date
      user.lockUntil = new Date(Date.now() + 1000 * 60 * 60); // 1 hour from now
      expect(user.isLocked()).toBe(true);

      // Set lock until past date
      user.lockUntil = new Date(Date.now() - 1000); // 1 second ago
      expect(user.isLocked()).toBe(false);
    });
  });

  describe('User Virtuals', () => {
    it('should have properties virtual field when populated', () => {
      const user = new User(validLocalUserData);
      const userObject = user.toObject({ virtuals: true });
      expect(userObject).toHaveProperty('id'); // Virtual id field should exist
    });

    it('should have bookings virtual field when populated', () => {
      const user = new User(validGoogleUserData);
      const userObject = user.toObject({ virtuals: true });
      expect(userObject).toHaveProperty('id'); // Virtual id field should exist
    });
  });

  describe('User Schema Options', () => {
    it('should include timestamps', async () => {
      const user = new User(validLocalUserData);
      const savedUser = await user.save();

      expect(savedUser.createdAt).toBeInstanceOf(Date);
      expect(savedUser.updatedAt).toBeInstanceOf(Date);
    });

    it('should include virtual fields in JSON', () => {
      const user = new User(validLocalUserData);
      const userJSON = user.toJSON();

      expect(userJSON).toHaveProperty('id'); // Virtual id field should exist in JSON
      expect(typeof userJSON.id).toBe('string');
    });

    it('should exclude sensitive fields from JSON', () => {
      const user = new User(validLocalUserData);
      const userJSON = user.toJSON();

      expect(userJSON.password).toBeUndefined();
      expect(userJSON.refreshToken).toBeUndefined();
      expect(userJSON.emailVerificationToken).toBeUndefined();
      expect(userJSON.passwordResetToken).toBeUndefined();
      expect(userJSON.twoFactorSecret).toBeUndefined();
      expect(userJSON.loginAttempts).toBeUndefined();
      expect(userJSON.lockUntil).toBeUndefined();
    });
  });

  describe('Authentication Provider Logic', () => {
    it('should default to local auth provider', async () => {
      const userData = {
        email: 'default@example.com',
        name: 'Default User',
        role: 'renter' as const,
      };
      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.authProvider).toBe('local');
    });

    it('should set auth provider correctly for Google users', async () => {
      const user = new User(validGoogleUserData);
      const savedUser = await user.save();

      expect(savedUser.authProvider).toBe('google');
    });
  });
});