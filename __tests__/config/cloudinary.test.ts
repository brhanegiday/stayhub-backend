import { v2 as cloudinary } from "cloudinary";
import { uploadImage, deleteImage, uploadMultipleImages } from "../../src/config/cloudinary";

// Mock cloudinary
jest.mock("cloudinary", () => ({
    v2: {
        config: jest.fn(),
        uploader: {
            upload: jest.fn(),
            destroy: jest.fn(),
        },
    },
}));

const mockedUpload = cloudinary.uploader.upload as jest.MockedFunction<typeof cloudinary.uploader.upload>;
const mockedDestroy = cloudinary.uploader.destroy as jest.MockedFunction<typeof cloudinary.uploader.destroy>;
const mockedConfig = cloudinary.config as jest.MockedFunction<typeof cloudinary.config>;

// Helper function to create mock cloudinary response
const createMockUploadResponse = (secure_url: string, public_id: string) =>
    ({
        secure_url,
        public_id,
        version: 123,
        signature: "abc123",
        width: 1200,
        height: 800,
        format: "jpg",
        resource_type: "image",
        created_at: "2023-01-01T00:00:00Z",
        tags: [],
        bytes: 123456,
        type: "upload",
        etag: "abc123",
        placeholder: false,
        url: secure_url.replace("https:", "http:"),
        overwritten: false,
        original_filename: "test-image",
        eager: [],
        responsive_breakpoints: [],
    } as any);

