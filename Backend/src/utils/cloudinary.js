import { v2 as cloudinary } from "cloudinary"
import fs from "fs"


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})



const uploadOnCloudinary = async (LocalFilePath) => {
    try {
        if(!LocalFilePath) return

        const response = await cloudinary.uploader.upload(LocalFilePath, {
            resource_type: "auto"
        })

        fs.unlinkSync(LocalFilePath)
        return response
    }catch(error){

        fs.unlinkSync(LocalFilePath)
        console.error("Cloudinary Upload Error:", error);
        return null
    }
}

const deleteFromCloudinaryByUrl = async (url) => {
    try {
        if (!url) return { ok: false, reason: "no-url" };

        // Extract public_id from Cloudinary URL
        // Matches .../upload/v12345/folder/name.ext -> captures folder/name
        const match = String(url).match(/\/upload\/(?:v\d+\/)?(.+?)(\.[^./]+)?$/);
        const publicId = match?.[1];

        if (!publicId) {
            return { ok: false, reason: "no-public-id" };
        }

        const result = await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
        return { ok: true, result };
    } catch (err) {
        console.error("Cloudinary delete error:", err);
        return { ok: false, reason: err?.message || "delete-failed" };
    }
}

export { uploadOnCloudinary, deleteFromCloudinaryByUrl }