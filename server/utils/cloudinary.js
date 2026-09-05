import { v2 as cloudinary } from "cloudinary"
import fs from "fs"


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})



const uploadOnCloudinary = async (LocalFilePath) => {
    try {
        if(!LocalFilePath) return null;

        const response = await cloudinary.uploader.upload(LocalFilePath, {
            resource_type: "auto"
        });

        if (fs.existsSync(LocalFilePath)) {
            fs.unlinkSync(LocalFilePath);
        }
        return response;
    } catch(error) {
        if (fs.existsSync(LocalFilePath)) {
            fs.unlinkSync(LocalFilePath);
        }
        console.error("Cloudinary Upload Error:", error);
        return null;
    }
}

const deleteFromCloudinaryByUrl = async (url) => {
    try {
        if (!url || typeof url !== "string") return { ok: false, reason: "no-url" };

        // Remove query parameters
        const cleanUrl = url.split("?")[0];

        // Cloudinary URL structure:
        // https://res.cloudinary.com/<cloud_name>/image/upload/(optional transformations)/(optional v123456/)(public_id).(ext)
        const match = cleanUrl.match(/\/upload\/(?:[^\/]+\/)?(?:v\d+\/)?(.+?)(\.[^.\/]+)?$/);
        const publicId = match?.[1];

        if (!publicId) {
            return { ok: false, reason: "no-public-id" };
        }

        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: "image",
            invalidate: true,
        });
        console.log(`[Cloudinary Permanent Delete] publicId: ${publicId}, result:`, result);
        return { ok: true, result };
    } catch (err) {
        console.error("Cloudinary delete error:", err);
        return { ok: false, reason: err?.message || "delete-failed" };
    }
}

export { uploadOnCloudinary, deleteFromCloudinaryByUrl }