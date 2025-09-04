import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadImage = async (
    filePath: string,
    folder: string = "stayhub"
): Promise<{ url: string; public_id: string }> => {
    try {
        const result = await cloudinary.uploader.upload(filePath, {
            folder,
            use_filename: true,
            unique_filename: true,
            overwrite: false,
            transformation: [
                { width: 1200, height: 800, crop: "limit" },
                { quality: "auto" },
                { format: "auto" },
            ],
        });

        return {
            url: result.secure_url,
            public_id: result.public_id,
        };
    } catch (error) {
        console.error("Cloudinary upload error:", error);
        throw new Error("Failed to upload image");
    }
};

export const deleteImage = async (publicId: string): Promise<void> => {
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.error("Cloudinary delete error:", error);
        throw new Error("Failed to delete image");
    }
};

export const uploadMultipleImages = async (
    filePaths: string[],
    folder: string = "stayhub"
): Promise<{ url: string; public_id: string }[]> => {
    try {
        const uploadPromises = filePaths.map((filePath) => uploadImage(filePath, folder));
        return await Promise.all(uploadPromises);
    } catch (error) {
        console.error("Multiple images upload error:", error);
        throw new Error("Failed to upload images");
    }
};

export default cloudinary;