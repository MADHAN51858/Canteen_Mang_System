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

const extractPublicId = (url) => {
    if (!url || typeof url !== "string") return null;
    if (!url.includes("res.cloudinary.com")) return null;

    const cleanUrl = url.split("?")[0].split("#")[0];
    const uploadIndex = cleanUrl.indexOf("/upload/");
    if (uploadIndex === -1) return null;

    const pathAfterUpload = cleanUrl.substring(uploadIndex + "/upload/".length);
    const segments = pathAfterUpload.split("/");
    const pathSegments = [];

    for (const segment of segments) {
        // Skip version tags like v1788627439
        if (/^v\d+$/.test(segment)) continue;
        // Skip transformation directives like w_400, c_scale, etc.
        if (/^(?:[a-z]{1,2}_|c_|w_|h_|q_|f_|b_|e_|fl_|g_)/.test(segment) || segment.includes(",")) continue;
        pathSegments.push(segment);
    }

    const fullPathWithExt = pathSegments.join("/");
    const lastDotIndex = fullPathWithExt.lastIndexOf(".");
    const publicId = lastDotIndex !== -1 ? fullPathWithExt.substring(0, lastDotIndex) : fullPathWithExt;

    return publicId || null;
};

const deleteFromCloudinaryByUrl = async (url) => {
    try {
        if (!url || typeof url !== "string") return { ok: false, reason: "no-url" };

        const publicId = extractPublicId(url);
        if (!publicId) {
            return { ok: false, reason: "not-cloudinary-url" };
        }

        console.log(`[Cloudinary Media Delete] Initiating deletion for publicId: ${publicId}`);

        // Try destroying as image first
        let result = await cloudinary.uploader.destroy(publicId, {
            resource_type: "image",
            invalidate: true,
        });

        // If not found as image, try raw resource type
        if (result?.result === "not found") {
            result = await cloudinary.uploader.destroy(publicId, {
                resource_type: "raw",
                invalidate: true,
            });
        }

        console.log(`[Cloudinary Media Delete Complete] publicId: ${publicId}, result:`, result);
        return { ok: true, result };
    } catch (err) {
        console.error(`[Cloudinary Media Delete Error] Failed for URL ${url}:`, err);
        return { ok: false, reason: err?.message || "delete-failed" };
    }
};

export { uploadOnCloudinary, deleteFromCloudinaryByUrl, extractPublicId };