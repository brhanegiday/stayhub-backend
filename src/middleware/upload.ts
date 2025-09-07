import { Request } from "express";
import multer from "multer";
import path from "path";
// Note: file-type is ESM-only, we'll use dynamic import
import logger from "../utils/logger";

// Configure multer for memory storage (good for cloud uploads)
const storage = multer.memoryStorage();

// Enhanced file filter function with security checks
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    try {
        // Check file type
        if (!file.mimetype.startsWith("image/")) {
            logger.warn(`Invalid file type attempted: ${file.mimetype} from IP: ${req.ip}`);
            return cb(new Error("Only image files are allowed!"));
        }

        // Check for suspicious file extensions
        const suspiciousExtensions = [".php", ".exe", ".js", ".html", ".htm", ".jsp", ".asp"];
        const fileExtension = path.extname(file.originalname).toLowerCase();

        if (suspiciousExtensions.includes(fileExtension)) {
            logger.warn(`Suspicious file extension attempted: ${fileExtension} from IP: ${req.ip}`);
            return cb(new Error("File type not allowed for security reasons!"));
        }

        // Check for double extensions (e.g., image.jpg.php)
        const filename = file.originalname.toLowerCase();
        if ((filename.match(/\./g) || []).length > 1) {
            const parts = filename.split(".");
            if (parts.length > 2) {
                logger.warn(`Double extension detected: ${filename} from IP: ${req.ip}`);
                return cb(new Error("Invalid filename format!"));
            }
        }

        // Validate allowed image types
        const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

        if (!allowedMimeTypes.includes(file.mimetype)) {
            logger.warn(`Unsupported image type: ${file.mimetype} from IP: ${req.ip}`);
            return cb(new Error("Unsupported image format!"));
        }

        cb(null, true);
    } catch (error) {
        logger.error(`File filter error: ${error} from IP: ${req.ip}`);
        cb(new Error("File validation failed!"));
    }
};

// Create multer instance with enhanced security
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit (reduced for better performance)
        files: 10, // Maximum 10 files
        fieldSize: 1 * 1024 * 1024, // 1MB field size limit
        fieldNameSize: 100, // Max field name size
        fields: 20, // Max number of fields
    },
});

// Export different upload configurations
export const uploadSingle = upload.single("image");
export const uploadMultiple = upload.array("images", 10);
export const uploadFields = upload.fields([
    { name: "images", maxCount: 10 },
    { name: "avatar", maxCount: 1 },
]);

// Error handling middleware for multer
export const handleUploadError = (err: any, req: Request, res: any, next: any) => {
    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
                success: false,
                message: "File size too large. Maximum size is 10MB.",
            });
        }
        if (err.code === "LIMIT_FILE_COUNT") {
            return res.status(400).json({
                success: false,
                message: "Too many files. Maximum is 10 files.",
            });
        }
        if (err.code === "LIMIT_UNEXPECTED_FILE") {
            return res.status(400).json({
                success: false,
                message: "Unexpected field in file upload.",
            });
        }
    }

    if (err.message === "Only image files are allowed!") {
        return res.status(400).json({
            success: false,
            message: "Only image files are allowed.",
        });
    }

    // Pass other errors to the global error handler
    next(err);
};

// Advanced file validation using magic numbers
export const validateFileContent = async (file: Express.Multer.File): Promise<{ isValid: boolean; error?: string }> => {
    try {
        if (!file.buffer || file.buffer.length === 0) {
            return { isValid: false, error: "Empty file buffer" };
        }

        // Check file size
        if (file.size > 5 * 1024 * 1024) {
            return { isValid: false, error: "File size exceeds 5MB limit" };
        }

        // Check minimum file size (avoid empty or corrupt files)
        if (file.size < 100) {
            return { isValid: false, error: "File too small, possibly corrupt" };
        }

        // Use file-type to check actual file type from buffer
        const { fileTypeFromBuffer } = await import("file-type");
        const detectedType = await fileTypeFromBuffer(file.buffer);

        if (!detectedType) {
            return { isValid: false, error: "Unable to determine file type" };
        }

        // Verify the detected type matches allowed types
        const allowedTypes = ["jpg", "jpeg", "png", "webp", "gif"];
        if (!allowedTypes.includes(detectedType.ext)) {
            return { isValid: false, error: `File type ${detectedType.ext} not allowed` };
        }

        // Check if MIME type matches the detected type
        const mimeTypeMap: { [key: string]: string[] } = {
            jpg: ["image/jpeg"],
            jpeg: ["image/jpeg"],
            png: ["image/png"],
            webp: ["image/webp"],
            gif: ["image/gif"],
        };

        const expectedMimes = mimeTypeMap[detectedType.ext];
        if (expectedMimes && !expectedMimes.includes(file.mimetype)) {
            return {
                isValid: false,
                error: `MIME type mismatch: expected ${expectedMimes.join("/")}, got ${file.mimetype}`,
            };
        }

        // Check for malicious patterns in file header
        const header = file.buffer.slice(0, 512).toString("hex");
        const maliciousPatterns = [
            "3c3f706870", // <?php
            "3c736372697074", // <script
            "3c68746d6c", // <html
        ];

        for (const pattern of maliciousPatterns) {
            if (header.includes(pattern)) {
                return { isValid: false, error: "Potentially malicious content detected" };
            }
        }

        return { isValid: true };
    } catch (error) {
        logger.error(`File content validation error: ${error}`);
        return { isValid: false, error: "File validation failed" };
    }
};

// Helper function to validate file types (legacy support)
export const validateFileType = (file: Express.Multer.File): boolean => {
    const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    return allowedMimes.includes(file.mimetype);
};

// Helper function to generate unique filename
export const generateFileName = (originalName: string, prefix: string = ""): string => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = path.extname(originalName);
    return `${prefix}${timestamp}_${randomString}${extension}`;
};

export default upload;
