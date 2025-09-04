import express from "express";
import {
    createProperty,
    getProperties,
    getProperty,
    updateProperty,
    deleteProperty,
    getHostProperties,
} from "../controllers/propertyController";
import { authenticate, requireRole } from "../middleware/auth";
import { validateProperty } from "../middleware/validation";

const router = express.Router();

// @route   GET /api/properties
// @desc    Get all properties (with filters)
// @access  Public
router.get("/", getProperties);

// @route   GET /api/properties/host
// @desc    Get host's properties
// @access  Private (Host only)
router.get("/host", authenticate, requireRole(["host"]), getHostProperties);

// @route   GET /api/properties/:id
// @desc    Get single property
// @access  Public
router.get("/:id", getProperty);

// @route   POST /api/properties
// @desc    Create new property
// @access  Private (Host only)
router.post("/", authenticate, requireRole(["host"]), validateProperty, createProperty);

// @route   PUT /api/properties/:id
// @desc    Update property
// @access  Private (Host only)
router.put("/:id", authenticate, requireRole(["host"]), validateProperty, updateProperty);

// @route   DELETE /api/properties/:id
// @desc    Delete property
// @access  Private (Host only)
router.delete("/:id", authenticate, requireRole(["host"]), deleteProperty);

export default router;
