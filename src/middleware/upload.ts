import { Request } from "express";
import multer from "multer";
import path from "path";

// Configure multer for memory storage (good for cloud uploads)
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (
    req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
) => {
    // Check file type
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        cb(new Error("Only image files are allowed!"));
    }
};

// Create multer instance
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 10, // Maximum 10 files
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
export const handleUploadError = (
    err: any,
    req: Request,
    res: any,
    next: any
) => {
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

// Helper function to validate file types
export const validateFileType = (file: Express.Multer.File): boolean => {
    const allowedMimes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif",
    ];
    return allowedMimes.includes(file.mimetype);
};

// Helper function to generate unique filename
export const generateFileName = (
    originalName: string,
    prefix: string = ""
): string => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = path.extname(originalName);
    return `${prefix}${timestamp}_${randomString}${extension}`;
};

export default upload;