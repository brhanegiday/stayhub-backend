import express from "express";
import {
    createProperty,
    deleteProperty,
    getHostProperties,
    getProperties,
    getProperty,
    updateProperty,
} from "../controllers/propertyController";
import { authenticate, requireRole } from "../middleware/auth";
import { validateProperty } from "../middleware/validation";
import { propertyLimiter } from "../middleware/rateLimiter";

const router = express.Router();

/**
 * @swagger
 * /api/properties:
 *   get:
 *     tags: [Properties]
 *     summary: Get all properties
 *     description: Get list of all properties with optional filters
 *     parameters:
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city
 *         example: "Miami Beach"
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price per night
 *         example: 100
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price per night
 *         example: 500
 *       - in: query
 *         name: guests
 *         schema:
 *           type: number
 *         description: Number of guests
 *         example: 4
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *         description: Number of properties per page
 *         example: 10
 *     responses:
 *       200:
 *         description: Properties retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 properties:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Property'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: number
 *                       example: 1
 *                     totalPages:
 *                       type: number
 *                       example: 5
 *                     totalProperties:
 *                       type: number
 *                       example: 47
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/", getProperties);

// @route   GET /api/properties/host
// @desc    Get host's properties
// @access  Private (Host only)
router.get("/host", authenticate, requireRole(["host"]), getHostProperties);

/**
 * @swagger
 * /api/properties/{id}:
 *   get:
 *     tags: [Properties]
 *     summary: Get single property
 *     description: Get detailed information about a specific property
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Property ID
 *         example: "64a1b2c3d4e5f6789012345"
 *     responses:
 *       200:
 *         description: Property retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 property:
 *                   $ref: '#/components/schemas/Property'
 *       404:
 *         description: Property not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:id", getProperty);

/**
 * @swagger
 * /api/properties:
 *   post:
 *     tags: [Properties]
 *     summary: Create new property
 *     description: Create a new property listing (Host only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - address
 *               - pricePerNight
 *               - capacity
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Beautiful Beach House"
 *               description:
 *                 type: string
 *                 example: "A stunning beachfront property with amazing ocean views"
 *               address:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                     example: "123 Ocean Drive"
 *                   city:
 *                     type: string
 *                     example: "Miami Beach"
 *                   state:
 *                     type: string
 *                     example: "Florida"
 *                   country:
 *                     type: string
 *                     example: "USA"
 *                   zipCode:
 *                     type: string
 *                     example: "33139"
 *               pricePerNight:
 *                 type: number
 *                 example: 299.99
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["https://cloudinary.com/image1.jpg"]
 *               amenities:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["WiFi", "Pool", "Beach Access"]
 *               capacity:
 *                 type: object
 *                 properties:
 *                   guests:
 *                     type: number
 *                     example: 6
 *                   bedrooms:
 *                     type: number
 *                     example: 3
 *                   bathrooms:
 *                     type: number
 *                     example: 2
 *     responses:
 *       201:
 *         description: Property created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Property created successfully"
 *                 property:
 *                   $ref: '#/components/schemas/Property'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Host role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many requests
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/", propertyLimiter, authenticate, requireRole(["host"]), validateProperty, createProperty);

// @route   PUT /api/properties/:id
// @desc    Update property
// @access  Private (Host only)
router.put("/:id", authenticate, requireRole(["host"]), validateProperty, updateProperty);

// @route   DELETE /api/properties/:id
// @desc    Delete property
// @access  Private (Host only)
router.delete("/:id", authenticate, requireRole(["host"]), deleteProperty);

export default router;
