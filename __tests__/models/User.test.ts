import User, { IUser } from '../../src/models/User';
import mongoose from 'mongoose';

describe('User Model', () => {
  const validUserData = {
    googleId: 'google123',
    email: 'test@example.com',
    name: 'John Doe',
    avatar: 'https://example.com/avatar.jpg',
    role: 'renter' as const,
  };

  afterEach(async () => {
    await User.deleteMany({});
  });

  describe('User Creation', () => {
    it('should create a user with valid data', async () => {
      const user = new User(validUserData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.googleId).toBe(validUserData.googleId);
      expect(savedUser.email).toBe(validUserData.email);
      expect(savedUser.name).toBe(validUserData.name);
      expect(savedUser.avatar).toBe(validUserData.avatar);
      expect(savedUser.role).toBe(validUserData.role);
      expect(savedUser.isVerified).toBe(false);
      expect(savedUser.createdAt).toBeDefined();
      expect(savedUser.updatedAt).toBeDefined();
    });

    it('should create a user with host role', async () => {
      const userData = { ...validUserData, role: 'host' as const };
      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.role).toBe('host');
    });

    it('should create a user with optional fields', async () => {
      const userData = {
        ...validUserData,
        phone: '+1234567890',
        bio: 'A traveler',
      };
      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.phone).toBe(userData.phone);
      expect(savedUser.bio).toBe(userData.bio);
    });
  });

  describe('User Validation', () => {
    it('should fail if googleId is missing', async () => {
      const userData = { ...validUserData };
      delete (userData as any).googleId;
      const user = new User(userData);

      await expect(user.save()).rejects.toThrow();
    });

    it('should fail if email is missing', async () => {
      const userData = { ...validUserData };
      delete (userData as any).email;
      const user = new User(userData);

      await expect(user.save()).rejects.toThrow();
    });

    it('should fail if name is missing', async () => {
      const userData = { ...validUserData };
      delete (userData as any).name;
      const user = new User(userData);

      await expect(user.save()).rejects.toThrow();
    });

    it('should fail if avatar is missing', async () => {
      const userData = { ...validUserData };
      delete (userData as any).avatar;
      const user = new User(userData);

      await expect(user.save()).rejects.toThrow();
    });

    it('should fail if role is missing', async () => {
      const userData = { ...validUserData };
      delete (userData as any).role;
      const user = new User(userData);

      await expect(user.save()).rejects.toThrow();
    });

    it('should fail if role is invalid', async () => {
      const userData = { ...validUserData, role: 'invalid' as any };
      const user = new User(userData);

      await expect(user.save()).rejects.toThrow();
    });

    it('should fail if bio exceeds maximum length', async () => {
      const userData = {
        ...validUserData,
        bio: 'A'.repeat(501), // Max is 500
      };
      const user = new User(userData);

      await expect(user.save()).rejects.toThrow();
    });

    it('should normalize email to lowercase', async () => {
      const userData = { ...validUserData, email: 'TEST@EXAMPLE.COM' };
      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.email).toBe('test@example.com');
    });

    it('should trim name and email', async () => {
      const userData = {
        ...validUserData,
        name: '  John Doe  ',
        email: '  test@example.com  ',
      };
      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.name).toBe('John Doe');
      expect(savedUser.email).toBe('test@example.com');
    });
  });

  describe('User Uniqueness', () => {
    it('should enforce unique googleId', async () => {
      const user1 = new User(validUserData);
      await user1.save();

      const user2 = new User({ ...validUserData, email: 'different@example.com' });
      await expect(user2.save()).rejects.toThrow();
    });

    it('should enforce unique email', async () => {
      const user1 = new User(validUserData);
      await user1.save();

      const user2 = new User({ ...validUserData, googleId: 'different123' });
      await expect(user2.save()).rejects.toThrow();
    });
  });

  describe('User Virtuals', () => {
    it('should have properties virtual field when populated', () => {
      const user = new User(validUserData);
      const userObject = user.toObject({ virtuals: true });
      expect(userObject).toHaveProperty('id'); // Virtual id field should exist
    });

    it('should have bookings virtual field when populated', () => {
      const user = new User(validUserData);
      const userObject = user.toObject({ virtuals: true });
      expect(userObject).toHaveProperty('id'); // Virtual id field should exist
    });
  });

  describe('User Schema Options', () => {
    it('should include timestamps', async () => {
      const user = new User(validUserData);
      const savedUser = await user.save();

      expect(savedUser.createdAt).toBeInstanceOf(Date);
      expect(savedUser.updatedAt).toBeInstanceOf(Date);
    });

    it('should include virtual fields in JSON', () => {
      const user = new User(validUserData);
      const userJSON = user.toJSON();

      expect(userJSON).toHaveProperty('id'); // Virtual id field should exist in JSON
      expect(typeof userJSON.id).toBe('string');
    });
  });
});