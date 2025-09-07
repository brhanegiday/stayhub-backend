import { Request, Response } from 'express';
import {
  createProperty,
  getProperties,
  getProperty,
  updateProperty,
  deleteProperty,
  getHostProperties,
} from '../../src/controllers/propertyController';
import Property from '../../src/models/Property';
import Booking from '../../src/models/Booking';
import mongoose from 'mongoose';

// Mock the models
jest.mock('../../src/models/Property');
jest.mock('../../src/models/Booking');

const MockProperty = Property as jest.Mocked<typeof Property>;
const MockBooking = Booking as jest.Mocked<typeof Booking>;

describe('Property Controller', () => {
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

    jest.clearAllMocks();
  });

  describe('createProperty', () => {
    const mockHost = {
      _id: new mongoose.Types.ObjectId(),
      role: 'host',
      email: 'host@example.com',
      name: 'John Host',
    };

    const validPropertyData = {
      title: 'Beautiful Apartment',
      description: 'A lovely apartment',
      pricePerNight: 100,
      location: {
        address: '123 Main St',
        city: 'New York',
        country: 'USA',
      },
      images: ['https://example.com/image.jpg'],
      amenities: ['WiFi'],
      bedrooms: 2,
      bathrooms: 1,
      maxGuests: 4,
      propertyType: 'apartment',
    };

    beforeEach(() => {
      mockReq = {
        user: mockHost as any,
        body: validPropertyData,
      };
    });

    it('should create property successfully for host', async () => {
      const mockSavedProperty = {
        _id: new mongoose.Types.ObjectId(),
        ...validPropertyData,
        hostId: mockHost._id,
      };

      const mockPropertyInstance = {
        save: jest.fn().mockResolvedValue(mockSavedProperty),
        populate: jest.fn().mockResolvedValue(mockSavedProperty),
      };

      // Mock Property constructor
      (MockProperty as any).mockImplementation(() => mockPropertyInstance);

      await createProperty(mockReq as Request, mockRes as Response);

      expect(mockPropertyInstance.save).toHaveBeenCalled();
      expect(mockPropertyInstance.populate).toHaveBeenCalledWith('host', 'name avatar');
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Property created successfully',
        data: { property: mockPropertyInstance },
      });
    });

    it('should fail when user is not a host', async () => {
      mockReq.user = { ...mockHost, role: 'renter' } as any;

      await createProperty(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Only hosts can create properties',
      });
    });

    it('should fail when user is not authenticated', async () => {
      mockReq.user = undefined;

      await createProperty(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Only hosts can create properties',
      });
    });

    it('should handle database errors', async () => {
      const mockPropertyInstance = {
        save: jest.fn().mockRejectedValue(new Error('Database error')),
      };

      (MockProperty as any).mockImplementation(() => mockPropertyInstance);

      await createProperty(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to create property',
        error: 'Database error',
      });
    });
  });

  describe('getProperties', () => {
    beforeEach(() => {
      mockReq = {
        query: {},
      };
    });

    it('should get properties with default pagination', async () => {
      const mockProperties = [
        { _id: '1', title: 'Property 1' },
        { _id: '2', title: 'Property 2' },
      ];

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockProperties),
      };

      MockProperty.find.mockReturnValue(mockQuery as any);
      MockProperty.countDocuments.mockResolvedValue(25);

      await getProperties(mockReq as Request, mockRes as Response);

      expect(MockProperty.find).toHaveBeenCalledWith({ isActive: true });
      expect(mockQuery.populate).toHaveBeenCalledWith('host', 'name avatar isVerified');
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      expect(mockQuery.limit).toHaveBeenCalledWith(12);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          properties: mockProperties,
          pagination: {
            currentPage: 1,
            totalPages: 3,
            total: 25,
            hasNext: true,
            hasPrev: false,
          },
        },
      });
    });

    it('should apply search filters', async () => {
      mockReq.query = {
        page: '2',
        limit: '6',
        city: 'New York',
        country: 'USA',
        minPrice: '50',
        maxPrice: '200',
        propertyType: 'apartment',
        bedrooms: '2',
        maxGuests: '4',
        search: 'luxury apartment',
      };

      const expectedQuery = {
        isActive: true,
        'location.city': new RegExp('New York', 'i'),
        'location.country': new RegExp('USA', 'i'),
        pricePerNight: { $gte: 50, $lte: 200 },
        propertyType: 'apartment',
        bedrooms: { $gte: 2 },
        maxGuests: { $gte: 4 },
        $text: { $search: 'luxury apartment' },
      };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };

      MockProperty.find.mockReturnValue(mockQuery as any);
      MockProperty.countDocuments.mockResolvedValue(0);

      await getProperties(mockReq as Request, mockRes as Response);

      expect(MockProperty.find).toHaveBeenCalledWith(expectedQuery);
      expect(mockQuery.sort).toHaveBeenCalledWith({ score: { $meta: 'textScore' } });
      expect(mockQuery.skip).toHaveBeenCalledWith(6); // (page 2 - 1) * limit 6
      expect(mockQuery.limit).toHaveBeenCalledWith(6);
    });

    it('should handle database errors', async () => {
      MockProperty.find.mockImplementation(() => {
        throw new Error('Database error');
      });

      await getProperties(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch properties',
        error: 'Database error',
      });
    });
  });

  describe('getProperty', () => {
    beforeEach(() => {
      mockReq = {
        params: { id: 'property123' },
      };
    });

    it('should get property by id successfully', async () => {
      const mockProperty = {
        _id: 'property123',
        title: 'Test Property',
      };

      const mockBookings = [
        { checkInDate: new Date(), checkOutDate: new Date() },
      ];

      const mockQuery = {
        populate: jest.fn().mockResolvedValue(mockProperty),
      };

      MockProperty.findById.mockReturnValue(mockQuery as any);

      const mockBookingQuery = {
        select: jest.fn().mockResolvedValue(mockBookings),
      };

      MockBooking.find.mockReturnValue(mockBookingQuery as any);

      await getProperty(mockReq as Request, mockRes as Response);

      expect(MockProperty.findById).toHaveBeenCalledWith('property123');
      expect(mockQuery.populate).toHaveBeenCalledWith('host', 'name avatar bio phone isVerified createdAt');

      expect(MockBooking.find).toHaveBeenCalledWith({
        propertyId: 'property123',
        status: { $in: ['confirmed', 'pending'] },
        checkOutDate: { $gte: expect.any(Date) },
      });

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          property: mockProperty,
          bookings: mockBookings,
        },
      });
    });

    it('should return 404 when property not found', async () => {
      const mockQuery = {
        populate: jest.fn().mockResolvedValue(null),
      };

      MockProperty.findById.mockReturnValue(mockQuery as any);

      await getProperty(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Property not found',
      });
    });

    it('should handle database errors', async () => {
      MockProperty.findById.mockImplementation(() => {
        throw new Error('Database error');
      });

      await getProperty(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch property',
        error: 'Database error',
      });
    });
  });

  describe('updateProperty', () => {
    const mockHost = {
      _id: new mongoose.Types.ObjectId(),
      role: 'host',
    };

    beforeEach(() => {
      mockReq = {
        user: mockHost as any,
        params: { id: 'property123' },
        body: { title: 'Updated Property' },
      };
    });

    it('should update property successfully', async () => {
      const mockProperty = {
        _id: 'property123',
        hostId: mockHost._id,
      };

      const mockUpdatedProperty = {
        _id: 'property123',
        title: 'Updated Property',
      };

      MockProperty.findOne.mockResolvedValue(mockProperty as any);

      const mockQuery = {
        populate: jest.fn().mockResolvedValue(mockUpdatedProperty),
      };

      MockProperty.findByIdAndUpdate.mockReturnValue(mockQuery as any);

      await updateProperty(mockReq as Request, mockRes as Response);

      expect(MockProperty.findOne).toHaveBeenCalledWith({
        _id: 'property123',
        hostId: mockHost._id,
      });

      expect(MockProperty.findByIdAndUpdate).toHaveBeenCalledWith(
        'property123',
        { title: 'Updated Property' },
        { new: true, runValidators: true }
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Property updated successfully',
        data: { property: mockUpdatedProperty },
      });
    });

    it('should fail when user is not a host', async () => {
      mockReq.user = { ...mockHost, role: 'renter' } as any;

      await updateProperty(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Only hosts can update properties',
      });
    });

    it('should fail when property not found or not owned by host', async () => {
      MockProperty.findOne.mockResolvedValue(null);

      await updateProperty(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Property not found or you do not have permission to update it',
      });
    });
  });

  describe('deleteProperty', () => {
    const mockHost = {
      _id: new mongoose.Types.ObjectId(),
      role: 'host',
    };

    beforeEach(() => {
      mockReq = {
        user: mockHost as any,
        params: { id: 'property123' },
      };
    });

    it('should delete property successfully', async () => {
      const mockProperty = {
        _id: 'property123',
        hostId: mockHost._id,
      };

      MockProperty.findOne.mockResolvedValue(mockProperty as any);
      MockBooking.countDocuments.mockResolvedValue(0);
      MockProperty.findByIdAndDelete.mockResolvedValue(mockProperty as any);

      await deleteProperty(mockReq as Request, mockRes as Response);

      expect(MockBooking.countDocuments).toHaveBeenCalledWith({
        propertyId: 'property123',
        status: { $in: ['confirmed', 'pending'] },
        checkOutDate: { $gte: expect.any(Date) },
      });

      expect(MockProperty.findByIdAndDelete).toHaveBeenCalledWith('property123');

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Property deleted successfully',
      });
    });

    it('should fail when property has active bookings', async () => {
      const mockProperty = {
        _id: 'property123',
        hostId: mockHost._id,
      };

      MockProperty.findOne.mockResolvedValue(mockProperty as any);
      MockBooking.countDocuments.mockResolvedValue(2); // Has active bookings

      await deleteProperty(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot delete property with active bookings',
      });
    });

    it('should fail when user is not a host', async () => {
      mockReq.user = { ...mockHost, role: 'renter' } as any;

      await deleteProperty(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Only hosts can delete properties',
      });
    });
  });

  describe('getHostProperties', () => {
    const mockHost = {
      _id: new mongoose.Types.ObjectId(),
      role: 'host',
    };

    beforeEach(() => {
      mockReq = {
        user: mockHost as any,
      };
    });

    it('should get host properties successfully', async () => {
      const mockProperties = [
        { _id: '1', title: 'Property 1' },
        { _id: '2', title: 'Property 2' },
      ];

      const mockQuery = {
        sort: jest.fn().mockResolvedValue(mockProperties),
      };

      MockProperty.find.mockReturnValue(mockQuery as any);

      await getHostProperties(mockReq as Request, mockRes as Response);

      expect(MockProperty.find).toHaveBeenCalledWith({ hostId: mockHost._id });
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: { properties: mockProperties },
      });
    });

    it('should fail when user is not a host', async () => {
      mockReq.user = { ...mockHost, role: 'renter' } as any;

      await getHostProperties(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied',
      });
    });
  });
});