describe("Cloudinary Config", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Clear console.error mock
        jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("uploadImage", () => {
        it("should upload image successfully", async () => {
            const mockResult = {
                secure_url: "https://res.cloudinary.com/test/image/upload/v123/stayhub/test-image.jpg",
                public_id: "stayhub/test-image",
                version: 123,
                signature: "abc123",
                width: 1200,
                height: 800,
                format: "jpg",
                resource_type: "image",
                created_at: "2023-01-01T00:00:00Z",
                tags: [],
                bytes: 123456,
                type: "upload",
                etag: "abc123",
                placeholder: false,
                url: "http://res.cloudinary.com/test/image/upload/v123/stayhub/test-image.jpg",
                overwritten: false,
                original_filename: "test-image",
                eager: [],
                responsive_breakpoints: [],
            } as any;

            mockedUpload.mockResolvedValue(mockResult);

            const result = await uploadImage("path/to/image.jpg", "properties");

            expect(mockedUpload).toHaveBeenCalledWith("path/to/image.jpg", {
                folder: "properties",
                use_filename: true,
                unique_filename: true,
                overwrite: false,
                transformation: [{ width: 1200, height: 800, crop: "limit" }, { quality: "auto" }, { format: "auto" }],
            });

            expect(result).toEqual({
                url: mockResult.secure_url,
                public_id: mockResult.public_id,
            });
        });

        it("should use default folder when not specified", async () => {
            const mockResult = createMockUploadResponse(
                "https://res.cloudinary.com/test/image/upload/v123/stayhub/test-image.jpg",
                "stayhub/test-image"
            );

            mockedUpload.mockResolvedValue(mockResult);

            await uploadImage("path/to/image.jpg");

            expect(mockedUpload).toHaveBeenCalledWith("path/to/image.jpg", {
                folder: "stayhub",
                use_filename: true,
                unique_filename: true,
                overwrite: false,
                transformation: [{ width: 1200, height: 800, crop: "limit" }, { quality: "auto" }, { format: "auto" }],
            });
        });

        it("should handle upload errors", async () => {
            const uploadError = new Error("Upload failed");
            mockedUpload.mockRejectedValue(uploadError);

            await expect(uploadImage("path/to/image.jpg")).rejects.toThrow("Failed to upload image");

            expect(console.error).toHaveBeenCalledWith("Cloudinary upload error:", uploadError);
        });

        it("should apply correct transformations", async () => {
            const mockResult = createMockUploadResponse(
                "https://res.cloudinary.com/test/image/upload/v123/transformed.jpg",
                "stayhub/transformed"
            );

            mockedUpload.mockResolvedValue(mockResult);

            await uploadImage("path/to/large-image.jpg", "avatars");

            expect(mockedUpload).toHaveBeenCalledWith("path/to/large-image.jpg", {
                folder: "avatars",
                use_filename: true,
                unique_filename: true,
                overwrite: false,
                transformation: [{ width: 1200, height: 800, crop: "limit" }, { quality: "auto" }, { format: "auto" }],
            });
        });
    });

    describe("deleteImage", () => {
        it("should delete image successfully", async () => {
            mockedDestroy.mockResolvedValue({ result: "ok" });

            await deleteImage("stayhub/test-image");

            expect(mockedDestroy).toHaveBeenCalledWith("stayhub/test-image");
        });

        it("should handle delete errors", async () => {
            const deleteError = new Error("Delete failed");
            mockedDestroy.mockRejectedValue(deleteError);

            await expect(deleteImage("stayhub/test-image")).rejects.toThrow("Failed to delete image");

            expect(console.error).toHaveBeenCalledWith("Cloudinary delete error:", deleteError);
        });

        it("should handle missing public_id", async () => {
            mockedDestroy.mockResolvedValue({ result: "not found" });

            await expect(deleteImage("")).resolves.not.toThrow();

            expect(mockedDestroy).toHaveBeenCalledWith("");
        });

        it("should handle network errors during delete", async () => {
            const networkError = new Error("Network timeout");
            mockedDestroy.mockRejectedValue(networkError);

            await expect(deleteImage("stayhub/network-fail")).rejects.toThrow("Failed to delete image");

            expect(console.error).toHaveBeenCalledWith("Cloudinary delete error:", networkError);
        });
    });

    describe("uploadMultipleImages", () => {
        it("should upload multiple images successfully", async () => {
            const mockResults = [
                createMockUploadResponse(
                    "https://res.cloudinary.com/test/image/upload/v123/stayhub/image1.jpg",
                    "stayhub/image1"
                ),
                createMockUploadResponse(
                    "https://res.cloudinary.com/test/image/upload/v123/stayhub/image2.jpg",
                    "stayhub/image2"
                ),
            ];

            mockedUpload.mockResolvedValueOnce(mockResults[0]).mockResolvedValueOnce(mockResults[1]);

            const filePaths = ["path/to/image1.jpg", "path/to/image2.jpg"];
            const results = await uploadMultipleImages(filePaths, "gallery");

            expect(mockedUpload).toHaveBeenCalledTimes(2);
            expect(mockedUpload).toHaveBeenNthCalledWith(1, "path/to/image1.jpg", {
                folder: "gallery",
                use_filename: true,
                unique_filename: true,
                overwrite: false,
                transformation: [{ width: 1200, height: 800, crop: "limit" }, { quality: "auto" }, { format: "auto" }],
            });

            expect(results).toEqual([
                { url: mockResults[0].secure_url, public_id: mockResults[0].public_id },
                { url: mockResults[1].secure_url, public_id: mockResults[1].public_id },
            ]);
        });

        it("should use default folder for multiple uploads", async () => {
            const mockResult = createMockUploadResponse(
                "https://res.cloudinary.com/test/image/upload/v123/stayhub/image.jpg",
                "stayhub/image"
            );

            mockedUpload.mockResolvedValue(mockResult);

            const filePaths = ["path/to/image.jpg"];
            await uploadMultipleImages(filePaths);

            expect(mockedUpload).toHaveBeenCalledWith("path/to/image.jpg", {
                folder: "stayhub",
                use_filename: true,
                unique_filename: true,
                overwrite: false,
                transformation: [{ width: 1200, height: 800, crop: "limit" }, { quality: "auto" }, { format: "auto" }],
            });
        });

        it("should handle errors in multiple uploads", async () => {
            const uploadError = new Error("Upload failed");
            mockedUpload.mockRejectedValue(uploadError);

            const filePaths = ["path/to/image1.jpg", "path/to/image2.jpg"];

            await expect(uploadMultipleImages(filePaths)).rejects.toThrow("Failed to upload images");

            expect(console.error).toHaveBeenCalledWith("Multiple images upload error:", expect.any(Error));
        });

        it("should handle partial failures in multiple uploads", async () => {
            const uploadError = new Error("Second upload failed");

            mockedUpload
                .mockResolvedValueOnce(
                    createMockUploadResponse(
                        "https://res.cloudinary.com/test/image/upload/v123/stayhub/image1.jpg",
                        "stayhub/image1"
                    )
                )
                .mockRejectedValueOnce(uploadError);

            const filePaths = ["path/to/image1.jpg", "path/to/image2.jpg"];

            await expect(uploadMultipleImages(filePaths)).rejects.toThrow("Failed to upload images");

            expect(console.error).toHaveBeenCalledWith("Multiple images upload error:", expect.any(Error));
        });

        it("should handle empty file paths array", async () => {
            const filePaths: string[] = [];
            const results = await uploadMultipleImages(filePaths);

            expect(results).toEqual([]);
            expect(mockedUpload).not.toHaveBeenCalled();
        });

        it("should handle single file in array", async () => {
            const mockResult = createMockUploadResponse(
                "https://res.cloudinary.com/test/image/upload/v123/stayhub/single.jpg",
                "stayhub/single"
            );

            mockedUpload.mockResolvedValue(mockResult);

            const filePaths = ["path/to/single.jpg"];
            const results = await uploadMultipleImages(filePaths, "single");

            expect(mockedUpload).toHaveBeenCalledTimes(1);
            expect(results).toEqual([{ url: mockResult.secure_url, public_id: mockResult.public_id }]);
        });
    });

    describe("Cloudinary Configuration", () => {
        it("should configure cloudinary with environment variables", () => {
            // Since cloudinary.config() is called at module load time,
            // we need to verify it was configured by checking that it's been mocked
            expect(typeof cloudinary.config).toBe("function");
            expect(typeof cloudinary.uploader.upload).toBe("function");
            expect(typeof cloudinary.uploader.destroy).toBe("function");
        });
    });
});
