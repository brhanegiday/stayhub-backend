import { Request, Response, NextFunction } from "express";
import {
    uploadSingle,
    uploadMultiple,
    uploadFields,
    handleUploadError,
    validateFileType,
    generateFileName,
} from "../../src/middleware/upload";
import multer from "multer";

describe("Upload Middleware", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        next = jest.fn();

        req = {};
        res = {
            status: statusMock,
            json: jsonMock,
        };

        jest.clearAllMocks();
    });

    describe("uploadSingle", () => {
        it("should be defined", () => {
            expect(uploadSingle).toBeDefined();
            expect(typeof uploadSingle).toBe("function");
        });
    });

    describe("uploadMultiple", () => {
        it("should be defined", () => {
            expect(uploadMultiple).toBeDefined();
            expect(typeof uploadMultiple).toBe("function");
        });
    });

    describe("uploadFields", () => {
        it("should be defined", () => {
            expect(uploadFields).toBeDefined();
            expect(typeof uploadFields).toBe("function");
        });
    });

    describe("handleUploadError", () => {
        it("should handle LIMIT_FILE_SIZE error", () => {
            const error = new multer.MulterError("LIMIT_FILE_SIZE");

            handleUploadError(error, req as Request, res, next);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "File size too large. Maximum size is 10MB.",
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should handle LIMIT_FILE_COUNT error", () => {
            const error = new multer.MulterError("LIMIT_FILE_COUNT");

            handleUploadError(error, req as Request, res, next);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "Too many files. Maximum is 10 files.",
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should handle LIMIT_UNEXPECTED_FILE error", () => {
            const error = new multer.MulterError("LIMIT_UNEXPECTED_FILE");

            handleUploadError(error, req as Request, res, next);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "Unexpected field in file upload.",
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should handle file type error", () => {
            const error = new Error("Only image files are allowed!");

            handleUploadError(error, req as Request, res, next);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: "Only image files are allowed.",
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should pass other errors to next", () => {
            const error = new Error("Some other error");

            handleUploadError(error, req as Request, res, next);

            expect(next).toHaveBeenCalledWith(error);
            expect(statusMock).not.toHaveBeenCalled();
            expect(jsonMock).not.toHaveBeenCalled();
        });

        it("should handle non-multer errors", () => {
            const error = new Error("Random error");

            handleUploadError(error, req as Request, res, next);

            expect(next).toHaveBeenCalledWith(error);
        });
    });

    describe("validateFileType", () => {
        it("should return true for valid image types", () => {
            const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

            validTypes.forEach((mimetype) => {
                const file = { mimetype } as Express.Multer.File;
                expect(validateFileType(file)).toBe(true);
            });
        });

        it("should return false for invalid file types", () => {
            const invalidTypes = ["application/pdf", "text/plain", "video/mp4", "audio/mp3", "application/zip"];

            invalidTypes.forEach((mimetype) => {
                const file = { mimetype } as Express.Multer.File;
                expect(validateFileType(file)).toBe(false);
            });
        });

        it("should return false for files without mimetype", () => {
            const file = {} as Express.Multer.File;
            expect(validateFileType(file)).toBe(false);
        });
    });

    describe("generateFileName", () => {
        it("should generate a unique filename with timestamp and random string", () => {
            const originalName = "test.jpg";
            const fileName = generateFileName(originalName);

            expect(fileName).toMatch(/^\d+_[a-z0-9]+\.jpg$/);
            expect(fileName).toContain(".jpg");
        });

        it("should generate a unique filename with prefix", () => {
            const originalName = "test.png";
            const prefix = "avatar_";
            const fileName = generateFileName(originalName, prefix);

            expect(fileName).toMatch(/^avatar_\d+_[a-z0-9]+\.png$/);
            expect(fileName).toContain("avatar_");
            expect(fileName).toContain(".png");
        });

        it("should handle files without extension", () => {
            const originalName = "test";
            const fileName = generateFileName(originalName);

            expect(fileName).toMatch(/^\d+_[a-z0-9]+$/);
            expect(fileName).not.toContain(".");
        });

        it("should handle empty prefix", () => {
            const originalName = "test.gif";
            const fileName = generateFileName(originalName, "");

            expect(fileName).toMatch(/^\d+_[a-z0-9]+\.gif$/);
            expect(fileName).not.toContain("undefined");
        });

        it("should generate different filenames for multiple calls", () => {
            const originalName = "test.jpg";
            const fileName1 = generateFileName(originalName);

            // Small delay to ensure different timestamp
            const fileName2 = generateFileName(originalName);

            expect(fileName1).not.toBe(fileName2);
        });

        it("should preserve file extension case", () => {
            const originalName = "test.JPEG";
            const fileName = generateFileName(originalName);

            expect(fileName).toContain(".JPEG");
        });

        it("should handle complex file extensions", () => {
            const originalName = "test.image.backup.png";
            const fileName = generateFileName(originalName);

            expect(fileName).toContain(".png");
            expect(fileName).toMatch(/^\d+_[a-z0-9]+\.png$/);
        });
    });

    describe("multer configuration", () => {
        it("should export upload functions", () => {
            expect(uploadSingle).toBeDefined();
            expect(uploadMultiple).toBeDefined();
            expect(uploadFields).toBeDefined();
        });

        it("should be functions", () => {
            expect(typeof uploadSingle).toBe("function");
            expect(typeof uploadMultiple).toBe("function");
            expect(typeof uploadFields).toBe("function");
        });
    });
});
